package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/hmq/wire-harness-platform/internal/pkg/apperror"
	"github.com/hmq/wire-harness-platform/internal/pkg/response"
	"github.com/hmq/wire-harness-platform/internal/pkg/tenant"
)

// TenantMiddleware extracts tenant_id from the auth claims (set by AuthMiddleware)
// and injects it into the request context. Must be placed after AuthMiddleware.
func TenantMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		raw, exists := c.Get("tenant_id")
		tenantID, ok := raw.(int64)
		if !exists || !ok || tenantID == 0 {
			response.Fail(c, apperror.WrapError(apperror.ErrForbidden, "未关联租户"))
			c.Abort()
			return
		}

		ctx := tenant.CtxWithTenantID(c.Request.Context(), tenantID)
		c.Request = c.Request.WithContext(ctx)
		c.Next()
	}
}
