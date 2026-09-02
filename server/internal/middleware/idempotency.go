package middleware

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/hmq/wire-harness-platform/internal/pkg/apperror"
	"github.com/hmq/wire-harness-platform/internal/pkg/response"
)

type responseCapture struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

const idempotencyBodyHashLimit = 1 << 20 // 1 MiB；大请求不额外读流，避免拖慢上传接口

func (w *responseCapture) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func IdempotencyMiddleware(rdb *redis.Client, logger ...*zap.Logger) gin.HandlerFunc {
	var log *zap.Logger
	if len(logger) > 0 {
		log = logger[0]
	}
	return func(c *gin.Context) {
		if c.Request.Method == http.MethodGet || c.Request.Method == http.MethodHead {
			c.Next()
			return
		}

		key := c.GetHeader("X-Idempotency-Key")
		if key == "" {
			c.Next()
			return
		}

		tid, _ := c.Get("tenant_id")
		uid, _ := c.Get("user_id")
		tidVal, tidOk := tid.(int64)
		uidVal, uidOk := uid.(int64)
		if !tidOk || !uidOk {
			c.Next()
			return
		}
		semantic, err := idempotencyRequestSemantic(c)
		if err != nil {
			if handleIdempotencyRedisError(c, log, err, "build request semantic") {
				return
			}
			c.Next()
			return
		}
		cacheKey := fmt.Sprintf("lims:idempotency:%d:%d:%s:%s", tidVal, uidVal, key, sha256Hex(semantic))

		if cached, err := rdb.Get(c.Request.Context(), cacheKey).Bytes(); err == nil {
			var resp response.Response
			if err := json.Unmarshal(cached, &resp); err == nil {
				c.AbortWithStatusJSON(http.StatusOK, resp)
				return
			}
			rdb.Del(c.Request.Context(), cacheKey)
		} else if err != redis.Nil {
			if handleIdempotencyRedisError(c, log, err, "get cached response") {
				return
			}
			c.Next()
			return
		}

		locked, err := rdb.SetNX(c.Request.Context(), cacheKey+":lock", "1", 30*time.Second).Result()
		if err != nil {
			if handleIdempotencyRedisError(c, log, err, "acquire lock") {
				return
			}
			c.Next()
			return
		}
		if !locked {
			response.AbortJSON(c, http.StatusConflict, response.Response{
				Code:    40900,
				Message: "请求正在处理中，请勿重复提交",
			})
			return
		}
		defer rdb.Del(context.Background(), cacheKey+":lock")

		w := &responseCapture{ResponseWriter: c.Writer, body: &bytes.Buffer{}}
		c.Writer = w

		c.Next()

		if c.Writer.Status() >= 200 && c.Writer.Status() < 300 {
			body := w.body.Bytes()
			// 仅缓存 JSON 业务响应。证书/原始记录等 PDF 为二进制，不应写入 Redis，也无法被上方 json.Unmarshal 重放。
			if idempotencyResponseCacheable(c, body) {
				if err := rdb.Set(c.Request.Context(), cacheKey, body, 24*time.Hour).Err(); err != nil {
					_ = c.Error(fmt.Errorf("idempotency: cache response for key %s: %w", key, err))
				}
			}
		}
	}
}

func idempotencyRequestSemantic(c *gin.Context) (string, error) {
	route := c.FullPath()
	if route == "" {
		route = c.Request.URL.Path
	}
	bodySig, err := idempotencyBodyFingerprint(c)
	if err != nil {
		return "", err
	}
	return c.Request.Method + " " + route + " " + bodySig, nil
}

func idempotencyBodyFingerprint(c *gin.Context) (string, error) {
	ct := strings.ToLower(c.GetHeader("Content-Type"))
	if strings.HasPrefix(ct, "multipart/") || c.Request.ContentLength > idempotencyBodyHashLimit {
		return fmt.Sprintf("stream:%s:%d", ct, c.Request.ContentLength), nil
	}
	if c.Request.Body == nil {
		return "empty", nil
	}
	body, err := io.ReadAll(io.LimitReader(c.Request.Body, idempotencyBodyHashLimit+1))
	if err != nil {
		return "", err
	}
	c.Request.Body = io.NopCloser(bytes.NewReader(body))
	if int64(len(body)) > idempotencyBodyHashLimit {
		return fmt.Sprintf("stream:%s:%d", ct, c.Request.ContentLength), nil
	}
	return "sha256:" + sha256HexBytes(body), nil
}

func sha256Hex(s string) string {
	return sha256HexBytes([]byte(s))
}

func sha256HexBytes(b []byte) string {
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:])
}

// idempotencyFailClosed 生产/预发环境 Redis 不可用时拒绝带幂等键的写请求，避免重复提交。
func idempotencyFailClosed() bool {
	env := strings.TrimSpace(os.Getenv("APP_ENV"))
	if env == "production" || env == "staging" {
		return !idempotencyEnvBool("IDEMPOTENCY_FAIL_OPEN", false)
	}
	return idempotencyEnvBool("IDEMPOTENCY_FAIL_CLOSED", false)
}

func idempotencyEnvBool(key string, fallback bool) bool {
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

func abortIdempotencyUnavailable(c *gin.Context) {
	response.Fail(c, apperror.ErrServiceUnavail)
	c.Abort()
}

func handleIdempotencyRedisError(c *gin.Context, log *zap.Logger, err error, step string) bool {
	if log != nil {
		log.Warn("idempotency: redis unavailable",
			zap.String("trace_id", response.TraceIDFromCtx(c.Request.Context())),
			zap.String("step", step),
			zap.Error(err),
			zap.Bool("fail_closed", idempotencyFailClosed()),
		)
	}
	if idempotencyFailClosed() {
		abortIdempotencyUnavailable(c)
		return true
	}
	c.Header("X-Idempotency-Status", "degraded")
	return false
}

// idempotencyResponseCacheable 仅当响应明显为 JSON API 体时才做幂等缓存；PDF/流式下载等直接跳过。
func idempotencyResponseCacheable(c *gin.Context, body []byte) bool {
	ct := strings.ToLower(c.Writer.Header().Get("Content-Type"))
	if strings.HasPrefix(ct, "application/pdf") {
		return false
	}
	if strings.HasPrefix(ct, "application/octet-stream") {
		return false
	}
	// 未带 Content-Type 时根据魔数再拦一层，避免大体积 PDF 误入 Redis
	if len(body) >= 4 && string(body[0:4]) == "%PDF" {
		return false
	}
	return true
}
