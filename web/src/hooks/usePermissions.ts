import { useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { can, canAccessByAuth, hasAllPermissions, hasAnyPermission } from '@/utils/permissionAbility'

/**
 * 全局权限码封装，供页内/按钮与菜单过滤复用（PRD 12：前端权限统一封装）。
 */
export function usePermissions() {
  const list = useAuthStore((s) => s.permissions)

  return useMemo(
    () => ({
      list,
      /** 单码或显式多码 + mode */
      can: (code: string | string[], mode?: 'any' | 'all') => can(list, code, mode ?? 'any'),
      hasAny: (codes: string[]) => hasAnyPermission(list, codes),
      hasAll: (codes: string[]) => hasAllPermissions(list, codes),
      /** 与侧栏 `auth` 规则一致 */
      canAccessByAuth: (auth: string | string[] | undefined) => canAccessByAuth(list, auth),
    }),
    [list],
  )
}
