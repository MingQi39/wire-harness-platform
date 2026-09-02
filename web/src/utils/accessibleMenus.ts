import type { MenuConfigItem } from '@/api/types'
import { isDeveloperMenuItemVisible } from '@/constants/developerUser'
import { canAccessByAuth } from '@/utils/permissionAbility'

export type AccessibleMenuOption = {
  key: string
  label: string
}

export function flattenAccessibleMenus(
  items: MenuConfigItem[],
  permissions: readonly string[],
  enabledModules: readonly string[],
  userId: number | null,
  labelFn: (key: string, fallback?: string) => string,
): AccessibleMenuOption[] {
  const result: AccessibleMenuOption[] = []

  function walk(list: MenuConfigItem[]) {
    for (const item of list) {
      if (item.module && !enabledModules.includes(item.module)) continue
      if (item.children && item.children.length > 0) {
        walk(item.children)
        continue
      }
      if (item.developerOnly === true || item.developerUserId != null) {
        if (!isDeveloperMenuItemVisible(userId, item)) continue
      } else if (!canAccessByAuth(permissions, item.auth)) {
        continue
      }
      const label = item.labelKey ? labelFn(item.labelKey, item.label) : item.label
      result.push({ key: item.key, label })
    }
  }

  walk(items)
  return result
}

export function resolveDefaultMenuKey(pathname: string, options: AccessibleMenuOption[]): string {
  if (options.length === 0) return ''
  const matched = options
    .filter((item) => pathname === item.key || (item.key !== '/' && pathname.startsWith(item.key)))
    .sort((a, b) => b.key.length - a.key.length)
  return matched[0]?.key ?? options[0]!.key
}
