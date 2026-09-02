package middleware

import (
	"errors"
	"strings"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/hmq/wire-harness-platform/internal/pkg/apperror"
	"github.com/hmq/wire-harness-platform/internal/pkg/auth"
	"github.com/hmq/wire-harness-platform/internal/pkg/cache"
	"github.com/hmq/wire-harness-platform/internal/pkg/logx"
	"github.com/hmq/wire-harness-platform/internal/pkg/permutil"
	"github.com/hmq/wire-harness-platform/internal/pkg/requestmeta"
	"github.com/hmq/wire-harness-platform/internal/pkg/response"
	"github.com/hmq/wire-harness-platform/internal/repository"
)

func AuthMiddleware(jwtSecret string, rs *auth.RefreshStore, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			response.Fail(c, apperror.ErrUnauthorized)
			c.Abort()
			return
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			response.Fail(c, apperror.ErrInvalidToken)
			c.Abort()
			return
		}

		claims, err := auth.ParseAccessToken(parts[1], jwtSecret)
		if err != nil {
			response.Fail(c, apperror.ErrInvalidToken)
			c.Abort()
			return
		}

		if err := auth.ValidateAccessTokenSession(c.Request.Context(), claims, rs); err != nil {
			if errors.Is(err, auth.ErrAccessTokenRevoked) {
				response.Fail(c, apperror.ErrInvalidToken)
			} else {
				if logger != nil {
					logx.LogError(logger, c.Request.Context(), "校验 access 会话版本失败", err)
				}
				response.Fail(c, apperror.ErrServiceUnavail)
			}
			c.Abort()
			return
		}

		c.Set("tenant_id", claims.TenantID)
		c.Set("user_id", claims.UserID)
		c.Set("user_name", claims.UserName)
		c.Set("roles", claims.Roles)

		ctx := auth.CtxWithUser(c.Request.Context(), claims.UserID, claims.UserName)
		ctx = auth.CtxWithJWTRoles(ctx, claims.Roles)
		c.Request = c.Request.WithContext(ctx)

		c.Next()
	}
}

// PermissionChecker 封装权限校验所需的依赖，避免在每个路由都传递缓存和仓储
type PermissionChecker struct {
	permCache *cache.PermissionCache
	userRepo  *repository.UserRepository
	logger    *zap.Logger
}

func NewPermissionChecker(pc *cache.PermissionCache, ur *repository.UserRepository, logger *zap.Logger) *PermissionChecker {
	return &PermissionChecker{permCache: pc, userRepo: ur, logger: logger}
}

func (pc *PermissionChecker) attachPermissionMeta(c *gin.Context, permCode string) {
	ctx := requestmeta.WithPermissionCode(c.Request.Context(), permCode)
	c.Request = c.Request.WithContext(ctx)
}

func (pc *PermissionChecker) RequirePermission(permCode string) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, exists := c.Get("user_id")
		if !exists {
			response.Fail(c, apperror.ErrUnauthorized)
			c.Abort()
			return
		}
		userID, ok := uid.(int64)
		if !ok {
			response.Fail(c, apperror.ErrUnauthorized)
			c.Abort()
			return
		}
		if permutil.IsDeveloperPermissionBypass(userID, permCode) {
			pc.attachPermissionMeta(c, permCode)
			c.Next()
			return
		}

		ctx := c.Request.Context()
		ok, err := permutil.UserHasCode(ctx, userID, permCode, pc.permCache, pc.userRepo)
		if err != nil {
			logx.LogError(pc.logger, ctx, "加载用户权限失败", err, zap.Int64("user_id", userID))
			response.Fail(c, apperror.ErrInternal)
			c.Abort()
			return
		}
		if !ok {
			response.Fail(c, apperror.ErrForbidden)
			c.Abort()
			return
		}
		pc.attachPermissionMeta(c, permCode)
		c.Next()
	}
}

func (pc *PermissionChecker) RequireAnyPermission(permCodes ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, exists := c.Get("user_id")
		if !exists {
			response.Fail(c, apperror.ErrUnauthorized)
			c.Abort()
			return
		}
		userID, ok := uid.(int64)
		if !ok {
			response.Fail(c, apperror.ErrUnauthorized)
			c.Abort()
			return
		}

		ctx := c.Request.Context()
		for _, permCode := range permCodes {
			if permutil.IsDeveloperPermissionBypass(userID, permCode) {
				pc.attachPermissionMeta(c, permCode)
				c.Next()
				return
			}
			has, err := permutil.UserHasCode(ctx, userID, permCode, pc.permCache, pc.userRepo)
			if err != nil {
				pc.logger.Error("加载用户权限失败", zap.Int64("user_id", userID), zap.Error(err))
				response.Fail(c, apperror.ErrInternal)
				c.Abort()
				return
			}
			if has {
				pc.attachPermissionMeta(c, permCode)
				c.Next()
				return
			}
		}
		response.Fail(c, apperror.ErrForbidden)
		c.Abort()
	}
}
