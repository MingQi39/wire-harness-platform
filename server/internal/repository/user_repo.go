package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/hmq/wire-harness-platform/internal/model"
	"github.com/hmq/wire-harness-platform/internal/pkg/auth"
	"github.com/hmq/wire-harness-platform/internal/pkg/dbutil"
	"github.com/hmq/wire-harness-platform/internal/pkg/tenant"
	"github.com/hmq/wire-harness-platform/internal/pkg/tx"
)

type UserRepository struct {
	db *gorm.DB
}

const builtInDeveloperUserID int64 = 199839

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) writeScopedDB(ctx context.Context) *gorm.DB {
	db := ApplySelfUserTable(ctx, tx.GetDB(ctx, r.db).Model(&model.User{}).Scopes(tenant.Scope(ctx)))
	uid := auth.CurrentUserID(ctx)
	if uid == 0 || uid == builtInDeveloperUserID {
		return db
	}
	return db.Where("id <> ?", builtInDeveloperUserID)
}

func (r *UserRepository) ensureWritableUser(ctx context.Context, userID int64) error {
	var user model.User
	return r.writeScopedDB(ctx).Select("id").First(&user, userID).Error
}

func (r *UserRepository) Create(ctx context.Context, user *model.User) error {
	user.TenantID = tenant.IDFromCtx(ctx)
	return tx.GetDB(ctx, r.db).Create(user).Error
}

func (r *UserRepository) GetByID(ctx context.Context, id int64) (*model.User, error) {
	var user model.User
	db := ApplySelfUserTable(ctx, tx.GetDB(ctx, r.db).Model(&model.User{}).Scopes(tenant.Scope(ctx)))
	db = applyBuiltInDeveloperUserVisibility(ctx, db, "id")
	err := db.
		Preload("Roles.Permissions").First(&user, id).Error
	return &user, err
}

// GetByIDFromPrimary 写前读取当前用户行，避免读写分离副本延迟造成 updated_at 假冲突。
func (r *UserRepository) GetByIDFromPrimary(ctx context.Context, id int64) (*model.User, error) {
	var user model.User
	db := ApplySelfUserTable(ctx, readFromPrimary(tx.GetDB(ctx, r.db)).Model(&model.User{}).Scopes(tenant.Scope(ctx)))
	db = applyBuiltInDeveloperUserVisibility(ctx, db, "id")
	err := db.Preload("Roles.Permissions").First(&user, id).Error
	return &user, err
}

// GetByIDAnyInTenant 不应用行级 self（仅租户边界），供流程指派人/业务人主键等效验、联想
func (r *UserRepository) GetByIDAnyInTenant(ctx context.Context, id int64) (*model.User, error) {
	var user model.User
	err := tx.GetDB(ctx, r.db).Scopes(tenant.Scope(ctx)).
		Preload("Roles.Permissions").First(&user, id).Error
	return &user, err
}

// GetByIDForPicker 校验当前用户是否可在业务选人场景选择目标用户。
func (r *UserRepository) GetByIDForPicker(ctx context.Context, id int64) (*model.User, error) {
	var user model.User
	db := tx.GetDB(ctx, r.db).Scopes(tenant.Scope(ctx))
	db = applyBuiltInDeveloperUserVisibility(ctx, db, "id")
	err := db.Preload("Roles.Permissions").First(&user, id).Error
	return &user, err
}

// GetByIDGlobal loads a user by primary key without tenant scoping.
// Used in auth flows (refresh token) where tenant context is not yet available.
func (r *UserRepository) GetByIDGlobal(ctx context.Context, id int64) (*model.User, error) {
	var user model.User
	err := tx.GetDB(ctx, r.db).Preload("Roles.Permissions").First(&user, id).Error
	return &user, err
}

func (r *UserRepository) GetByUsername(ctx context.Context, username string) (*model.User, error) {
	var user model.User
	err := tx.GetDB(ctx, r.db).Scopes(tenant.Scope(ctx)).
		Preload("Roles.Permissions").
		Where("username = ?", username).First(&user).Error
	return &user, err
}

// FindByUsernameOrUniqueName 按用户名精确匹配；未命中时按姓名精确匹配且仅在租户内唯一时返回。
// 证书签名渲染沿用证书编制表单中保存的展示值，历史数据可能存用户名或姓名。
func (r *UserRepository) FindByUsernameOrUniqueName(ctx context.Context, text string) (*model.User, error) {
	text = strings.TrimSpace(text)
	if text == "" {
		return nil, gorm.ErrRecordNotFound
	}

	var user model.User
	db := tx.GetDB(ctx, r.db).Scopes(tenant.Scope(ctx))
	db = applyBuiltInDeveloperUserVisibility(ctx, db, "id")
	err := db.Where("username = ?", text).First(&user).Error
	if err == nil {
		return &user, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	var users []model.User
	if err := db.Where("name = ?", text).Order("updated_at DESC").Limit(10).Find(&users).Error; err != nil {
		return nil, err
	}
	if picked, ok := pickUserByNameForSignature(users); ok {
		return picked, nil
	}
	if len(users) != 1 {
		return nil, gorm.ErrRecordNotFound
	}
	return &users[0], nil
}

// pickUserByNameForSignature 证书签名解析的重名兜底：
// 优先唯一「在职且有签名」→ 唯一「有签名」→ 唯一「在职」→ 唯一命中。
// 若仍不唯一则保持未命中，避免误绑错误签名。
func pickUserByNameForSignature(users []model.User) (*model.User, bool) {
	if len(users) == 1 {
		return &users[0], true
	}
	filter := func(in []model.User, predicate func(model.User) bool) []model.User {
		out := make([]model.User, 0, len(in))
		for _, u := range in {
			if predicate(u) {
				out = append(out, u)
			}
		}
		return out
	}
	hasSignature := func(u model.User) bool {
		return u.SignatureFileID != nil && *u.SignatureFileID > 0
	}
	isActive := func(u model.User) bool {
		return strings.EqualFold(strings.TrimSpace(u.Status), "active")
	}

	if rows := filter(users, func(u model.User) bool { return isActive(u) && hasSignature(u) }); len(rows) == 1 {
		return &rows[0], true
	}
	if rows := filter(users, hasSignature); len(rows) == 1 {
		return &rows[0], true
	}
	if rows := filter(users, isActive); len(rows) == 1 {
		return &rows[0], true
	}
	return nil, false
}

// GetByUsernameAndTenant queries user by username within a specific tenant.
func (r *UserRepository) GetByUsernameAndTenant(ctx context.Context, tenantID int64, username string) (*model.User, error) {
	var user model.User
	err := tx.GetDB(ctx, r.db).
		Preload("Roles.Permissions").
		Where("tenant_id = ? AND username = ?", tenantID, username).First(&user).Error
	return &user, err
}

// ListByUsernameAcrossTenants 按登录名跨租户查询（用于无 tenant_code 登录时解析租户）。
func (r *UserRepository) ListByUsernameAcrossTenants(ctx context.Context, username string) ([]model.User, error) {
	var users []model.User
	err := tx.GetDB(ctx, r.db).
		Preload("Roles.Permissions").
		Where("username = ?", username).
		Find(&users).Error
	return users, err
}

func (r *UserRepository) Update(ctx context.Context, user *model.User) error {
	result := r.writeScopedDB(ctx).
		Where("id = ? AND updated_at = ?", user.ID, user.UpdatedAt).
		Updates(map[string]interface{}{
			"password":          user.Password,
			"name":              user.Name,
			"email":             user.Email,
			"status":            user.Status,
			"signature_file_id": user.SignatureFileID,
			"updated_at":        gorm.Expr("NOW()"),
		})
	return checkOptimisticUpdate(result)
}

func (r *UserRepository) UpdateSignatureFileID(ctx context.Context, userID int64, expectedSignatureFileID *int64, signatureFileID int64) error {
	db := r.writeScopedDB(ctx).Where("id = ?", userID)
	if expectedSignatureFileID != nil && *expectedSignatureFileID > 0 {
		db = db.Where("signature_file_id = ?", *expectedSignatureFileID)
	}
	result := db.
		Updates(map[string]interface{}{
			"signature_file_id": signatureFileID,
			"updated_at":        gorm.Expr("NOW()"),
		})
	return checkOptimisticUpdate(result)
}

func (r *UserRepository) ClearSignatureFileID(ctx context.Context, userID int64, expectedSignatureFileID *int64) error {
	db := r.writeScopedDB(ctx).Where("id = ?", userID)
	if expectedSignatureFileID != nil && *expectedSignatureFileID > 0 {
		db = db.Where("signature_file_id = ?", *expectedSignatureFileID)
	}
	result := db.
		Updates(map[string]interface{}{
			"signature_file_id": nil,
			"updated_at":        gorm.Expr("NOW()"),
		})
	return checkOptimisticUpdate(result)
}

func (r *UserRepository) Delete(ctx context.Context, id int64, updatedAt time.Time) error {
	result := r.writeScopedDB(ctx).Where("id = ? AND updated_at = ?", id, updatedAt).Delete(&model.User{})
	return checkOptimisticUpdate(result)
}

// userListQueryPlain 不应用行级 self，用于证书/流程中「选人」等必须跨用户可见的租户内列表
func (r *UserRepository) userListQueryPlain(ctx context.Context, status, keyword string) *gorm.DB {
	db := tx.GetDB(ctx, r.db).Model(&model.User{}).Scopes(tenant.Scope(ctx))
	db = applyBuiltInDeveloperUserVisibility(ctx, db, "id")
	if s := strings.TrimSpace(status); s != "" {
		db = db.Where("status = ?", s)
	}
	if kw := strings.TrimSpace(keyword); kw != "" {
		pattern := dbutil.WrapLike(kw)
		db = db.Where("(username ILIKE ? OR name ILIKE ? OR COALESCE(email, '') ILIKE ?)", pattern, pattern, pattern)
	}
	return db
}

// userListQuery 构造用户列表筛选链。**勿**在同一 *gorm.DB 上先 Count 再 Find：GORM 在 Count 后可能复用已污染的 Statement，导致 Find 丢失 WHERE（keyword 不生效）。
func (r *UserRepository) userListQuery(ctx context.Context, status, keyword, username, name, email string) *gorm.DB {
	db := ApplySelfUserTable(ctx, tx.GetDB(ctx, r.db).Model(&model.User{}).Scopes(tenant.Scope(ctx)))
	db = applyBuiltInDeveloperUserVisibility(ctx, db, "id")
	if s := strings.TrimSpace(status); s != "" {
		db = db.Where(`status = ? OR CASE status WHEN 'active' THEN '正常' WHEN 'disabled' THEN '禁用' ELSE status END ILIKE ?`, s, dbutil.WrapLike(s))
	}
	if kw := strings.TrimSpace(keyword); kw != "" {
		pattern := dbutil.WrapLike(kw)
		db = db.Where("(username ILIKE ? OR name ILIKE ? OR COALESCE(email, '') ILIKE ?)", pattern, pattern, pattern)
	}
	if v := strings.TrimSpace(username); v != "" {
		db = db.Where("username ILIKE ?", dbutil.WrapLike(v))
	}
	if v := strings.TrimSpace(name); v != "" {
		db = db.Where("name ILIKE ?", dbutil.WrapLike(v))
	}
	if v := strings.TrimSpace(email); v != "" {
		db = db.Where("COALESCE(email, '') ILIKE ?", dbutil.WrapLike(v))
	}
	return db
}

// List 分页；status 非空时按状态精确筛选；keyword 非空时对 username、name、email 模糊匹配（ILIKE）。
func (r *UserRepository) List(ctx context.Context, offset, limit int, status, keyword, username, name, email string) ([]model.User, int64, error) {
	var users []model.User
	var total int64

	// 用户管理列表携带 updated_at 作为后续编辑/签名操作的乐观锁 token，必须读主库避免副本延迟导致假冲突。
	if err := readFromPrimary(r.userListQuery(ctx, status, keyword, username, name, email)).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := readFromPrimary(r.userListQuery(ctx, status, keyword, username, name, email)).
		Preload("Roles").
		Offset(offset).Limit(limit).
		Order("created_at DESC").
		Find(&users).Error
	return users, total, err
}

// CountActiveMembers 统计租户内正常状态成员数（用于联网搜索等按人均分配配额）
func (r *UserRepository) CountActiveMembers(ctx context.Context) (int64, error) {
	var count int64
	err := r.userListQueryPlain(ctx, "active", "").Count(&count).Error
	return count, err
}

// ListForPicker 与 List 相同筛选条件，但不应用行级 self，供证书/流程「选人」等场景
func (r *UserRepository) ListForPicker(ctx context.Context, offset, limit int, status, keyword string) ([]model.User, int64, error) {
	var users []model.User
	var total int64
	if err := r.userListQueryPlain(ctx, status, keyword).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := r.userListQueryPlain(ctx, status, keyword).
		Preload("Roles").
		Offset(offset).Limit(limit).
		Order("created_at DESC").
		Find(&users).Error
	return users, total, err
}

// findEarliestActiveUserIDByRoleColumn 在当前租户内，按 roles 表指定列（"name" 或 "display_name"）
// 精确匹配（display_name 自动 BTRIM 容错前后空白）查询被分配该角色的活跃用户中创建时间最早的主键。
// 当前用户不可见的内置开发者账号被排除。
// 未命中返回 (0, nil)，调用方自行兜底。仅供 By{Name,DisplayName} 两个 helper 复用，禁止外部直接调用。
func (r *UserRepository) findEarliestActiveUserIDByRoleColumn(ctx context.Context, column, value string) (int64, error) {
	val := strings.TrimSpace(value)
	if val == "" {
		return 0, nil
	}
	var roleCond string
	switch column {
	case "name":
		roleCond = "r.name = ?"
	case "display_name":
		roleCond = "BTRIM(r.display_name) = ?"
	default:
		return 0, fmt.Errorf("unsupported role column: %q", column)
	}

	db := tx.GetDB(ctx, r.db).Table("users").Scopes(tenant.ScopeTable(ctx, "users"))
	db = applyBuiltInDeveloperUserVisibility(ctx, db, "users.id")
	db = db.Joins("JOIN user_roles ur ON ur.user_id = users.id").
		Joins("JOIN roles r ON r.id = ur.role_id").
		Where(roleCond, val).
		Where("users.status = ?", "active")

	var ids []int64
	if err := db.Order("users.created_at ASC, users.id ASC").
		Limit(1).
		Pluck("users.id", &ids).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, nil
		}
		return 0, err
	}
	if len(ids) == 0 {
		return 0, nil
	}
	return ids[0], nil
}

// FindEarliestActiveUserIDByRoleName 按角色编码（roles.name）精确匹配；语义与 By 显示名版本对称。
// 未命中返回 (0, nil)，调用方自行兜底。
func (r *UserRepository) FindEarliestActiveUserIDByRoleName(ctx context.Context, roleName string) (int64, error) {
	return r.findEarliestActiveUserIDByRoleColumn(ctx, "name", roleName)
}

// FindEarliestActiveUserIDByRoleDisplayName 按角色显示名（roles.display_name，BTRIM 容错前后空白）精确匹配，
// 用于角色编码未预置但用户在「系统-角色」里以中文文案自建相同语义角色的兜底路径。
// 未命中返回 (0, nil)。
func (r *UserRepository) FindEarliestActiveUserIDByRoleDisplayName(ctx context.Context, displayName string) (int64, error) {
	return r.findEarliestActiveUserIDByRoleColumn(ctx, "display_name", displayName)
}

// ReplaceRoles 替换用户的所有角色
func (r *UserRepository) ReplaceRoles(ctx context.Context, userID int64, roleIDs []int64) error {
	if err := r.ensureWritableUser(ctx, userID); err != nil {
		return err
	}
	db := tx.GetDB(ctx, r.db)

	tid := tenant.IDFromCtx(ctx)
	if tid <= 0 {
		return fmt.Errorf("tenant context required for ReplaceRoles")
	}
	// 仅删除属于本租户用户的 user_roles 行（EXISTS 表明 user_id 在本 tenants 内，语义比 user_id IN 子查询更清晰）
	if err := db.Exec(`
DELETE FROM user_roles ur
WHERE ur.user_id = ?
  AND EXISTS (SELECT 1 FROM users u WHERE u.id = ur.user_id AND u.tenant_id = ?)
`, userID, tid).Error; err != nil {
		return err
	}

	if len(roleIDs) == 0 {
		return nil
	}

	type ur struct {
		UserID int64 `gorm:"column:user_id"`
		RoleID int64 `gorm:"column:role_id"`
	}
	records := make([]ur, len(roleIDs))
	for i, rid := range roleIDs {
		records[i] = ur{UserID: userID, RoleID: rid}
	}
	return db.Table("user_roles").Create(&records).Error
}
