package permutil

import "strings"

const TaskReadCode = "task:read"

// IsHiddenFromRolePermissionTree 不在「角色功能权限」配置树中展示，由导出/证书编制等能力隐含。
func IsHiddenFromRolePermissionTree(permCode string) bool {
	return permCode == TaskReadCode
}

// PermissionCodesImplyTaskRead 拥有批量导出或证书编制等相关权限时，视同具备异步任务状态查询能力。
func PermissionCodesImplyTaskRead(codes []string) bool {
	for _, c := range codes {
		if strings.HasSuffix(c, ":export") ||
			strings.HasSuffix(c, "_export") ||
			strings.HasSuffix(c, ":print") ||
			strings.HasSuffix(c, "_print") {
			return true
		}
		switch c {
		case "cert_report:prepare",
			"cert_report:review",
			"cert_report:approve",
			"cert_report:print_export",
			"cert_report:original_record_print_export",
			"cert_report:workflow_timeline":
			return true
		}
	}
	return false
}
