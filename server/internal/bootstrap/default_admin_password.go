package bootstrap

import (
	"context"
	"errors"
	"os"
	"strings"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/hmq/wire-harness-platform/internal/model"
	"github.com/hmq/wire-harness-platform/internal/pkg/auth"
)

const (
	defaultSeedAdminUsername = "bjy"
	// 与 migrations/000101 一致：明文 qwer.123
	defaultSeedPasswordHash = "$2a$12$dfDRssUSHBg9wFvAlAmXaOOkVEqP07P39UU5r7KsjnZHmXhn0oQ2O"
)

// ReconcileDefaultAdminPassword 若 bjy 仍使用迁移种子的默认密码，则用 LIMS_ADMIN_PASSWORD 覆盖。
func ReconcileDefaultAdminPassword(ctx context.Context, db *gorm.DB, logger *zap.Logger) error {
	if db == nil {
		return nil
	}
	if logger == nil {
		logger = zap.NewNop()
	}

	var user model.User
	err := db.WithContext(ctx).Where("username = ?", defaultSeedAdminUsername).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil
	}
	if err != nil {
		return err
	}
	if user.Password != defaultSeedPasswordHash {
		return nil
	}

	adminPass := strings.TrimSpace(os.Getenv("LIMS_ADMIN_PASSWORD"))
	if adminPass == "" {
		logger.Warn("seed admin still uses factory password; set LIMS_ADMIN_PASSWORD or change password manually",
			zap.String("username", defaultSeedAdminUsername),
			zap.Int64("user_id", user.ID),
		)
		return nil
	}

	hash, err := auth.HashPassword(adminPass)
	if err != nil {
		return err
	}
	if err := db.WithContext(ctx).Model(&user).Update("password", hash).Error; err != nil {
		return err
	}
	logger.Info("seed admin password reconciled from LIMS_ADMIN_PASSWORD",
		zap.String("username", defaultSeedAdminUsername),
		zap.Int64("user_id", user.ID),
	)
	return nil
}
