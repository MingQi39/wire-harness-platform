package repository

import (
	"context"

	"gorm.io/gorm"

	"github.com/hmq/wire-harness-platform/internal/pkg/auth"
)

func currentUserIsBuiltInDeveloper(ctx context.Context) bool {
	return auth.CurrentUserID(ctx) == builtInDeveloperUserID
}

func applyBuiltInDeveloperUserWriteScope(ctx context.Context, db *gorm.DB, col string) *gorm.DB {
	uid := auth.CurrentUserID(ctx)
	if uid == 0 {
		// Worker/系统上下文不受该账号隔离策略影响，避免后台任务误伤。
		return db
	}
	if uid == builtInDeveloperUserID {
		return db.Where(col+" = ?", builtInDeveloperUserID)
	}
	return db.Where(col+" <> ?", builtInDeveloperUserID)
}

// applyBuiltInDeveloperUserVisibility 读路径可见性过滤：
//   - 内置开发者本人 → 完整可见；
//   - 普通用户 → 排除 created_by=内置开发者 的行；
//   - Worker / 系统上下文（uid=0）→ 直通，与 applyBuiltInDeveloperUserWriteScope 对称。
//
// 关于 uid=0 直通：避免后台任务（如证书 PDF 自动预热）以系统身份调用 ListByIDs 时，
// 把内置开发者创建的标准/主数据误过滤掉，渲染出与「在线用户视角」不一致的内容。
// 实际 HTTP 请求路径均经过权限中间件，uid 必然 >0，不会受此分支影响。
func applyBuiltInDeveloperUserVisibility(ctx context.Context, db *gorm.DB, col string) *gorm.DB {
	uid := auth.CurrentUserID(ctx)
	if uid == 0 {
		return db
	}
	if uid == builtInDeveloperUserID {
		return db
	}
	return db.Where(col+" <> ?", builtInDeveloperUserID)
}

func allowWriteByBuiltInDeveloperRule(ctx context.Context, ownerID int64) bool {
	uid := auth.CurrentUserID(ctx)
	if uid == 0 {
		return true
	}
	if uid == builtInDeveloperUserID {
		return ownerID == builtInDeveloperUserID
	}
	return ownerID != builtInDeveloperUserID
}

func AllowWriteByBuiltInDeveloperRule(ctx context.Context, ownerID int64) bool {
	return allowWriteByBuiltInDeveloperRule(ctx, ownerID)
}

func builtInDeveloperUserIDSQLArgs() []interface{} {
	args := make([]interface{}, 14)
	for i := range args {
		args[i] = builtInDeveloperUserID
	}
	return args
}

// ExcludeBuiltInDeveloperCommissionOrdersTable 效能看板统计：始终排除内置开发者关联委托单（主表 commission_orders）。
func ExcludeBuiltInDeveloperCommissionOrdersTable(db *gorm.DB) *gorm.DB {
	return db.Where("NOT "+sqlCommissionOrderBuiltInDeveloperByTable(), builtInDeveloperUserIDSQLArgs()...)
}

// ExcludeBuiltInDeveloperCommissionOrdersCo 效能看板统计：始终排除内置开发者关联委托单（已 JOIN co 别名）。
func ExcludeBuiltInDeveloperCommissionOrdersCo(db *gorm.DB) *gorm.DB {
	return db.Where("NOT "+sqlCommissionOrderBuiltInDeveloperByAlias(), builtInDeveloperUserIDSQLArgs()...)
}

// ExcludeBuiltInDeveloperUserColumn 效能看板统计：排除指定列等于内置开发者 user_id 的行。
func ExcludeBuiltInDeveloperUserColumn(db *gorm.DB, col string) *gorm.DB {
	return db.Where(col+" <> ?", builtInDeveloperUserID)
}

func sqlCommissionOrderBuiltInDeveloperByAlias() string {
	return `(
  co.created_by = ? OR co.business_staff_user_id = ?
  OR EXISTS (
    SELECT 1 FROM commission_order_workflows cow_dev
    WHERE cow_dev.commission_order_id = co.id
      AND cow_dev.tenant_id = co.tenant_id
      AND (
        cow_dev.current_assignee_user_id = ?
        OR cow_dev.first_round_completed_by = ?
        OR cow_dev.second_assignee_user_id = ?
      )
  )
  OR EXISTS (
    SELECT 1 FROM commission_order_equipment_lines cel_dev
    WHERE cel_dev.commission_order_id = co.id
      AND cel_dev.tenant_id = co.tenant_id
      AND cel_dev.assignment_status = 'done'
      AND cel_dev.assignee_user_id = ?
  )
  OR EXISTS (
    SELECT 1 FROM commission_order_workflow_events cowe_dev
    INNER JOIN commission_order_workflows cow_event_dev
      ON cow_event_dev.id = cowe_dev.workflow_id
      AND cow_event_dev.tenant_id = cowe_dev.tenant_id
    WHERE cow_event_dev.commission_order_id = co.id
      AND cow_event_dev.tenant_id = co.tenant_id
      AND (cowe_dev.actor_user_id = ? OR cowe_dev.assignee_user_id = ?)
  )
  OR EXISTS (
    SELECT 1 FROM certificate_prepare_workflows cpw_dev
    WHERE cpw_dev.commission_order_id = co.id
      AND cpw_dev.tenant_id = co.tenant_id
      AND (
        cpw_dev.current_assignee_user_id = ?
        OR cpw_dev.preparer_user_id = ?
        OR cpw_dev.reviewer_user_id = ?
        OR cpw_dev.approver_user_id = ?
      )
  )
  OR EXISTS (
    SELECT 1 FROM certificate_prepare_workflow_events cpwe_dev
    INNER JOIN certificate_prepare_workflows cpw_event_dev
      ON cpw_event_dev.id = cpwe_dev.workflow_id
      AND cpw_event_dev.tenant_id = cpwe_dev.tenant_id
    WHERE cpw_event_dev.commission_order_id = co.id
      AND cpw_event_dev.tenant_id = co.tenant_id
      AND (cpwe_dev.actor_user_id = ? OR cpwe_dev.assignee_user_id = ?)
  )
)`
}

func sqlCommissionOrderBuiltInDeveloperByTable() string {
	return `(
  commission_orders.created_by = ? OR commission_orders.business_staff_user_id = ?
  OR EXISTS (
    SELECT 1 FROM commission_order_workflows cow_dev
    WHERE cow_dev.commission_order_id = commission_orders.id
      AND cow_dev.tenant_id = commission_orders.tenant_id
      AND (
        cow_dev.current_assignee_user_id = ?
        OR cow_dev.first_round_completed_by = ?
        OR cow_dev.second_assignee_user_id = ?
      )
  )
  OR EXISTS (
    SELECT 1 FROM commission_order_equipment_lines cel_dev
    WHERE cel_dev.commission_order_id = commission_orders.id
      AND cel_dev.tenant_id = commission_orders.tenant_id
      AND cel_dev.assignment_status = 'done'
      AND cel_dev.assignee_user_id = ?
  )
  OR EXISTS (
    SELECT 1 FROM commission_order_workflow_events cowe_dev
    INNER JOIN commission_order_workflows cow_event_dev
      ON cow_event_dev.id = cowe_dev.workflow_id
      AND cow_event_dev.tenant_id = cowe_dev.tenant_id
    WHERE cow_event_dev.commission_order_id = commission_orders.id
      AND cow_event_dev.tenant_id = commission_orders.tenant_id
      AND (cowe_dev.actor_user_id = ? OR cowe_dev.assignee_user_id = ?)
  )
  OR EXISTS (
    SELECT 1 FROM certificate_prepare_workflows cpw_dev
    WHERE cpw_dev.commission_order_id = commission_orders.id
      AND cpw_dev.tenant_id = commission_orders.tenant_id
      AND (
        cpw_dev.current_assignee_user_id = ?
        OR cpw_dev.preparer_user_id = ?
        OR cpw_dev.reviewer_user_id = ?
        OR cpw_dev.approver_user_id = ?
      )
  )
  OR EXISTS (
    SELECT 1 FROM certificate_prepare_workflow_events cpwe_dev
    INNER JOIN certificate_prepare_workflows cpw_event_dev
      ON cpw_event_dev.id = cpwe_dev.workflow_id
      AND cpw_event_dev.tenant_id = cpwe_dev.tenant_id
    WHERE cpw_event_dev.commission_order_id = commission_orders.id
      AND cpw_event_dev.tenant_id = commission_orders.tenant_id
      AND (cpwe_dev.actor_user_id = ? OR cpwe_dev.assignee_user_id = ?)
  )
)`
}

// applyBuiltInDeveloperCommissionOrderCoVisibility 读路径（已 JOIN co、cow 等的子查询）。
// uid=0（worker/系统上下文）→ 直通；与 applyBuiltInDeveloperCommissionOrderCoWriteScope 对称，
// 避免后台任务（PDF 预热、迁移、批处理脚本）无法加载内置开发者创建的委托单。
func applyBuiltInDeveloperCommissionOrderCoVisibility(ctx context.Context, db *gorm.DB) *gorm.DB {
	uid := auth.CurrentUserID(ctx)
	if uid == 0 {
		return db
	}
	if uid == builtInDeveloperUserID {
		return db
	}
	return db.Where("NOT "+sqlCommissionOrderBuiltInDeveloperByAlias(), builtInDeveloperUserIDSQLArgs()...)
}

func applyBuiltInDeveloperCommissionOrderCoWriteScope(ctx context.Context, db *gorm.DB) *gorm.DB {
	uid := auth.CurrentUserID(ctx)
	if uid == 0 {
		return db
	}
	if uid == builtInDeveloperUserID {
		return db.Where("co.created_by = ?", builtInDeveloperUserID)
	}
	return db.Where("NOT "+sqlCommissionOrderBuiltInDeveloperByAlias(), builtInDeveloperUserIDSQLArgs()...)
}

// applyBuiltInDeveloperCommissionOrderTableVisibility 读路径（主表为 commission_orders）。
// uid=0 → 直通；与 applyBuiltInDeveloperCommissionOrderTableWriteScope 对称。
// worker 自动预热的 coRepo.GetByIDFromPrimary 走该作用域，加 uid=0 旁路保证 dev 触发的预热能加载到 order。
func applyBuiltInDeveloperCommissionOrderTableVisibility(ctx context.Context, db *gorm.DB) *gorm.DB {
	uid := auth.CurrentUserID(ctx)
	if uid == 0 {
		return db
	}
	if uid == builtInDeveloperUserID {
		return db
	}
	return db.Where("NOT "+sqlCommissionOrderBuiltInDeveloperByTable(), builtInDeveloperUserIDSQLArgs()...)
}

func applyBuiltInDeveloperCommissionOrderTableWriteScope(ctx context.Context, db *gorm.DB) *gorm.DB {
	uid := auth.CurrentUserID(ctx)
	if uid == 0 {
		return db
	}
	if uid == builtInDeveloperUserID {
		return db.Where("commission_orders.created_by = ?", builtInDeveloperUserID)
	}
	return db.Where("NOT "+sqlCommissionOrderBuiltInDeveloperByTable(), builtInDeveloperUserIDSQLArgs()...)
}
