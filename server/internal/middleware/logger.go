package middleware

import (
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/hmq/wire-harness-platform/internal/pkg/response"
)

func AccessLogMiddleware(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		c.Next()

		latency := time.Since(start)
		traceID := response.TraceIDFromCtx(c.Request.Context())
		userID, _ := c.Get("user_id")

		logger.Info("access",
			zap.String("trace_id", traceID),
			zap.Any("user_id", userID),
			zap.String("method", c.Request.Method),
			zap.String("path", c.Request.URL.Path),
			zap.String("query", sanitizeQuery(c.Request.URL.RawQuery)),
			zap.Int("status", c.Writer.Status()),
			zap.Duration("latency", latency),
			zap.String("client_ip", c.ClientIP()),
			zap.String("user_agent", c.Request.UserAgent()),
			zap.Int("response_size", c.Writer.Size()),
		)
	}
}

var sensitiveQueryKeys = []string{"token", "secret", "password", "key", "credential", "auth"}

func sanitizeQuery(raw string) string {
	if raw == "" {
		return raw
	}
	params, err := url.ParseQuery(raw)
	if err != nil {
		return raw
	}
	masked := false
	for key := range params {
		lower := strings.ToLower(key)
		for _, s := range sensitiveQueryKeys {
			if strings.Contains(lower, s) {
				params.Set(key, "***")
				masked = true
				break
			}
		}
	}
	if !masked {
		return raw
	}
	return params.Encode()
}
