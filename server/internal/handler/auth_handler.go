package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/hmq/wire-harness-platform/internal/config"
	"github.com/hmq/wire-harness-platform/internal/dto"
	"github.com/hmq/wire-harness-platform/internal/pkg/apperror"
	"github.com/hmq/wire-harness-platform/internal/pkg/auth"
	"github.com/hmq/wire-harness-platform/internal/pkg/ginx"
	"github.com/hmq/wire-harness-platform/internal/pkg/response"
	"github.com/hmq/wire-harness-platform/internal/service"
)

const refreshCookieName = "lims_refresh_token"
const refreshCookiePath = "/api/v1/auth"
const accessCookieName = "lims_access_token"

type AuthHandler struct {
	svc *service.AuthService
	cfg *config.Config
}

func NewAuthHandler(svc *service.AuthService, cfg *config.Config) *AuthHandler {
	return &AuthHandler{svc: svc, cfg: cfg}
}

// isSecureCookie keeps cookies compatible with HTTP-only private deployments
// while retaining the Secure attribute whenever the original client request was
// HTTPS. X-Forwarded-Proto is populated by the bundled reverse proxies after
// TLS termination.
func isSecureCookie(c *gin.Context) bool {
	if c.Request.TLS != nil {
		return true
	}
	forwardedProto := strings.TrimSpace(strings.Split(c.GetHeader("X-Forwarded-Proto"), ",")[0])
	return strings.EqualFold(forwardedProto, "https")
}

// wantsTokenInBody 判断客户端是否需要在响应体中返回 refresh token（Electron 等无法可靠携带 Cookie 的客户端）
func wantsTokenInBody(c *gin.Context) bool {
	return c.GetHeader("X-Token-In-Body") == "true"
}

type passwordEncryptKeyFingerprintResp struct {
	Fingerprint string `json:"fingerprint"`
}

// PasswordEncryptKeyFingerprint godoc
//
//	@Summary		密码传输加密密钥指纹
//	@Description	返回服务端当前 PASSWORD_ENCRYPT_KEY 对应的 SHA256 指纹，供前端比对是否与 VITE_PASSWORD_ENCRYPT_KEY 一致
//	@Tags			认证
//	@Produce		json
//	@Success		200	{object}	response.Response{data=passwordEncryptKeyFingerprintResp}
//	@Router			/auth/password-encrypt-key-fingerprint [get]
func (h *AuthHandler) PasswordEncryptKeyFingerprint(c *gin.Context) {
	response.Success(c, passwordEncryptKeyFingerprintResp{
		Fingerprint: auth.EncryptKeyFingerprint(),
	})
}

func (h *AuthHandler) setRefreshCookie(c *gin.Context, token string, maxAge int) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(refreshCookieName, token, maxAge, refreshCookiePath, "", isSecureCookie(c), true)
}

func (h *AuthHandler) setAccessCookie(c *gin.Context, token string, maxAge int) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(accessCookieName, token, maxAge, "/", "", isSecureCookie(c), true)
}

// Login godoc
//
//	@Summary		用户登录
//	@Description	使用用户名+密码登录；可选 tenant_code。不传 tenant_code 时按用户名自动匹配所属企业；多企业同登录名且密码均匹配时需传 tenant_code 消歧。
//	@Tags			认证
//	@Accept			json
//	@Produce		json
//	@Param			request	body		dto.LoginReq	true	"登录请求"
//	@Success		200		{object}	response.Response{data=dto.LoginResp}
//	@Failure		400		{object}	response.Response
//	@Failure		401		{object}	response.Response
//	@Failure		403		{object}	response.Response
//	@Router			/auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	req, ok := ginx.BindJSON[dto.LoginReq](c)
	if !ok {
		return
	}

	resp, refreshToken, err := h.svc.Login(c.Request.Context(), *req)
	if err != nil {
		response.Fail(c, err)
		return
	}

	h.setRefreshCookie(c, refreshToken, int(h.cfg.JWT.RefreshTTL.Seconds()))
	h.setAccessCookie(c, resp.AccessToken, int(h.cfg.JWT.AccessTTL.Seconds()))
	if wantsTokenInBody(c) {
		resp.RefreshToken = refreshToken
	}
	response.Success(c, resp)
}

// Register godoc
//
//	@Summary		用户注册
//	@Description	注册新用户
//	@Tags			认证
//	@Accept			json
//	@Produce		json
//	@Param			request	body		dto.RegisterReq	true	"注册请求"
//	@Success		200		{object}	response.Response
//	@Failure		400		{object}	response.Response
//	@Router			/auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	if !h.cfg.Auth.RegisterEnabled {
		response.Fail(c, apperror.WrapError(apperror.ErrForbidden, "注册功能已关闭，请联系管理员"))
		return
	}

	req, ok := ginx.BindJSON[dto.RegisterReq](c)
	if !ok {
		return
	}

	if err := h.svc.Register(c.Request.Context(), *req); err != nil {
		response.Fail(c, err)
		return
	}
	response.Success(c, nil)
}

// RefreshToken godoc
//
//	@Summary		刷新 Token
//	@Description	使用 HttpOnly Cookie 中的 Refresh Token 获取新的 Access Token
//	@Tags			认证
//	@Produce		json
//	@Success		200	{object}	response.Response{data=dto.LoginResp}
//	@Failure		401	{object}	response.Response
//	@Router			/auth/refresh [post]
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	oldRefresh, _ := c.Cookie(refreshCookieName)
	if oldRefresh == "" {
		var body dto.RefreshReq
		if err := c.ShouldBindJSON(&body); err == nil && body.RefreshToken != "" {
			oldRefresh = body.RefreshToken
		}
	}
	if oldRefresh == "" {
		response.Fail(c, apperror.WrapError(apperror.ErrUnauthorized, "缺少 Refresh Token"))
		return
	}

	resp, newRefresh, err := h.svc.RefreshToken(c.Request.Context(), oldRefresh)
	if err != nil {
		h.setRefreshCookie(c, "", -1)
		h.setAccessCookie(c, "", -1)
		response.Fail(c, err)
		return
	}

	h.setRefreshCookie(c, newRefresh, int(h.cfg.JWT.RefreshTTL.Seconds()))
	h.setAccessCookie(c, resp.AccessToken, int(h.cfg.JWT.AccessTTL.Seconds()))
	if wantsTokenInBody(c) {
		resp.RefreshToken = newRefresh
	}
	response.Success(c, resp)
}

// Logout godoc
//
//	@Summary		用户登出
//	@Description	吊销 Refresh Token 并清除 Cookie
//	@Tags			认证
//	@Produce		json
//	@Success		200	{object}	response.Response
//	@Router			/auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	refreshToken, _ := c.Cookie(refreshCookieName)
	if err := h.svc.Logout(c.Request.Context(), refreshToken); err != nil {
		_ = c.Error(err)
	}
	h.setRefreshCookie(c, "", -1)
	h.setAccessCookie(c, "", -1)
	response.Success(c, nil)
}

// VerifyPassword godoc
//
//	@Summary		校验当前密码
//	@Description	校验当前用户密码是否正确，用于修改密码前的前置验证
//	@Tags			个人中心
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			request	body		dto.VerifyPasswordReq	true	"验证密码请求"
//	@Success		200		{object}	response.Response
//	@Failure		400		{object}	response.Response
//	@Router			/me/verify-password [post]
func (h *AuthHandler) VerifyPassword(c *gin.Context) {
	req, ok := ginx.BindJSON[dto.VerifyPasswordReq](c)
	if !ok {
		return
	}

	if err := h.svc.VerifyPassword(c.Request.Context(), *req); err != nil {
		response.Fail(c, err)
		return
	}
	response.Success(c, nil)
}

// ChangePassword godoc
//
//	@Summary		修改密码
//	@Description	修改当前用户密码
//	@Tags			个人中心
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			request	body		dto.ChangePasswordReq	true	"修改密码请求"
//	@Success		200		{object}	response.Response
//	@Failure		400		{object}	response.Response
//	@Router			/me/password [put]
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	req, ok := ginx.BindJSON[dto.ChangePasswordReq](c)
	if !ok {
		return
	}

	if err := h.svc.ChangePassword(c.Request.Context(), *req); err != nil {
		response.Fail(c, err)
		return
	}
	response.Success(c, nil)
}

// GetProfile godoc
//
//	@Summary		获取个人信息
//	@Description	获取当前登录用户的个人信息
//	@Tags			个人中心
//	@Produce		json
//	@Security		BearerAuth
//	@Success		200	{object}	response.Response{data=dto.ProfileResp}
//	@Failure		401	{object}	response.Response
//	@Router			/me/profile [get]
func (h *AuthHandler) GetProfile(c *gin.Context) {
	profile, err := h.svc.GetProfile(c.Request.Context())
	if err != nil {
		response.Fail(c, err)
		return
	}
	response.Success(c, profile)
}

// UpdateProfile godoc
//
//	@Summary		更新个人信息
//	@Description	更新当前登录用户的个人信息
//	@Tags			个人中心
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			request	body		dto.UpdateProfileReq	true	"更新信息请求"
//	@Success		200		{object}	response.Response
//	@Failure		400		{object}	response.Response
//	@Router			/me/profile [put]
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	req, ok := ginx.BindJSON[dto.UpdateProfileReq](c)
	if !ok {
		return
	}

	if err := h.svc.UpdateProfile(c.Request.Context(), *req); err != nil {
		response.Fail(c, err)
		return
	}
	response.Success(c, nil)
}
