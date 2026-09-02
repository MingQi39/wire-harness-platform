package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/hmq/wire-harness-platform/internal/bootstrap"
	"github.com/hmq/wire-harness-platform/internal/config"
	harnessdb "github.com/hmq/wire-harness-platform/internal/db"
	"github.com/hmq/wire-harness-platform/internal/router"
)

func main() {
	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		log.Fatalf("config validation failed: %v", err)
	}

	logger := initLogger(cfg.App.Env)
	defer logger.Sync()

	if len(os.Args) > 1 && os.Args[1] == "migrate" {
		runMigrate(cfg, logger)
		return
	}

	db, err := initDB(cfg, logger)
	if err != nil {
		logger.Fatal("database connection failed", zap.Error(err))
	}
	sqlDB, _ := db.DB()
	defer sqlDB.Close()

	if err := bootstrap.ReconcileDefaultAdminPassword(context.Background(), db, logger); err != nil {
		logger.Warn("reconcile admin password", zap.Error(err))
	}

	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.Redis.Addr(),
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	})
	defer rdb.Close()

	engine := router.Setup(cfg, db, rdb, logger)
	addr := fmt.Sprintf(":%s", cfg.Server.Port)
	srv := &http.Server{Addr: addr, Handler: engine, ReadTimeout: cfg.Server.ReadTimeout, WriteTimeout: cfg.Server.WriteTimeout, IdleTimeout: cfg.Server.IdleTimeout}

	go func() {
		logger.Info("server starting", zap.String("addr", addr))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("server failed", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
}

func runMigrate(cfg *config.Config, logger *zap.Logger) {
	if len(os.Args) < 3 {
		log.Fatal("usage: go run ./cmd/server/main.go migrate <up|down|force>")
	}
	var err error
	switch os.Args[2] {
	case "up":
		err = harnessdb.MigrateUp(cfg)
		if err == nil {
			db, dbErr := initDB(cfg, logger)
			if dbErr != nil {
				err = dbErr
			} else {
				err = bootstrap.ReconcileDefaultAdminPassword(context.Background(), db, logger)
				if sqlDB, closeErr := db.DB(); closeErr == nil {
					_ = sqlDB.Close()
				}
			}
		}
	case "down":
		err = harnessdb.MigrateDown(cfg)
	case "force":
		if len(os.Args) < 4 {
			log.Fatal("usage: go run ./cmd/server/main.go migrate force <version>")
		}
		v, convErr := strconv.Atoi(os.Args[3])
		if convErr != nil || v < 0 {
			log.Fatalf("migrate force: invalid version %q", os.Args[3])
		}
		err = harnessdb.MigrateForce(cfg, v)
	default:
		log.Fatal("usage: go run ./cmd/server/main.go migrate <up|down|force>")
	}
	if err != nil {
		logger.Fatal("migrate failed", zap.Error(err))
	}
	logger.Info("migrate finished", zap.String("direction", os.Args[2]))
}

func initDB(cfg *config.Config, logger *zap.Logger) (*gorm.DB, error) {
	dsn := cfg.DB.DSN()
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(cfg.DB.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.DB.MaxIdleConns)
	return db, nil
}

func initLogger(env string) *zap.Logger {
	level := zap.InfoLevel
	if env == "development" {
		level = zap.DebugLevel
	}
	config := zap.Config{
		Level:            zap.NewAtomicLevelAt(level),
		Development:      env == "development",
		Encoding:         "console",
		EncoderConfig:    zap.NewDevelopmentEncoderConfig(),
		OutputPaths:      []string{"stdout"},
		ErrorOutputPaths: []string{"stderr"},
	}
	config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	logger, _ := config.Build()
	return logger
}
