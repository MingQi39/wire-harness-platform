package repository

import (
	"context"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/hmq/wire-harness-platform/internal/model"
	"github.com/hmq/wire-harness-platform/internal/pkg/dbutil"
	"github.com/hmq/wire-harness-platform/internal/pkg/tenant"
	"github.com/hmq/wire-harness-platform/internal/pkg/tx"
)

type RoleRepository struct {
	db *gorm.DB
}

func NewRoleRepository(db *gorm.DB) *RoleRepository {
	return &RoleRepository{db: db}
}

func (r *RoleRepository) Create(ctx context.Context, role *model.Role) error {
	return tx.GetDB(ctx, r.db).Create(role).Error
}

func (r *RoleRepository) GetByID(ctx context.Context, id int64) (*model.Role, error) {
	var role model.Role
	err := readFromPrimary(tx.GetDB(ctx, r.db)).Preload("Permissions").First(&role, id).Error
	return &role, err
}

func (r *RoleRepository) GetByName(ctx context.Context, name string) (*model.Role, error) {
	var role model.Role
	err := readFromPrimary(tx.GetDB(ctx, r.db)).Where("name = ?", name).First(&role).Error
	return &role, err
}

func (r *RoleRepository) Update(ctx context.Context, role *model.Role) error {
	result := tx.GetDB(ctx, r.db).Model(&model.Role{}).
		Where("id = ? AND updated_at = ?", role.ID, role.UpdatedAt).
		Updates(map[string]interface{}{
			"name":         role.Name,
			"display_name": role.DisplayName,
			"description":  role.Description,
			"updated_at":   gorm.Expr("NOW()"),
		})
	return checkOptimisticUpdate(result)
}

func (r *RoleRepository) Delete(ctx context.Context, id int64, expectedUpdatedAt time.Time) error {
	db := tx.GetDB(ctx, r.db).Model(&model.Role{}).Where("id = ? AND updated_at = ?", id, expectedUpdatedAt)
	result := db.Delete(&model.Role{})
	return checkOptimisticUpdate(result)
}

func (r *RoleRepository) listQuery(ctx context.Context, keyword string) *gorm.DB {
	db := readFromPrimary(tx.GetDB(ctx, r.db)).Model(&model.Role{})
	if kw := strings.TrimSpace(keyword); kw != "" {
		p := dbutil.WrapLike(kw)
		db = db.Where("(name ILIKE ? OR COALESCE(display_name, '') ILIKE ? OR COALESCE(description, '') ILIKE ?)", p, p, p)
	}
	return db
}

func (r *RoleRepository) List(ctx context.Context, offset, limit int, keyword string) ([]model.Role, int64, error) {
	var roles []model.Role
	var total int64

	if err := r.listQuery(ctx, keyword).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := r.listQuery(ctx, keyword).Preload("Permissions").
		Offset(offset).Limit(limit).
		Order("id ASC").Find(&roles).Error
	return roles, total, err
}

// ReplacePermissions 替换角色的所有权限
func (r *RoleRepository) ReplacePermissions(ctx context.Context, roleID int64, permIDs []int64) error {
	db := tx.GetDB(ctx, r.db)

	if err := db.Exec("DELETE FROM role_permissions WHERE role_id = ?", roleID).Error; err != nil {
		return err
	}

	if len(permIDs) == 0 {
		return nil
	}

	type rp struct {
		RoleID       int64 `gorm:"column:role_id"`
		PermissionID int64 `gorm:"column:permission_id"`
	}
	records := make([]rp, len(permIDs))
	for i, pid := range permIDs {
		records[i] = rp{RoleID: roleID, PermissionID: pid}
	}
	return db.Table("role_permissions").Create(&records).Error
}

// GetUserIDsByRoleID 获取拥有指定角色的所有用户 ID
func (r *RoleRepository) GetUserIDsByRoleID(ctx context.Context, roleID int64) ([]int64, error) {
	var userIDs []int64
	db := tx.GetDB(ctx, r.db)
	err := db.Table("user_roles").
		Joins("JOIN users ON users.id = user_roles.user_id").
		Scopes(tenant.ScopeTable(ctx, "users")).
		Where("user_roles.role_id = ?", roleID).
		Pluck("user_roles.user_id", &userIDs).Error
	return userIDs, err
}

// CountUsersByRoleID 统计拥有指定角色的用户数
func (r *RoleRepository) CountUsersByRoleID(ctx context.Context, roleID int64) (int64, error) {
	var count int64
	db := tx.GetDB(ctx, r.db)
	err := db.Table("user_roles").
		Joins("JOIN users ON users.id = user_roles.user_id").
		Scopes(tenant.ScopeTable(ctx, "users")).
		Where("user_roles.role_id = ?", roleID).
		Count(&count).Error
	return count, err
}

// HasBuiltInDeveloperByRoleID 判断内置开发者账号是否挂在该角色下，仅用于用户可见计数展示。
func (r *RoleRepository) HasBuiltInDeveloperByRoleID(ctx context.Context, roleID int64) (bool, error) {
	var count int64
	db := tx.GetDB(ctx, r.db)
	err := db.Table("user_roles").
		Joins("JOIN users ON users.id = user_roles.user_id").
		Scopes(tenant.ScopeTable(ctx, "users")).
		Where("user_roles.role_id = ? AND user_roles.user_id = ?", roleID, builtInDeveloperUserID).
		Count(&count).Error
	return count > 0, err
}
