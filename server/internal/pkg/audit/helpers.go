package audit

import (
	"context"
	"strings"

	"github.com/hmq/wire-harness-platform/internal/pkg/auth"
	"github.com/hmq/wire-harness-platform/internal/pkg/requestmeta"
)

var menuNameByModule = map[string]string{
	"customer":            "客户管理",
	"lab_location":        "实验室位置",
	"company_info":        "公司信息管理",
	"standard":            "标准管理",
	"std_instrument":      "标准仪器管理",
	"std_material":        "标准物质管理",
	"asset_stock_record":  "设备出入库记录",
	"commission":          "委托单管理",
	"cert_report":         "证书报告管理",
	"cert_cover_tpl":      "证书封面&说明页模板",
	"original_record_tpl": "原始记录/证书内页模板",
	"user":                "用户管理",
	"role":                "角色管理",
	"audit":               "审计日志",
	"tool_log":            "工具日志",
	"config":              "系统配置",
	"report_extract":      "检测报告提取",
	"notification":        "通知中心",
	"file":                "文件管理",
	"task":                "异步任务",
	"ai_assistant":        "AI 助手",
}

var buttonNameByPermissionAction = map[string]string{
	"create":                       "新建",
	"edit":                         "编辑",
	"delete":                       "删除",
	"read":                         "查看",
	"import":                       "导入",
	"export":                       "导出",
	"upload":                       "上传",
	"download":                     "下载",
	"workflow":                     "流程处理",
	"set_permissions":              "配置权限",
	"set_roles":                    "配置角色",
	"set_status":                   "修改状态",
	"reset_password":               "重置密码",
	"stock_out":                    "出库",
	"stock_in":                     "入库",
	"prepare":                      "证书编制",
	"prepare_edit":                 "证书报告修改",
	"review":                       "证书审核",
	"approve":                      "证书批准",
	"print":                        "打印",
	"print_export":                 "打印/导出",
	"original_record_print":        "打印原始记录",
	"original_record_export":       "导出原始记录",
	"original_record_print_export": "原始记录打印/导出",
	"use":                          "使用工具",
}

var buttonNameByAuditAction = map[string]string{
	"CREATE":          "新建",
	"UPDATE":          "编辑",
	"DELETE":          "删除",
	"SET_PERMISSIONS": "配置权限",
	"SET_ROLES":       "配置角色",
	"SET_STATUS":      "修改状态",
	"CHANGE_PASSWORD": "修改密码",
	"PREVIEW":         "预览提取",
	"GENERATE":        "生成报告",
	"LOGIN":           "登录",
	"LOGOUT":          "退出登录",
	"CERT_PREPARE_TEMPLATE_FILE_SNAPSHOT": "锁定模版文件快照",
}

var buttonNameByMethod = map[string]string{
	"POST":   "提交",
	"PUT":    "更新",
	"PATCH":  "更新",
	"DELETE": "删除",
	"GET":    "查询",
}

// NewRecord 创建审计记录，自动从 ctx 填充 UserID 和 UserName。
func NewRecord(ctx context.Context, action, resourceType string, resourceID int64) Record {
	meta := requestmeta.From(ctx)
	menuName, buttonName := inferMenuAndButton(meta.PermissionCode, action, meta.APIMethod)
	return Record{
		UserID:         auth.CurrentUserID(ctx),
		UserName:       auth.CurrentUserName(ctx),
		Action:         action,
		ResourceType:   resourceType,
		ResourceID:     resourceID,
		IPAddr:         meta.IPAddr,
		UserAgent:      meta.UserAgent,
		MenuName:       menuName,
		ButtonName:     buttonName,
		APIMethod:      strings.ToUpper(strings.TrimSpace(meta.APIMethod)),
		APIPath:        strings.TrimSpace(meta.APIPath),
		PermissionCode: strings.TrimSpace(meta.PermissionCode),
	}
}

func inferMenuAndButton(permissionCode, action, method string) (string, string) {
	code := strings.TrimSpace(permissionCode)
	if code == "" {
		return "", fallbackButtonName(action, method)
	}
	module := code
	op := ""
	if idx := strings.Index(code, ":"); idx >= 0 {
		module = code[:idx]
		op = code[idx+1:]
	}

	menuName := menuNameByModule[module]
	if menuName == "" {
		menuName = module
	}

	buttonName := buttonNameByPermissionAction[op]
	if buttonName == "" {
		buttonName = fallbackButtonName(action, method)
	}
	if buttonName == "" {
		buttonName = code
	}
	return menuName, buttonName
}

func fallbackButtonName(action, method string) string {
	if name := buttonNameByAuditAction[strings.TrimSpace(action)]; name != "" {
		return name
	}
	return buttonNameByMethod[strings.ToUpper(strings.TrimSpace(method))]
}

// WithBefore 设置变更前数据（链式调用）
func (r Record) WithBefore(before interface{}) Record {
	r.Before = before
	return r
}

// WithAfter 设置变更后数据（链式调用）
func (r Record) WithAfter(after interface{}) Record {
	r.After = after
	return r
}

// WithRemark 设置备注（链式调用）
func (r Record) WithRemark(remark string) Record {
	r.Remark = remark
	return r
}
