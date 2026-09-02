/**
 * 镜像后端内置开发者数据隔离规则（详见 cursor rule、`pkg/permutil/developer.go`、
 * `repository/developer_visibility.go`），用于前端 UI 防呆判断「当前用户能否写该行数据」。
 *
 * 后端规则（简化版，忽略 worker/系统上下文 uid=0）：
 *   - 当前用户是内置开发者（默认 user_id=199839）：仅可写 `created_by === 199839` 的数据；
 *   - 其它用户：不可写 `created_by === 199839` 的数据。
 *
 * 注意：常量 199839 与 lims-server 默认值一致，如果通过 env `LIMS_DEVELOPER_USER_IDS`
 * 修改过名单，本前端常量不会同步。出现差异时仅影响 UI 提示是否准确，最终写入许可仍以
 * 后端 403 拒绝为准（用户重试时会看到「仅可修改本人创建的…」明确文案）。
 */

const BUILT_IN_DEVELOPER_USER_ID = 199839

/** 判断 userId 是否属于内置开发者白名单 */
export function isBuiltInDeveloperUser(userId: number | null | undefined): boolean {
  return userId === BUILT_IN_DEVELOPER_USER_ID
}

/**
 * 判断当前用户是否可写「ownerId 所拥有的数据」。
 *
 * - currentUserId 为空（未登录）→ 不可写（统一禁用，避免误展示「可编辑」）；
 * - 其余按后端 `AllowWriteByBuiltInDeveloperRule` 规则镜像。
 */
export function canWriteByDeveloperRule(
  currentUserId: number | null | undefined,
  ownerId: number | null | undefined,
): boolean {
  if (currentUserId == null) return false
  if (ownerId == null) return true
  if (isBuiltInDeveloperUser(currentUserId)) {
    return isBuiltInDeveloperUser(ownerId)
  }
  return !isBuiltInDeveloperUser(ownerId)
}

/**
 * 当 {@link canWriteByDeveloperRule} 返回 false 时给出与后端 ErrForbidden 文案一致的提示，
 * 便于 UI 在 disabled 按钮的 tooltip 上展示统一说明。
 */
export function developerDataIsolationReadOnlyTip(
  currentUserId: number | null | undefined,
  ownerId: number | null | undefined,
): string {
  if (isBuiltInDeveloperUser(currentUserId)) {
    return '内置开发者账号仅可修改本人创建的数据'
  }
  if (isBuiltInDeveloperUser(ownerId)) {
    return '该数据由内置开发者账号创建，仅其本人可修改'
  }
  return '当前账号无修改权限'
}
