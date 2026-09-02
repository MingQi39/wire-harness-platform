package service

import (
	"context"

	"github.com/hmq/wire-harness-platform/internal/model"
	"github.com/hmq/wire-harness-platform/internal/pkg/permutil"
	"github.com/hmq/wire-harness-platform/internal/repository"
)

// effectivePermissionCodes 返回用户的有效权限码，完全由 role_permissions 表决定。
// admin/super_admin 的"全权限"通过 migration 预分配所有权限码实现，不再依赖角色名硬编码绕过。
func effectivePermissionCodes(ctx context.Context, user *model.User, permRepo *repository.PermissionRepository) ([]string, error) {
	return permutil.CodesFromUser(user), nil
}
