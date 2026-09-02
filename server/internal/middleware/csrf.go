package middleware

import (
	"net/http"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/hmq/wire-harness-platform/internal/pkg/apperror"
	"github.com/hmq/wire-harness-platform/internal/pkg/response"
)

const csrfClientHeader = "X-LIMS-Client"

const (
	refreshTokenCookie = "lims_refresh_token"
	accessTokenCookie  = "lims_access_token"
)

// CSRFMiddleware 为依赖 Cookie 的写请求提供 CSRF 防护。
//
// 业务 API 主要用 Authorization Bearer，浏览器不会跨站自动携带，天然免疫 CSRF。
// Refresh / Logout 等仍可能仅依赖 HttpOnly Cookie，需额外校验：
//   - 客户端显式标记 X-LIMS-Client: web|electron（跨站表单无法设置自定义头）；
//   - 或 Origin / Referer 落在 CORS 白名单内（与 deploy-assistant 同源策略一致）。
func CSRFMiddleware(allowedOrigins []string) gin.HandlerFunc {
	allowed := buildAllowedOriginSet(allowedOrigins)
	corsAllowAll := len(allowedOrigins) == 1 && allowedOrigins[0] == "*"

	return func(c *gin.Context) {
		if !isUnsafeHTTPMethod(c.Request.Method) {
			c.Next()
			return
		}

		if hasBearerAuthorization(c.GetHeader("Authorization")) {
			c.Next()
			return
		}

		if isTrustedClientMarker(c.GetHeader(csrfClientHeader)) {
			c.Next()
			return
		}

		if !requiresCSRFCheck(c, corsAllowAll) {
			c.Next()
			return
		}

		if requestOriginAllowed(c, allowed, corsAllowAll) {
			c.Next()
			return
		}

		response.Fail(c, apperror.WrapError(apperror.ErrForbidden, "CSRF 校验失败"))
		c.Abort()
	}
}

func isUnsafeHTTPMethod(method string) bool {
	switch method {
	case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
		return true
	default:
		return false
	}
}

func hasBearerAuthorization(header string) bool {
	parts := strings.SplitN(strings.TrimSpace(header), " ", 2)
	return len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") && parts[1] != ""
}

func isTrustedClientMarker(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "web", "electron":
		return true
	default:
		return false
	}
}

func requiresCSRFCheck(c *gin.Context, corsAllowAll bool) bool {
	if strings.HasPrefix(c.FullPath(), "/api/v1/errors/report") {
		return false
	}
	if hasAuthSessionCookie(c) {
		return true
	}
	if strings.HasPrefix(c.FullPath(), "/api/v1/auth") {
		return true
	}
	// CORS 通配时 Origin 白名单无效，所有无 Bearer 的写请求都必须带 X-LIMS-Client。
	return corsAllowAll
}

func hasAuthSessionCookie(c *gin.Context) bool {
	for _, name := range []string{refreshTokenCookie, accessTokenCookie} {
		if _, err := c.Cookie(name); err == nil {
			return true
		}
	}
	return false
}

func buildAllowedOriginSet(allowedOrigins []string) map[string]struct{} {
	set := make(map[string]struct{}, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		origin = strings.TrimSpace(origin)
		if origin == "" || origin == "*" {
			continue
		}
		set[origin] = struct{}{}
	}
	return set
}

func requestOriginAllowed(c *gin.Context, allowed map[string]struct{}, corsAllowAll bool) bool {
	if corsAllowAll {
		return false
	}
	if origin := strings.TrimSpace(c.GetHeader("Origin")); origin != "" {
		_, ok := allowed[origin]
		return ok
	}
	referer := strings.TrimSpace(c.GetHeader("Referer"))
	if referer == "" {
		return false
	}
	u, err := url.Parse(referer)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return false
	}
	origin := u.Scheme + "://" + u.Host
	_, ok := allowed[origin]
	return ok
}
