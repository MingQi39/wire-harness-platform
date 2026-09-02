package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/hmq/wire-harness-platform/internal/pkg/requestmeta"
	"github.com/hmq/wire-harness-platform/internal/pkg/response"
)

func TraceMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		traceID := c.GetHeader("X-Trace-ID")
		if traceID == "" || len(traceID) > 64 {
			traceID = uuid.NewString()
		}
		c.Set("trace_id", traceID)
		c.Writer.Header().Set("X-Trace-ID", traceID)

		path := c.FullPath()
		if path == "" {
			path = c.Request.URL.Path
		}
		ctx := response.CtxWithTraceID(c.Request.Context(), traceID)
		ctx = requestmeta.With(ctx, requestmeta.Meta{
			IPAddr:    c.ClientIP(),
			UserAgent: c.Request.UserAgent(),
		})
		ctx = requestmeta.WithRoute(ctx, c.Request.Method, path)
		c.Request = c.Request.WithContext(ctx)

		c.Next()
	}
}
