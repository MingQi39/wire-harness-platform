package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCSRFMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	allowed := []string{"http://localhost:5173", "https://lims.example.com"}

	newEngine := func() *gin.Engine {
		r := gin.New()
		r.Use(CSRFMiddleware(allowed))
		r.POST("/api/v1/auth/refresh", func(c *gin.Context) { c.Status(http.StatusOK) })
		r.POST("/api/v1/auth/login", func(c *gin.Context) { c.Status(http.StatusOK) })
		r.POST("/api/v1/customers", func(c *gin.Context) { c.Status(http.StatusOK) })
		return r
	}

	t.Run("Bearer token bypasses CSRF", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/customers", nil)
		req.Header.Set("Authorization", "Bearer access-token")
		w := httptest.NewRecorder()
		newEngine().ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200", w.Code)
		}
	})

	t.Run("trusted client marker bypasses CSRF", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", nil)
		req.Header.Set(csrfClientHeader, "web")
		w := httptest.NewRecorder()
		newEngine().ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200", w.Code)
		}
	})

	t.Run("auth path rejects missing origin and client marker", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", nil)
		w := httptest.NewRecorder()
		newEngine().ServeHTTP(w, req)
		if w.Code != http.StatusForbidden {
			t.Fatalf("status = %d, want 403", w.Code)
		}
	})

	t.Run("auth path accepts allowed origin", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", nil)
		req.Header.Set("Origin", "http://localhost:5173")
		req.AddCookie(&http.Cookie{Name: refreshTokenCookie, Value: "refresh-token"})
		w := httptest.NewRecorder()
		newEngine().ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200", w.Code)
		}
	})

	t.Run("auth path rejects foreign origin", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", nil)
		req.Header.Set("Origin", "https://evil.example.com")
		req.AddCookie(&http.Cookie{Name: refreshTokenCookie, Value: "refresh-token"})
		w := httptest.NewRecorder()
		newEngine().ServeHTTP(w, req)
		if w.Code != http.StatusForbidden {
			t.Fatalf("status = %d, want 403", w.Code)
		}
	})

	t.Run("cookie session on non-auth path requires CSRF signal", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/customers", nil)
		req.AddCookie(&http.Cookie{Name: refreshTokenCookie, Value: "refresh-token"})
		w := httptest.NewRecorder()
		newEngine().ServeHTTP(w, req)
		if w.Code != http.StatusForbidden {
			t.Fatalf("status = %d, want 403", w.Code)
		}
	})

	t.Run("GET bypasses CSRF", func(t *testing.T) {
		r := gin.New()
		r.Use(CSRFMiddleware(allowed))
		r.GET("/api/v1/auth/refresh", func(c *gin.Context) { c.Status(http.StatusOK) })
		req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/refresh", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200", w.Code)
		}
	})

	t.Run("cors allow all requires client marker", func(t *testing.T) {
		r := gin.New()
		r.Use(CSRFMiddleware([]string{"*"}))
		r.POST("/api/v1/auth/login", func(c *gin.Context) { c.Status(http.StatusOK) })
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", nil)
		req.Header.Set("Origin", "http://localhost:5173")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusForbidden {
			t.Fatalf("status = %d, want 403", w.Code)
		}
	})
}
