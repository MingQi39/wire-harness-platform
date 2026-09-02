package repository

import (
	"context"

	"gorm.io/gorm"
	"gorm.io/plugin/dbresolver"

	"github.com/hmq/wire-harness-platform/internal/pkg/apperror"
	"github.com/hmq/wire-harness-platform/internal/pkg/auth"
	"github.com/hmq/wire-harness-platform/internal/pkg/tenant"
	"github.com/hmq/wire-harness-platform/internal/pkg/tx"
)

var ErrOptimisticLockConflict = apperror.WrapError(apperror.ErrConflict, "数据已被他人更新，请刷新后重试")

// readFromPrimary 用于返回或比较 updated_at 乐观锁 token 的读取路径，避免读写分离副本延迟造成假冲突。
func readFromPrimary(db *gorm.DB) *gorm.DB {
	return db.Clauses(dbresolver.Write)
}

func checkOptimisticUpdate(result *gorm.DB) error {
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrOptimisticLockConflict
	}
	return nil
}

// CreatorGuardOptions 描述「主表 created_by 列」走开发者隔离写作用域的诊断参数。
//
// 该 helper 仅用于 Update/Delete 主表本身（WHERE id=? AND updated_at=? 模式）；
// 子表（如 commission_order_workflows / certificate_modification_records 这种通过 EXISTS
// 关联 commission_orders 做写作用域）请走 service 层 ensureCommissionOrderWritableByCurrentUser
// 等专用前置拦截，本 helper 无法准确诊断 JOIN 后的可写性。
type CreatorGuardOptions struct {
	// Ctx 当前请求/事务 ctx；用于读取租户 / 当前用户身份。
	Ctx context.Context
	// DB 诊断 SELECT 使用的 *gorm.DB 句柄；通常传 repository 内部的 r.db 即可，
	// tx.GetDB 会自动复用 ctx 中的事务连接。
	DB *gorm.DB
	// Table 行所在表名（如 "standards" / "customers"）。
	Table string
	// ID 主键值。
	ID int64
	// ResourceLabel 用户可读的资源中文名（如「标准」「标准仪器」），用于 ErrForbidden 文案。
	ResourceLabel string
	// CreatedByCol 创建人列名，默认 "created_by"。少数表（如 commission_order_business_staff_user_id）
	// 可显式覆盖。
	CreatedByCol string
}

// checkOptimisticUpdateWithCreatorGuard 是 checkOptimisticUpdate 的诊断升级版。
//
// 当 result.RowsAffected == 0 时，通过额外 1 次轻量主键 SELECT 区分以下三种"看起来都像乐观锁"的场景：
//
//  1. 行已不存在 / 已被他人删除 / 跨租户 → 返回 ErrOptimisticLockConflict（保持原行为，文案"数据已被他人更新"）
//  2. 行存在但 created_by 不允许当前用户写（命中内置开发者隔离） → 返回 ErrForbidden + 精确文案
//     （普通用户:「不可修改内置开发者账号创建的 XXX」；dev 本人:「内置开发者账号仅可修改本人创建的 XXX」）
//  3. 行存在且 created_by 允许 → 返回 ErrOptimisticLockConflict（真乐观锁：updated_at 不匹配）
//
// 性能与影响：
//   - 正常路径（RowsAffected>0）零开销。
//   - 错误路径多 1 次 `SELECT created_by FROM <table> WHERE id=? AND tenant_id=?`（命中主键索引，<1ms）。
//   - 仅作为兜底诊断，service 层若已经在 GetByID 后调用 ensureWritableByDeveloperRule 提前拦截，
//     则永远进不到本函数的 RowsAffected==0 分支，性能完全不受影响。
//
// 用法（替换 checkOptimisticUpdate(result)）：
//
//	return checkOptimisticUpdateWithCreatorGuard(result, CreatorGuardOptions{
//	    Ctx: ctx, DB: r.db, Table: "standards", ID: row.ID, ResourceLabel: "标准",
//	})
//
// 该 helper 设计目的：让"假冲突→ErrForbidden"成为公共能力，新增 repo 套用即可自动获得保护，
// 避免每个 service 都手写 ensureWritableByDeveloperRule（重复 + 容易漏）。
func checkOptimisticUpdateWithCreatorGuard(result *gorm.DB, opts CreatorGuardOptions) error {
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected > 0 {
		return nil
	}
	return diagnoseCreatorGuardAfterRowsAffectedZero(opts)
}

// fetchCreatorRowFn 是诊断 SELECT 的可注入函数；单测里替换成内存实现即可不依赖 DB。
// 返回值语义：
//   - createdBy: 行的 created_by 值
//   - found: 行是否存在
//   - err: 真正的 DB 错误（不含「行不存在」；行不存在用 found=false 表达）
type fetchCreatorRowFn func() (createdBy int64, found bool, err error)

func diagnoseCreatorGuardAfterRowsAffectedZero(opts CreatorGuardOptions) error {
	col := opts.CreatedByCol
	if col == "" {
		col = "created_by"
	}
	if opts.Ctx == nil || opts.DB == nil || opts.Table == "" || opts.ID <= 0 {
		// 防御性：缺少诊断必需参数时回退到原乐观锁错误，永不阻塞业务。
		return ErrOptimisticLockConflict
	}
	fetch := func() (int64, bool, error) {
		var holder struct {
			CreatedBy int64 `gorm:"column:created_by"`
		}
		res := readFromPrimary(tx.GetDB(opts.Ctx, opts.DB)).
			Table(opts.Table).
			Scopes(tenant.Scope(opts.Ctx)).
			Select(col + " AS created_by").
			Where("id = ?", opts.ID).
			Limit(1).
			Scan(&holder)
		if res.Error != nil {
			return 0, false, res.Error
		}
		return holder.CreatedBy, res.RowsAffected > 0, nil
	}
	return decideCreatorGuardError(opts.Ctx, fetch, opts.ResourceLabel)
}

// decideCreatorGuardError 把"按 created_by 决定假冲突 / 真冲突"的逻辑剥离成纯函数，
// 方便单测在不依赖 gorm/db 的情况下覆盖三种核心场景：
//   - fetch 报错或行已不存在 → ErrOptimisticLockConflict
//   - 行存在 + 当前用户写权限被开发者隔离规则拒 → ErrForbidden + 文案
//   - 行存在 + 当前用户允许写（updated_at 已被推进）→ ErrOptimisticLockConflict
func decideCreatorGuardError(ctx context.Context, fetch fetchCreatorRowFn, resourceLabel string) error {
	createdBy, found, err := fetch()
	if err != nil || !found {
		return ErrOptimisticLockConflict
	}
	if !allowWriteByBuiltInDeveloperRule(ctx, createdBy) {
		return forbiddenByDeveloperRuleErr(ctx, resourceLabel)
	}
	return ErrOptimisticLockConflict
}

// forbiddenByDeveloperRuleErr 根据当前 ctx 用户身份生成精准的 ErrForbidden 文案。
// 与 service.ensureWritableByDeveloperRule 文案分支保持一致。
//
// 身份判定使用 repository 包内常量 builtInDeveloperUserID（默认 199839）；
// 业务上若通过 LIMS_DEVELOPER_USER_IDS env 配置多账号，本函数仍按 199839 判定文案归属，
// 不影响实际写入策略（写入许可仍以 allowWriteByBuiltInDeveloperRule 为准）。
func forbiddenByDeveloperRuleErr(ctx context.Context, resourceLabel string) error {
	if auth.CurrentUserID(ctx) == builtInDeveloperUserID {
		return apperror.WrapError(apperror.ErrForbidden, "内置开发者账号仅可修改本人创建的"+resourceLabel)
	}
	return apperror.WrapError(apperror.ErrForbidden, "不可修改内置开发者账号创建的"+resourceLabel)
}

// CommissionOrderGuardOptions 描述 commission_orders 主表写操作的诊断参数。
// commission_orders 的开发者隔离规则涉及多维度（created_by / business_staff_user_id /
// 关联 workflow.assignee / 关联 equipment_lines.assignee 等），无法用单列 created_by 诊断；
// 因此提供专用 helper 复用 ApplyCommissionOrderMainTableForWrite 做"可写性回查"。
type CommissionOrderGuardOptions struct {
	Ctx context.Context
	DB  *gorm.DB
	ID  int64
}

// checkOptimisticUpdateWithCommissionOrderGuard 是 checkOptimisticUpdate 的 commission_orders 专用诊断版。
//
// RowsAffected==0 时通过 1 次轻量 SELECT 区分：
//   - 命中 ApplyCommissionOrderMainTableForWrite 后行存在 → 真乐观锁（updated_at 已被推进）→ ErrOptimisticLockConflict
//   - 命中后行不存在 → 可能是真冲突（已被删除）或开发者隔离命中；再查一次"不应用作用域"的全量行：
//     · 全量也查不到 → ErrOptimisticLockConflict（行确实不存在）
//     · 全量查得到 → 命中开发者隔离 → ErrForbidden + 「不可修改委托单」
//
// 性能：正常路径零开销；错误路径最多 2 次主键 SELECT（命中索引，<2ms）。
func checkOptimisticUpdateWithCommissionOrderGuard(result *gorm.DB, opts CommissionOrderGuardOptions) error {
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected > 0 {
		return nil
	}
	return diagnoseCommissionOrderAfterRowsAffectedZero(opts)
}

func diagnoseCommissionOrderAfterRowsAffectedZero(opts CommissionOrderGuardOptions) error {
	if opts.Ctx == nil || opts.DB == nil || opts.ID <= 0 {
		return ErrOptimisticLockConflict
	}
	db := readFromPrimary(tx.GetDB(opts.Ctx, opts.DB))
	type idHolder struct {
		ID int64
	}

	// 1) 应用与写路径完全一致的开发者隔离作用域，看是否能查到行：
	//    能查到 → 当前用户允许写 → RowsAffected==0 必为 updated_at 不匹配 = 真乐观锁
	var writable idHolder
	q := ApplyCommissionOrderMainTableForWrite(opts.Ctx, db.Table("commission_orders").Scopes(tenant.Scope(opts.Ctx)))
	resWritable := q.Select("id").Where("id = ?", opts.ID).Limit(1).Scan(&writable)
	if resWritable.Error == nil && resWritable.RowsAffected > 0 {
		return ErrOptimisticLockConflict
	}

	// 2) 不带写作用域再查一次（确认行是否本身存在）：
	//    查不到 → 跨租户 / 已被他人物理删除 → 沿用乐观锁文案
	var anyRow idHolder
	resAny := db.Table("commission_orders").Scopes(tenant.Scope(opts.Ctx)).
		Select("id").Where("id = ?", opts.ID).Limit(1).Scan(&anyRow)
	if resAny.Error != nil || resAny.RowsAffected == 0 {
		return ErrOptimisticLockConflict
	}

	// 3) 行真实存在 + 写作用域查不到 → 一定是开发者隔离命中
	return forbiddenByDeveloperRuleErr(opts.Ctx, "委托单")
}
