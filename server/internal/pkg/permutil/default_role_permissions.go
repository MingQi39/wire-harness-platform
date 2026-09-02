package permutil

// DefaultRolePermissionCodes 新建角色时自动授予的「登录后公共能力」权限码。
// 前四项在权限配置页置顶展示；task:read 不在配置树中展示，但须写入 role_permissions。
var defaultRolePermissionCodes = []string{
	"file:upload",
	"file:download",
	"notification:read",
	"task:read",
	"ai_assistant:use",
}

// DefaultRoleVisiblePermissionCodes 在角色功能权限配置页可见的默认公共权限（不含 task:read）。
func DefaultRoleVisiblePermissionCodes() []string {
	out := make([]string, 0, len(defaultRolePermissionCodes))
	for _, code := range defaultRolePermissionCodes {
		if !IsHiddenFromRolePermissionTree(code) {
			out = append(out, code)
		}
	}
	return out
}

// DefaultRolePermissionCodes 返回副本，避免外部修改内部列表。
func DefaultRolePermissionCodes() []string {
	out := make([]string, len(defaultRolePermissionCodes))
	copy(out, defaultRolePermissionCodes)
	return out
}
