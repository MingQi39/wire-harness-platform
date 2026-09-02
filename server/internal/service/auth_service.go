package service

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/hmq/wire-harness-platform/internal/config"
	"github.com/hmq/wire-harness-platform/internal/dto"
	"github.com/hmq/wire-harness-platform/internal/model"
	"github.com/hmq/wire-harness-platform/internal/pkg/apperror"
	"github.com/hmq/wire-harness-platform/internal/pkg/audit"
	"github.com/hmq/wire-harness-platform/internal/pkg/auth"
	"github.com/hmq/wire-harness-platform/internal/pkg/cache"
	"github.com/hmq/wire-harness-platform/internal/pkg/requestmeta"
	"github.com/hmq/wire-harness-platform/internal/pkg/response"
	"github.com/hmq/wire-harness-platform/internal/pkg/tenant"
	"github.com/hmq/wire-harness-platform/internal/pkg/tx"
	"github.com/hmq/wire-harness-platform/internal/repository"
)

type AuthService struct {
	userRepo     *repository.UserRepository
	roleRepo     *repository.RoleRepository
	tenantRepo   *repository.TenantRepository
	permRepo     *repository.PermissionRepository
	txMgr        *tx.TxManager
	audit        audit.Logger
	cfg          *config.Config
	logger       *zap.Logger
	refreshStore *auth.RefreshStore
	permCache    *cache.PermissionCache
}

func NewAuthService(
	userRepo *repository.UserRepository,
	roleRepo *repository.RoleRepository,
	tenantRepo *repository.TenantRepository,
	permRepo *repository.PermissionRepository,
	txMgr *tx.TxManager,
	audit audit.Logger,
	cfg *config.Config,
	logger *zap.Logger,
	refreshStore *auth.RefreshStore,
	permCache *cache.PermissionCache,
) *AuthService {
	return &AuthService{
		userRepo:     userRepo,
		roleRepo:     roleRepo,
		tenantRepo:   tenantRepo,
		permRepo:     permRepo,
		txMgr:        txMgr,
		audit:        audit,
		cfg:          cfg,
		logger:       logger,
		refreshStore: refreshStore,
		permCache:    permCache,
	}
}

// Login 返回 (响应体, refresh token 原文, error)，refresh token 由 handler 写入 HttpOnly Cookie
func (s *AuthService) Login(ctx context.Context, req dto.LoginReq) (*dto.LoginResp, string, error) {
	plainPwd, err := auth.DecryptPassword(req.Password)
	if err != nil {
		return nil, "", auth.BizErrorDecryptPasswordFailed()
	}

	username := strings.TrimSpace(req.Username)
	if username == "" {
		return nil, "", apperror.WrapBizError("请输入用户名")
	}
	tenantCode := strings.TrimSpace(req.TenantCode)

	var (
		user *model.User
		t    *model.Tenant
	)

	if tenantCode != "" {
		var err error
		t, err = s.tenantRepo.GetByCode(ctx, tenantCode)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, "", apperror.WrapBizError("租户不存在或已停用")
			}
			return nil, "", fmt.Errorf("get tenant by code: %w", err)
		}
		if t.Status != "active" {
			return nil, "", apperror.WrapBizError("租户不存在或已停用")
		}

		user, err = s.userRepo.GetByUsernameAndTenant(ctx, t.ID, username)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, "", apperror.ErrInvalidLoginCredentials
			}
			s.logger.Error("login query user failed",
				zap.String("trace_id", response.TraceIDFromCtx(ctx)),
				zap.String("username", username),
				zap.Error(err),
			)
			return nil, "", fmt.Errorf("get user by username: %w", err)
		}

		if !auth.CheckPassword(plainPwd, user.Password) {
			return nil, "", apperror.ErrInvalidLoginCredentials
		}
	} else {
		candidates, err := s.userRepo.ListByUsernameAcrossTenants(ctx, username)
		if err != nil {
			s.logger.Error("login list users by username failed",
				zap.String("trace_id", response.TraceIDFromCtx(ctx)),
				zap.String("username", username),
				zap.Error(err),
			)
			return nil, "", fmt.Errorf("list users by username: %w", err)
		}
		if len(candidates) == 0 {
			return nil, "", apperror.ErrInvalidLoginCredentials
		}
		for i := range candidates {
			if !auth.CheckPassword(plainPwd, candidates[i].Password) {
				continue
			}
			if user != nil {
				return nil, "", apperror.ErrLoginTenantAmbiguous
			}
			user = &candidates[i]
		}
		if user == nil {
			return nil, "", apperror.ErrInvalidLoginCredentials
		}
		t, err = s.tenantRepo.GetByID(ctx, user.TenantID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, "", apperror.WrapBizError("租户不存在或已停用")
			}
			return nil, "", fmt.Errorf("get tenant by id: %w", err)
		}
		if t.Status != "active" {
			return nil, "", apperror.WrapBizError("租户不存在或已停用")
		}
	}

	if user.Status != "active" {
		return nil, "", apperror.ErrAccountDisabled
	}

	resp, refreshToken, err := s.generateTokenPair(ctx, user, t.IndustryType)
	if err != nil {
		return nil, "", err
	}

	if s.audit != nil {
		meta := requestmeta.From(ctx)
		displayName := preferredUserDisplayName(user)
		_ = s.audit.Log(ctx, audit.Record{
			UserID:       user.ID,
			UserName:     displayName,
			Action:       "LOGIN",
			ResourceType: "user",
			ResourceID:   user.ID,
			IPAddr:       meta.IPAddr,
			UserAgent:    meta.UserAgent,
			APIMethod:    strings.ToUpper(strings.TrimSpace(meta.APIMethod)),
			APIPath:      strings.TrimSpace(meta.APIPath),
		})
	}

	return resp, refreshToken, nil
}

// generateTokenPair 签发 access + refresh token 并存储到 Redis
func (s *AuthService) generateTokenPair(ctx context.Context, user *model.User, industryType string) (*dto.LoginResp, string, error) {
	roles := make([]string, len(user.Roles))
	for i, r := range user.Roles {
		roles[i] = r.Name
	}

	tokenVer, err := s.refreshStore.GetTokenVersion(ctx, user.ID)
	if err != nil {
		s.logger.Error("login: get token version failed",
			zap.String("trace_id", response.TraceIDFromCtx(ctx)),
			zap.Int64("user_id", user.ID),
			zap.Error(err),
		)
		return nil, "", apperror.WrapError(apperror.ErrServiceUnavail, "会话服务不可用，请确认 Redis 已启动并可连接")
	}

	accessToken, err := auth.GenerateAccessToken(
		user.TenantID, user.ID, preferredUserDisplayName(user), roles, tokenVer,
		s.cfg.JWT.Secret, s.cfg.JWT.AccessTTL,
	)
	if err != nil {
		return nil, "", fmt.Errorf("generate access token: %w", err)
	}

	refreshToken, jti, err := auth.GenerateRefreshToken(
		user.ID, tokenVer, s.cfg.JWT.RefreshSecret, s.cfg.JWT.RefreshTTL,
	)
	if err != nil {
		return nil, "", fmt.Errorf("generate refresh token: %w", err)
	}

	if err := s.refreshStore.Store(ctx, jti, user.ID, s.cfg.JWT.RefreshTTL); err != nil {
		s.logger.Error("login: store refresh token failed",
			zap.String("trace_id", response.TraceIDFromCtx(ctx)),
			zap.Int64("user_id", user.ID),
			zap.Error(err),
		)
		return nil, "", apperror.WrapError(apperror.ErrServiceUnavail, "会话服务不可用，请确认 Redis 已启动并可连接")
	}

	perms, err := effectivePermissionCodes(ctx, user, s.permRepo)
	if err != nil {
		return nil, "", fmt.Errorf("get effective permissions: %w", err)
	}

	if s.permCache != nil {
		if err := s.permCache.InvalidateUser(ctx, user.ID); err != nil {
			s.logger.Warn("failed to invalidate permission cache on token generation", zap.Int64("user_id", user.ID), zap.Error(err))
		}
	}

	return &dto.LoginResp{
		AccessToken:  accessToken,
		Permissions:  perms,
		UserName:     preferredUserDisplayName(user),
		UserID:       user.ID,
		TenantID:     user.TenantID,
		IndustryType: industryType,
	}, refreshToken, nil
}

// RefreshToken 返回 (响应体, 新 refresh token 原文, error)
func (s *AuthService) RefreshToken(ctx context.Context, refreshTokenStr string) (*dto.LoginResp, string, error) {
	claims, err := auth.ParseRefreshToken(refreshTokenStr, s.cfg.JWT.RefreshSecret)
	if err != nil {
		return nil, "", apperror.WrapError(apperror.ErrInvalidToken, "Refresh token 已失效")
	}

	if claims.ID == "" {
		return nil, "", apperror.ErrInvalidToken
	}
	var userID int64
	if _, err := fmt.Sscanf(claims.Subject, "%d", &userID); err != nil {
		return nil, "", apperror.ErrInvalidToken
	}

	// 原子消费：GETDEL 保证并发刷新只有一个成功
	_, consumed, err := s.refreshStore.ConsumeIfExists(ctx, claims.ID)
	if err != nil {
		return nil, "", fmt.Errorf("consume refresh token: %w", err)
	}
	if !consumed {
		return nil, "", apperror.WrapError(apperror.ErrInvalidToken, "Refresh token 已被吊销")
	}

	// 后续步骤失败时回写 token，避免用户被迫重新登录
	restoreToken := func() {
		_ = s.refreshStore.Store(ctx, claims.ID, userID, s.cfg.JWT.RefreshTTL)
	}

	// 校验 token 版本：密码修改后旧 token 全部失效
	currentVer, err := s.refreshStore.GetTokenVersion(ctx, userID)
	if err != nil {
		restoreToken()
		return nil, "", fmt.Errorf("get token version: %w", err)
	}
	if claims.TokenVersion < currentVer {
		return nil, "", apperror.WrapError(apperror.ErrInvalidToken, "Refresh token 已被吊销")
	}

	user, err := s.userRepo.GetByIDGlobal(ctx, userID)
	if err != nil {
		restoreToken()
		return nil, "", apperror.WrapError(apperror.ErrUnauthorized, "用户不存在")
	}

	if user.Status != "active" {
		return nil, "", apperror.WrapError(apperror.ErrForbidden, "账号已被禁用")
	}

	ctx = tenant.CtxWithTenantID(ctx, user.TenantID)
	t, err := s.tenantRepo.GetByID(ctx, user.TenantID)
	if err != nil {
		restoreToken()
		return nil, "", fmt.Errorf("get tenant for refresh: %w", err)
	}

	resp, newRefresh, genErr := s.generateTokenPair(ctx, user, t.IndustryType)
	if genErr != nil {
		restoreToken()
		return nil, "", genErr
	}
	return resp, newRefresh, nil
}

func (s *AuthService) VerifyPassword(ctx context.Context, req dto.VerifyPasswordReq) error {
	plainPwd, err := auth.DecryptPassword(req.Password)
	if err != nil {
		return auth.BizErrorDecryptPasswordFailed()
	}

	userID := auth.CurrentUserID(ctx)
	user, err := s.userRepo.GetByIDFromPrimary(ctx, userID)
	if err != nil {
		return fmt.Errorf("get user: %w", err)
	}
	if !auth.CheckPassword(plainPwd, user.Password) {
		return apperror.WrapBizError("当前密码不正确")
	}
	return nil
}

func (s *AuthService) ChangePassword(ctx context.Context, req dto.ChangePasswordReq) error {
	oldPlain, err := auth.DecryptPassword(req.OldPassword)
	if err != nil {
		return auth.BizErrorDecryptPasswordFailed()
	}
	newPlain, err := auth.DecryptPassword(req.NewPassword)
	if err != nil {
		return auth.BizErrorDecryptPasswordFailed()
	}

	userID := auth.CurrentUserID(ctx)
	user, err := s.userRepo.GetByIDFromPrimary(ctx, userID)
	if err != nil {
		return fmt.Errorf("get user: %w", err)
	}

	if !auth.CheckPassword(oldPlain, user.Password) {
		return apperror.WrapBizError("旧密码不正确")
	}

	if err := auth.ValidatePassword(newPlain); err != nil {
		return apperror.WrapBizError(err.Error())
	}

	hashed, err := auth.HashPassword(newPlain)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}
	user.Password = hashed

	if err := s.txMgr.WithTx(ctx, func(ctx context.Context) error {
		if err := s.userRepo.Update(ctx, user); err != nil {
			return fmt.Errorf("update password: %w", err)
		}
		return s.audit.Log(ctx, audit.NewRecord(ctx, "CHANGE_PASSWORD", "user", userID))
	}); err != nil {
		return err
	}

	if err := s.refreshStore.RevokeAllForUser(ctx, userID); err != nil {
		return fmt.Errorf("revoke sessions after change password for user %d: %w", userID, err)
	}
	if s.permCache != nil {
		if err := s.permCache.InvalidateUser(ctx, userID); err != nil {
			return fmt.Errorf("invalidate permission cache after change password for user %d: %w", userID, err)
		}
	}
	return nil
}

func (s *AuthService) GetProfile(ctx context.Context) (*dto.ProfileResp, error) {
	userID := auth.CurrentUserID(ctx)
	user, err := s.userRepo.GetByIDFromPrimary(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}

	roles := make([]string, len(user.Roles))
	for i, r := range user.Roles {
		roles[i] = normalizedRoleDisplayName(r.Name, r.DisplayName)
	}

	return &dto.ProfileResp{
		ID:              user.ID,
		Username:        user.Username,
		Name:            user.Name,
		Email:           user.Email,
		SignatureFileID: user.SignatureFileID,
		Roles:           roles,
		UpdatedAt:       user.UpdatedAt,
	}, nil
}

func (s *AuthService) UpdateProfile(ctx context.Context, req dto.UpdateProfileReq) error {
	if req.UpdatedAt == nil {
		return apperror.WrapError(apperror.ErrBadRequest, "updated_at 不能为空")
	}
	userID := auth.CurrentUserID(ctx)
	return s.txMgr.WithTx(ctx, func(ctx context.Context) error {
		user, err := s.userRepo.GetByIDFromPrimary(ctx, userID)
		if err != nil {
			return fmt.Errorf("get user: %w", err)
		}
		before := *user
		if req.Name != nil {
			user.Name = *req.Name
		}
		if req.Email != nil {
			user.Email = *req.Email
		}
		user.UpdatedAt = *req.UpdatedAt
		if err := s.userRepo.Update(ctx, user); err != nil {
			return fmt.Errorf("update profile: %w", err)
		}
		return s.audit.Log(ctx, audit.NewRecord(ctx, "UPDATE_PROFILE", "user", userID).WithBefore(before).WithAfter(user))
	})
}

func (s *AuthService) Register(ctx context.Context, req dto.RegisterReq) error {
	plainPwd, err := auth.DecryptPassword(req.Password)
	if err != nil {
		return auth.BizErrorDecryptPasswordFailed()
	}

	if err := auth.ValidatePassword(plainPwd); err != nil {
		return apperror.WrapBizError(err.Error())
	}

	t, err := s.tenantRepo.GetByCode(ctx, req.TenantCode)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return apperror.WrapBizError("注册失败，请检查输入信息")
		}
		return fmt.Errorf("get tenant by code: %w", err)
	}
	if t.Status != "active" {
		return apperror.WrapBizError("注册失败，请检查输入信息")
	}

	ctx = tenant.CtxWithTenantID(ctx, t.ID)

	_, err = s.userRepo.GetByUsername(ctx, req.Username)
	if err == nil {
		return apperror.WrapBizError("注册失败，请检查输入信息")
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("check username existence: %w", err)
	}

	hashed, err := auth.HashPassword(plainPwd)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}

	user := &model.User{
		TenantID: t.ID,
		Username: req.Username,
		Password: hashed,
		Name:     req.Name,
		Email:    req.Email,
		Status:   "active",
	}

	return s.txMgr.WithTx(ctx, func(ctx context.Context) error {
		if err := s.userRepo.Create(ctx, user); err != nil {
			return fmt.Errorf("create user: %w", err)
		}
		defaultRole, err := s.roleRepo.GetByName(ctx, "user")
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return apperror.WrapBizError("系统默认角色 user 未配置，请联系管理员")
			}
			return fmt.Errorf("get default role: %w", err)
		}
		if err := s.userRepo.ReplaceRoles(ctx, user.ID, []int64{defaultRole.ID}); err != nil {
			return fmt.Errorf("assign default role: %w", err)
		}
		return s.audit.Log(ctx, audit.Record{
			UserID:       user.ID,
			UserName:     user.Username,
			Action:       "CREATE",
			ResourceType: "user",
			ResourceID:   user.ID,
			After:        user,
		})
	})
}

func (s *AuthService) Logout(ctx context.Context, refreshTokenStr string) error {
	if refreshTokenStr == "" {
		return nil
	}
	claims, err := auth.ParseRefreshToken(refreshTokenStr, s.cfg.JWT.RefreshSecret)
	if err != nil || claims.ID == "" {
		return nil
	}
	if revokeErr := s.refreshStore.Revoke(ctx, claims.ID); revokeErr != nil {
		return revokeErr
	}
	if s.audit != nil {
		meta := requestmeta.From(ctx)
		var userID int64
		if claims.Subject != "" {
			if parsed, parseErr := strconv.ParseInt(claims.Subject, 10, 64); parseErr == nil {
				userID = parsed
			}
		}
		_ = s.audit.Log(ctx, audit.Record{
			UserID:       userID,
			Action:       "LOGOUT",
			ResourceType: "user",
			ResourceID:   userID,
			IPAddr:       meta.IPAddr,
			UserAgent:    meta.UserAgent,
			APIMethod:    strings.ToUpper(strings.TrimSpace(meta.APIMethod)),
			APIPath:      strings.TrimSpace(meta.APIPath),
		})
	}
	return nil
}

// RevokeAllUserTokens 吊销用户的所有 refresh token（修改密码、禁用账号时调用）
func (s *AuthService) RevokeAllUserTokens(ctx context.Context, userID int64) error {
	return s.refreshStore.RevokeAllForUser(ctx, userID)
}
