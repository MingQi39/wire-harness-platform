package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

func TestIdempotencyMiddleware_RedisUnavailableFailClosedInProduction(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Setenv("APP_ENV", "production")

	rdb := redis.NewClient(&redis.Options{Addr: "127.0.0.1:1"})
	t.Cleanup(func() { _ = rdb.Close() })

	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("tenant_id", int64(1))
		c.Set("user_id", int64(2))
		c.Next()
	})
	r.Use(IdempotencyMiddleware(rdb))
	r.POST("/api/v1/commission-orders/:id/workflow/step1-submit", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"code": 0})
	})

	req := httptest.NewRequest(http.MethodPost, "/api/v1/commission-orders/1/workflow/step1-submit", nil)
	req.Header.Set("X-Idempotency-Key", "idem-1")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503", w.Code)
	}
}

func TestIdempotencyMiddleware_RedisUnavailableFailOpenInDevelopment(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Setenv("APP_ENV", "development")
	os.Unsetenv("IDEMPOTENCY_FAIL_CLOSED")

	rdb := redis.NewClient(&redis.Options{Addr: "127.0.0.1:1"})
	t.Cleanup(func() { _ = rdb.Close() })

	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("tenant_id", int64(1))
		c.Set("user_id", int64(2))
		c.Next()
	})
	r.Use(IdempotencyMiddleware(rdb))
	r.POST("/api/v1/test", func(c *gin.Context) { c.Status(http.StatusOK) })

	req := httptest.NewRequest(http.MethodPost, "/api/v1/test", nil)
	req.Header.Set("X-Idempotency-Key", "idem-2")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}
}

func TestIdempotencyMiddleware_CachesSuccessfulJSONResponse(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(mr.Close)

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })

	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("tenant_id", int64(1))
		c.Set("user_id", int64(2))
		c.Next()
	})
	r.Use(IdempotencyMiddleware(rdb))
	calls := 0
	r.POST("/api/v1/test", func(c *gin.Context) {
		calls++
		c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok", "data": gin.H{"n": 1}})
	})

	doReq := func() *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/test", nil)
		req.Header.Set("X-Idempotency-Key", "idem-cache")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w
	}

	w1 := doReq()
	if w1.Code != http.StatusOK || calls != 1 {
		t.Fatalf("first call status=%d calls=%d", w1.Code, calls)
	}
	w2 := doReq()
	if w2.Code != http.StatusOK || calls != 1 {
		t.Fatalf("second call should replay cache, status=%d calls=%d", w2.Code, calls)
	}
}
