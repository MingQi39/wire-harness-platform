package roles

var presetDisplayNames = map[string]string{
	"admin":       "系统管理员",
	"lab_manager": "实验室主管",
	"analyst":     "分析员",
	"reviewer":    "审核员",
	"super_admin": "超级管理员",
}

// IsFullAccessRole 与 migrations 中 roles.name 一致：具备与「系统管理员」等价的特权判定（证书编制列表管理员视图、流程代操作等）
func IsFullAccessRole(name string) bool {
	switch name {
	case "admin", "super_admin":
		return true
	default:
		return false
	}
}

// DisplayNameForCode 返回预置角色的中文展示名；自定义角色沿用原编码。
func DisplayNameForCode(code string) string {
	if name, ok := presetDisplayNames[code]; ok {
		return name
	}
	return code
}
