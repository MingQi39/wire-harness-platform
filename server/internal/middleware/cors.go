package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func CORSMiddleware(allowedOrigins []string) gin.HandlerFunc {
	allowAll := len(allowedOrigins) == 1 && allowedOrigins[0] == "*"

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" {
			if allowAll {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
				c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
				c.Writer.Header().Add("Vary", "Origin")
			} else {
				for _, allowed := range allowedOrigins {
					if origin == allowed {
						c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
						c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
						c.Writer.Header().Add("Vary", "Origin")
						break
					}
				}
			}
		}
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers",
			"Content-Type, Authorization, X-Trace-ID, X-Idempotency-Key, X-Token-In-Body, X-LIMS-Client")
		c.Writer.Header().Set("Access-Control-Expose-Headers", "X-Trace-ID")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
