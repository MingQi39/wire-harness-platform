package repository

import (
	"context"

	"gorm.io/gorm"

	"github.com/hmq/wire-harness-platform/internal/pkg/auth"
)

// ApplyCommissionOrderMainTable 主表为 commission_orders 时，仅保留内置开发者可见性过滤。
func ApplyCommissionOrderMainTable(ctx context.Context, db *gorm.DB) *gorm.DB {
	return applyBuiltInDeveloperCommissionOrderTableVisibility(ctx, db)
}

// ApplyCommissionOrderMainTableForWrite 主表为 commission_orders 的写路径作用域。
func ApplyCommissionOrderMainTableForWrite(ctx context.Context, db *gorm.DB) *gorm.DB {
	return applyBuiltInDeveloperCommissionOrderTableWriteScope(ctx, db)
}

// ApplyCommissionOrderCoInListQuery 委托单列表（已 JOIN co、cow）仅保留内置开发者可见性过滤。
func ApplyCommissionOrderCoInListQuery(ctx context.Context, db *gorm.DB) *gorm.DB {
	return applyBuiltInDeveloperCommissionOrderCoVisibility(ctx, db)
}

// ApplyCommissionOrderCoInListQueryForWrite 别名 co 指向 commission_orders 的写路径作用域。
// 当前仓库内无外部调用方，与 read 版本（ApplyCommissionOrderCoInListQuery）对称保留，
// 用于「列表 JOIN 后批量写入 / DELETE」等场景，避免调用方手抖直接调底层的
// applyBuiltInDeveloperCommissionOrderCoWriteScope 时拼错作用域。
func ApplyCommissionOrderCoInListQueryForWrite(ctx context.Context, db *gorm.DB) *gorm.DB {
	return applyBuiltInDeveloperCommissionOrderCoWriteScope(ctx, db)
}

// ApplyCommissionOrderOnlyCo 查询已含别名 co 指向 commission_orders 时，仅保留内置开发者可见性过滤。
func ApplyCommissionOrderOnlyCo(ctx context.Context, db *gorm.DB) *gorm.DB {
	return applyBuiltInDeveloperCommissionOrderCoVisibility(ctx, db)
}

// ApplyCommissionOrderOnlyCoForWrite 查询已含别名 co 指向 commission_orders 的写路径作用域。
// 同上：与 read 版本对称保留；当前无外部调用方，预留给未来「仅别名 co 上下文批量写入」场景。
func ApplyCommissionOrderOnlyCoForWrite(ctx context.Context, db *gorm.DB) *gorm.DB {
	return applyBuiltInDeveloperCommissionOrderCoWriteScope(ctx, db)
}

// WhereExistsCommissionOrderForChild 子表有 commission_order_id、tenant_id 时，过滤内置开发者专用委托单。
// uid=0（worker/系统上下文）→ 直通，与 WhereWritableCommissionOrderForChild 对称。
func WhereExistsCommissionOrderForChild(ctx context.Context, db *gorm.DB, childTable, commissionIDCol, tenantIDCol string) *gorm.DB {
	if auth.CurrentUserID(ctx) == 0 {
		return db
	}
	if currentUserIsBuiltInDeveloper(ctx) {
		return db
	}
	return db.Where(
		`EXISTS (SELECT 1 FROM commission_orders co
WHERE co.id = `+childTable+`.`+commissionIDCol+`
  AND co.tenant_id = `+childTable+`.`+tenantIDCol+`
  AND NOT `+sqlCommissionOrderBuiltInDeveloperByAlias()+` )`,
		builtInDeveloperUserIDSQLArgs()...,
	)
}

// WhereWritableCommissionOrderForChild 子表写路径：内置开发者仅允许修改自己创建的委托单下属数据。
func WhereWritableCommissionOrderForChild(ctx context.Context, db *gorm.DB, childTable, commissionIDCol, tenantIDCol string) *gorm.DB {
	if auth.CurrentUserID(ctx) == 0 {
		return db
	}
	if currentUserIsBuiltInDeveloper(ctx) {
		return db.Where(
			`EXISTS (SELECT 1 FROM commission_orders co
WHERE co.id = `+childTable+`.`+commissionIDCol+`
  AND co.tenant_id = `+childTable+`.`+tenantIDCol+`
  AND co.created_by = ? )`,
			builtInDeveloperUserID,
		)
	}
	return db.Where(
		`EXISTS (SELECT 1 FROM commission_orders co
WHERE co.id = `+childTable+`.`+commissionIDCol+`
  AND co.tenant_id = `+childTable+`.`+tenantIDCol+`
  AND NOT `+sqlCommissionOrderBuiltInDeveloperByAlias()+` )`,
		builtInDeveloperUserIDSQLArgs()...,
	)
}

// WhereEventUnderCommissionOrderWorkflow 事件表有 workflow_id 关联 commission_order_workflows.id。
// uid=0 → 直通，与 WhereWritableEventUnderCommissionOrderWorkflow 对称。
func WhereEventUnderCommissionOrderWorkflow(ctx context.Context, db *gorm.DB, eventTable, workflowIDCol string) *gorm.DB {
	if auth.CurrentUserID(ctx) == 0 {
		return db
	}
	if currentUserIsBuiltInDeveloper(ctx) {
		return db
	}
	return db.Where(
		`EXISTS (SELECT 1 FROM commission_order_workflows wf
INNER JOIN commission_orders co ON co.id = wf.commission_order_id AND co.tenant_id = wf.tenant_id
WHERE wf.id = `+eventTable+`.`+workflowIDCol+`
  AND NOT `+sqlCommissionOrderBuiltInDeveloperByAlias()+` )`,
		builtInDeveloperUserIDSQLArgs()...,
	)
}

// WhereWritableEventUnderCommissionOrderWorkflow 委托单流程事件写路径作用域。
func WhereWritableEventUnderCommissionOrderWorkflow(ctx context.Context, db *gorm.DB, eventTable, workflowIDCol string) *gorm.DB {
	if auth.CurrentUserID(ctx) == 0 {
		return db
	}
	if currentUserIsBuiltInDeveloper(ctx) {
		return db.Where(
			`EXISTS (SELECT 1 FROM commission_order_workflows wf
INNER JOIN commission_orders co ON co.id = wf.commission_order_id AND co.tenant_id = wf.tenant_id
WHERE wf.id = `+eventTable+`.`+workflowIDCol+`
  AND co.created_by = ? )`,
			builtInDeveloperUserID,
		)
	}
	return db.Where(
		`EXISTS (SELECT 1 FROM commission_order_workflows wf
INNER JOIN commission_orders co ON co.id = wf.commission_order_id AND co.tenant_id = wf.tenant_id
WHERE wf.id = `+eventTable+`.`+workflowIDCol+`
  AND NOT `+sqlCommissionOrderBuiltInDeveloperByAlias()+` )`,
		builtInDeveloperUserIDSQLArgs()...,
	)
}

// WhereEventUnderCertificatePrepareWorkflow 证书编制事件表 workflow_id 关联 certificate_prepare_workflows.id。
// uid=0 → 直通，与 WhereWritableEventUnderCertificatePrepareWorkflow 对称。
func WhereEventUnderCertificatePrepareWorkflow(ctx context.Context, db *gorm.DB, eventTable, workflowIDCol string) *gorm.DB {
	if auth.CurrentUserID(ctx) == 0 {
		return db
	}
	if currentUserIsBuiltInDeveloper(ctx) {
		return db
	}
	return db.Where(
		`EXISTS (SELECT 1 FROM certificate_prepare_workflows cpw
INNER JOIN commission_orders co ON co.id = cpw.commission_order_id AND co.tenant_id = cpw.tenant_id
WHERE cpw.id = `+eventTable+`.`+workflowIDCol+`
  AND NOT `+sqlCommissionOrderBuiltInDeveloperByAlias()+` )`,
		builtInDeveloperUserIDSQLArgs()...,
	)
}

// WhereWritableEventUnderCertificatePrepareWorkflow 证书编制事件写路径作用域。
func WhereWritableEventUnderCertificatePrepareWorkflow(ctx context.Context, db *gorm.DB, eventTable, workflowIDCol string) *gorm.DB {
	if auth.CurrentUserID(ctx) == 0 {
		return db
	}
	if currentUserIsBuiltInDeveloper(ctx) {
		return db.Where(
			`EXISTS (SELECT 1 FROM certificate_prepare_workflows cpw
INNER JOIN commission_orders co ON co.id = cpw.commission_order_id AND co.tenant_id = cpw.tenant_id
WHERE cpw.id = `+eventTable+`.`+workflowIDCol+`
  AND co.created_by = ? )`,
			builtInDeveloperUserID,
		)
	}
	return db.Where(
		`EXISTS (SELECT 1 FROM certificate_prepare_workflows cpw
INNER JOIN commission_orders co ON co.id = cpw.commission_order_id AND co.tenant_id = cpw.tenant_id
WHERE cpw.id = `+eventTable+`.`+workflowIDCol+`
  AND NOT `+sqlCommissionOrderBuiltInDeveloperByAlias()+` )`,
		builtInDeveloperUserIDSQLArgs()...,
	)
}
