package db

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"

	"github.com/hmq/wire-harness-platform/internal/config"
	"github.com/hmq/wire-harness-platform/internal/pkg/repo"
)

// MigrateUp 执行尚未应用的迁移。
func MigrateUp(cfg *config.Config) error {
	m, err := openMigrate(cfg)
	if err != nil {
		return err
	}
	defer m.Close()

	err = m.Up()
	if err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return err
	}
	return nil
}

// MigrateDown 回滚上一个版本（一步）。
func MigrateDown(cfg *config.Config) error {
	m, err := openMigrate(cfg)
	if err != nil {
		return err
	}
	defer m.Close()

	err = m.Steps(-1)
	if err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return err
	}
	return nil
}

// MigrateForce 将 schema_migrations 设为指定版本并清除 dirty（与 golang-migrate `force` 一致）。
// 典型场景：某次 up 中途失败后版本表为 dirty，确认库内无半截 DDL 后 force 回上一版本再重新 migrate up。
func MigrateForce(cfg *config.Config, version int) error {
	m, err := openMigrate(cfg)
	if err != nil {
		return err
	}
	defer m.Close()
	return m.Force(version)
}

func openMigrate(cfg *config.Config) (*migrate.Migrate, error) {
	var dir string
	if d := strings.TrimSpace(os.Getenv("MIGRATIONS_PATH")); d != "" {
		dir = d
	} else {
		root, err := repo.Root()
		if err != nil {
			return nil, fmt.Errorf("migrations dir: %w (或在容器/CI 中设置 MIGRATIONS_PATH)", err)
		}
		dir = filepath.Join(root, "migrations")
	}
	sourceURL := "file://" + filepath.ToSlash(dir)

	m, err := migrate.New(sourceURL, cfg.DB.DatabaseURL())
	if err != nil {
		return nil, fmt.Errorf("migrate open: %w", err)
	}
	return m, nil
}
