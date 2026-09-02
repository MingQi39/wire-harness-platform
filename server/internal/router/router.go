package router

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/hmq/wire-harness-platform/internal/config"
	"github.com/hmq/wire-harness-platform/internal/handler"
	"github.com/hmq/wire-harness-platform/internal/middleware"
	"github.com/hmq/wire-harness-platform/internal/pkg/audit"
	"github.com/hmq/wire-harness-platform/internal/pkg/auth"
	"github.com/hmq/wire-harness-platform/internal/pkg/cache"
	"github.com/hmq/wire-harness-platform/internal/pkg/response"
	"github.com/hmq/wire-harness-platform/internal/pkg/tx"
	"github.com/hmq/wire-harness-platform/internal/repository"
	"github.com/hmq/wire-harness-platform/internal/service"
)

type deps struct {
	authHandler       *handler.AuthHandler
	healthHandler     *handler.HealthHandler
	ledgerHandler     *handler.HarnessLedgerHandler
	managementHandler *handler.HarnessManagementHandler
	dashboardHandler  *handler.DashboardHandler
	permChecker       *middleware.PermissionChecker
	refreshStore      *auth.RefreshStore
	jwtSecret         string
}

func Setup(cfg *config.Config, db *gorm.DB, rdb *redis.Client, logger *zap.Logger) *gin.Engine {
	if cfg.App.Env != "development" {
		gin.SetMode(gin.ReleaseMode)
	}
	middleware.SetRateLimitLogger(logger)

	engine := gin.New()
	engine.Use(
		middleware.RecoveryMiddleware(logger),
		middleware.SecurityHeadersMiddleware(cfg.App.Env),
		middleware.CORSMiddleware(cfg.CORS.AllowedOrigins),
		middleware.CSRFMiddleware(cfg.CORS.AllowedOrigins),
		middleware.TraceMiddleware(),
		middleware.AccessLogMiddleware(logger),
	)

	d := initDeps(cfg, db, rdb, logger)
	registerRoutes(engine, cfg, rdb, d, logger)
	return engine
}

func initDeps(cfg *config.Config, db *gorm.DB, rdb *redis.Client, logger *zap.Logger) *deps {
	txMgr := tx.NewTxManager(db, logger)
	auditLogger := audit.NewAuditLogger(db)
	permCache := cache.NewPermissionCache(rdb)
	refreshStore := auth.NewRefreshStore(rdb)

	userRepo := repository.NewUserRepository(db)
	tenantRepo := repository.NewTenantRepository(db)
	roleRepo := repository.NewRoleRepository(db)
	permRepo := repository.NewPermissionRepository(db)
	ledgerRepo := repository.NewHarnessLedgerRepository(db)

	authSvc := service.NewAuthService(userRepo, roleRepo, tenantRepo, permRepo, txMgr, auditLogger, cfg, logger, refreshStore, permCache)
	uploadRoot := os.Getenv("UPLOAD_DIR")
	if uploadRoot == "" {
		uploadRoot = "./uploads"
	}
	ledgerSvc := service.NewHarnessLedgerService(ledgerRepo, uploadRoot, logger)
	managementSvc := service.NewHarnessManagementService(ledgerRepo)
	dashboardSvc := service.NewDashboardService(ledgerRepo)

	return &deps{
		authHandler:       handler.NewAuthHandler(authSvc, cfg),
		healthHandler:     handler.NewHealthHandler(db, rdb),
		ledgerHandler:     handler.NewHarnessLedgerHandler(ledgerSvc),
		managementHandler: handler.NewHarnessManagementHandler(managementSvc),
		dashboardHandler:  handler.NewDashboardHandler(dashboardSvc),
		permChecker:       middleware.NewPermissionChecker(permCache, userRepo, logger),
		refreshStore:      refreshStore,
		jwtSecret:         cfg.JWT.Secret,
	}
}

func registerRoutes(r *gin.Engine, cfg *config.Config, rdb *redis.Client, d *deps, logger *zap.Logger) {
	r.GET("/healthz", d.healthHandler.Healthz)
	r.GET("/ready", d.healthHandler.Ready)

	api := r.Group("/api")
	v1 := api.Group("/v1")

	authPerMinute := 10
	if v := strings.TrimSpace(os.Getenv("LIMS_AUTH_IP_LIMIT_PER_MINUTE")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			authPerMinute = n
		}
	} else if cfg.App.Env == "development" {
		authPerMinute = 600
	}

	v1.GET("/auth/password-encrypt-key-fingerprint", d.authHandler.PasswordEncryptKeyFingerprint)
	authGroup := v1.Group("/auth")
	authGroup.Use(ipRateLimitMiddleware(rdb, authPerMinute, time.Minute))
	{
		authGroup.POST("/login", d.authHandler.Login)
		authGroup.POST("/register", d.authHandler.Register)
		authGroup.POST("/refresh", d.authHandler.RefreshToken)
		authGroup.POST("/logout", d.authHandler.Logout)
	}

	authed := v1.Group("")
	authed.Use(
		middleware.AuthMiddleware(d.jwtSecret, d.refreshStore, logger),
		middleware.TenantMiddleware(),
		middleware.RateLimitMiddleware(rdb, 100, time.Minute),
	)
	{
		me := authed.Group("/me")
		{
			me.GET("/profile", d.authHandler.GetProfile)
			me.PUT("/profile", d.authHandler.UpdateProfile)
			me.POST("/verify-password", d.authHandler.VerifyPassword)
			me.PUT("/password", d.authHandler.ChangePassword)
		}

		projects := authed.Group("/harness-projects")
		{
			projects.GET("", d.ledgerHandler.ListProjects)
			projects.POST("", d.ledgerHandler.CreateProject)
			projects.PUT("/:id", d.ledgerHandler.UpdateProject)
			projects.DELETE("/:id", d.ledgerHandler.DeleteProject)
			projects.POST("/:id/attachment", d.ledgerHandler.UploadAttachment)
			projects.GET("/:id/attachment", d.ledgerHandler.DownloadAttachment)
			projects.GET("/:id/items", d.ledgerHandler.ListItems)
			projects.POST("/:id/items", d.ledgerHandler.CreateItem)
			projects.POST("/:id/items/import", d.ledgerHandler.ImportItems)
			projects.GET("/:id/items/export", d.ledgerHandler.ExportItems)
		}

		items := authed.Group("/harness-items")
		{
			items.PUT("/:id", d.ledgerHandler.UpdateItem)
			items.DELETE("/:id", d.ledgerHandler.DeleteItem)
		}

		authed.GET("/harness-items/import-template", d.ledgerHandler.ImportTemplate)

		authed.GET("/dashboard/stats", d.dashboardHandler.GetStats)

		management := authed.Group("/harness-management")
		{
			management.GET("/projects/:projectId/items", d.managementHandler.ListItems)
			management.POST("/stock-in", d.managementHandler.StockIn)
			management.POST("/stock-out", d.managementHandler.StockOut)
			management.POST("/scrap", d.managementHandler.Scrap)
			management.GET("/items/:itemId/operation-logs", d.managementHandler.ListOperationLogs)
		}
	}
}

func ipRateLimitMiddleware(rdb *redis.Client, limit int, window time.Duration) gin.HandlerFunc {
	script := redis.NewScript(`
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local count = redis.call('INCR', key)
if count == 1 then
    redis.call('EXPIRE', key, window)
end
return count
`)
	return func(c *gin.Context) {
		key := fmt.Sprintf("wire-harness:ip_ratelimit:%s:%s", c.ClientIP(), c.FullPath())
		count, err := script.Run(c.Request.Context(), rdb, []string{key}, limit, int(window.Seconds())).Int64()
		if err != nil {
			if middleware.HandleRateLimitRedisError(c, err) {
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
		c.Next()
	}
}
