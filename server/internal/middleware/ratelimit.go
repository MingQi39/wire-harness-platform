package middleware

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/hmq/wire-harness-platform/internal/pkg/response"
)

var rateLimitLogger *zap.Logger

func SetRateLimitLogger(l *zap.Logger) { rateLimitLogger = l }

// rateLimitFailClosed 生产/预发环境 Redis 不可用时拒绝请求，避免限流失效。
func rateLimitFailClosed() bool {
	env := strings.TrimSpace(os.Getenv("APP_ENV"))
	if env == "production" || env == "staging" {
		return !rateLimitEnvBool("RATE_LIMIT_FAIL_OPEN", false)
	}
	return rateLimitEnvBool("RATE_LIMIT_FAIL_CLOSED", false)
}

func rateLimitEnvBool(key string, fallback bool) bool {
	v := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
	if v == "" {
		return fallback
	}
	switch v {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return fallback
	}
}

// HandleRateLimitRedisError 处理 Redis 限流失败；返回 true 表示请求已终止或已降级放行。
func HandleRateLimitRedisError(c *gin.Context, err error) bool {
	if rateLimitLogger != nil {
		rateLimitLogger.Warn("ratelimit: redis unavailable",
			zap.String("trace_id", response.TraceIDFromCtx(c.Request.Context())),
			zap.Error(err),
			zap.Bool("fail_closed", rateLimitFailClosed()),
		)
	}
	if rateLimitFailClosed() {
		abortRateLimitUnavailable(c)
		return true
	}
	c.Header("X-RateLimit-Status", "degraded")
	return false
}

func abortRateLimitUnavailable(c *gin.Context) {
	response.AbortJSON(c, 503, response.Response{
		Code:    50300,
		Message: "服务暂时不可用，请稍后再试",
	})
}

var rateLimitScript = redis.NewScript(`
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local count = redis.call('INCR', key)
if count == 1 then
    redis.call('EXPIRE', key, window)
end
return count
`)

func RateLimitMiddleware(rdb *redis.Client, limit int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		tid, _ := c.Get("tenant_id")
		userID, _ := c.Get("user_id")
		key := fmt.Sprintf("lims:ratelimit:%v:%v:%s", tid, userID, c.FullPath())

		count, err := rateLimitScript.Run(
			c.Request.Context(), rdb,
			[]string{key},
			limit, int(window.Seconds()),
		).Int64()
		if err != nil {
			if HandleRateLimitRedisError(c, err) {
				return
			}
			c.Next()
			return
		}

		if count > int64(limit) {
			response.AbortJSON(c, 429, response.Response{
				Code:    42900,
				Message: "请求过于频繁，请稍后再试",
			})
			return
		}

		c.Writer.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", int64(limit)-count))
		c.Next()
	}
}
