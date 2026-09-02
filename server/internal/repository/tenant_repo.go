package repository

import (
	"context"

	"gorm.io/gorm"

	"github.com/hmq/wire-harness-platform/internal/model"
)

type TenantRepository struct {
	db *gorm.DB
}

func NewTenantRepository(db *gorm.DB) *TenantRepository {
	return &TenantRepository{db: db}
}

func (r *TenantRepository) GetByCode(ctx context.Context, code string) (*model.Tenant, error) {
	var t model.Tenant
	err := r.db.WithContext(ctx).Where("code = ? AND status = ?", code, "active").First(&t).Error
	return &t, err
}

func (r *TenantRepository) GetByID(ctx context.Context, id int64) (*model.Tenant, error) {
	var t model.Tenant
	err := r.db.WithContext(ctx).First(&t, id).Error
	return &t, err
}

// ListIDs 返回所有活跃租户 ID（供 Worker 遍历用）
func (r *TenantRepository) ListIDs(ctx context.Context) ([]int64, error) {
	var ids []int64
	err := r.db.WithContext(ctx).Model(&model.Tenant{}).
		Where("status = ?", "active").
		Pluck("id", &ids).Error
	return ids, err
}
