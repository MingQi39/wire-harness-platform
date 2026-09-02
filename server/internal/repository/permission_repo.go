package repository

import (
	"context"

	"gorm.io/gorm"

	"github.com/hmq/wire-harness-platform/internal/model"
	"github.com/hmq/wire-harness-platform/internal/pkg/tx"
)

type PermissionRepository struct {
	db *gorm.DB
}

func NewPermissionRepository(db *gorm.DB) *PermissionRepository {
	return &PermissionRepository{db: db}
}

func (r *PermissionRepository) ListAll(ctx context.Context) ([]model.Permission, error) {
	var perms []model.Permission
	err := tx.GetDB(ctx, r.db).Order("sort ASC, id ASC").Find(&perms).Error
	return perms, err
}

func (r *PermissionRepository) GetByIDs(ctx context.Context, ids []int64) ([]model.Permission, error) {
	var perms []model.Permission
	err := tx.GetDB(ctx, r.db).Where("id IN ?", ids).Find(&perms).Error
	return perms, err
}

// GetByCode 按权限码查询单条（不存在时返回 gorm.ErrRecordNotFound）。
func (r *PermissionRepository) GetByCode(ctx context.Context, code string) (*model.Permission, error) {
	var p model.Permission
	err := tx.GetDB(ctx, r.db).Where("code = ?", code).First(&p).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}
