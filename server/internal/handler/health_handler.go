package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type HealthHandler struct {
	db  *gorm.DB
	rdb *redis.Client
}

func NewHealthHandler(db *gorm.DB, rdb *redis.Client) *HealthHandler {
	return &HealthHandler{db: db, rdb: rdb}
}

// Healthz godoc
//
//	@Summary		存活检查
//	@Description	Kubernetes 存活探针端点
//	@Tags			健康检查
//	@Produce		json
//	@Success		200	{object}	object{status=string}
//	@Router			/healthz [get]
func (h *HealthHandler) Healthz(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// Ready godoc
//
//	@Summary		就绪检查
//	@Description	Kubernetes 就绪探针端点，检查数据库和 Redis 连接
//	@Tags			健康检查
//	@Produce		json
//	@Success		200	{object}	object{status=string}
//	@Failure		503	{object}	object{status=string,reason=string}
//	@Router			/ready [get]
func (h *HealthHandler) Ready(c *gin.Context) {
	if err := h.db.WithContext(c.Request.Context()).Exec("SELECT 1").Error; err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "not ready",
			"reason": "database unavailable",
		})
		return
	}
	if err := h.rdb.Ping(c.Request.Context()).Err(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "not ready",
			"reason": "redis unavailable",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ready"})
}
