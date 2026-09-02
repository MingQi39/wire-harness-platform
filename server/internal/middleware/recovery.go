package middleware

import (
	"fmt"
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/hmq/wire-harness-platform/internal/pkg/response"
)

func RecoveryMiddleware(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				traceID := response.TraceIDFromCtx(c.Request.Context())
				logger.Error("panic recovered",
					zap.String("trace_id", traceID),
					zap.Any("panic", r),
					zap.String("stack", string(debug.Stack())),
				)

				// TODO: sentry.CaptureException(fmt.Errorf("panic: %v", r))

				resp := response.Response{
					Code:    50000,
					Message: "服务器内部错误",
					TraceID: traceID,
				}
				if response.IsDebugSafe() {
					resp.Detail = fmt.Sprintf("%v", r)
				}
				c.AbortWithStatusJSON(http.StatusInternalServerError, resp)
			}
		}()
		c.Next()
	}
}
