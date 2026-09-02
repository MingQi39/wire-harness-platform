package permutil

import "github.com/hmq/wire-harness-platform/internal/model"

// CodesFromUser 汇总用户所有角色下的权限码（去重，顺序不保证）。
func CodesFromUser(user *model.User) []string {
	if user == nil {
		return nil
	}
	seen := make(map[string]struct{})
	for _, role := range user.Roles {
		for _, p := range role.Permissions {
			seen[p.Code] = struct{}{}
		}
	}
	out := make([]string, 0, len(seen))
	for code := range seen {
		out = append(out, code)
	}
	return out
}
