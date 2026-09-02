/**
 * 与 PRD 一致：以当前用户有效权限码集合判断，不依赖角色名写死。
 * 菜单/路由的「多码任一则可见」在 {@link canAccessByAuth} 中统一处理。
 */

export function hasAllPermissions(permissions: readonly string[], codes: readonly string[]): boolean {
  return codes.length > 0 && codes.every((c) => permissions.includes(c))
}

export function hasAnyPermission(permissions: readonly string[], codes: readonly string[]): boolean {
  return codes.some((c) => permissions.includes(c))
}

/**
 * 功能权限：单码或同组多码（any / all 由 mode 决定）。
 * 与 `<Permission mode="any"|"all">` 及路由守卫语义一致。
 */
export function can(
  permissions: readonly string[],
  auth: string | readonly string[],
  mode: 'any' | 'all' = 'any',
): boolean {
  const list = Array.isArray(auth) ? auth : [auth]
  if (list.length === 0) return true
  return mode === 'any' ? hasAnyPermission(permissions, list) : hasAllPermissions(permissions, list)
}

/**
 * 侧栏/菜单项：无 auth 则始终展示；`string` 需包含该码；`string[]` 为**任一则可见**（OR）。
 */
export function canAccessByAuth(permissions: readonly string[], auth: string | readonly string[] | undefined): boolean {
  if (auth == null) return true
  return can(permissions, auth, 'any')
}
