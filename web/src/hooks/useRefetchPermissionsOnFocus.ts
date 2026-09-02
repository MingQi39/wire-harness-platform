import { useEffect, useRef } from 'react'
import { userApi } from '@/api/user'
import { useAuthStore } from '@/stores/authStore'

/**
 * PRD 8.2 建议：窗口重新获得焦点时拉取最新权限，减少「后台已改、界面仍旧」。
 */
export function useRefetchPermissionsOnFocus() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  const setPermissions = useAuthStore((s) => s.setPermissions)
  const lastFetchRef = useRef(0)
  const minIntervalMs = 5000

  useEffect(() => {
    if (!isAuthed) return

    const sync = () => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastFetchRef.current < minIntervalMs) return
      lastFetchRef.current = now
      void userApi
        .getCurrentPermissions()
        .then((perms) => {
          if (Array.isArray(perms)) setPermissions(perms)
        })
        .catch(() => {
          /* 无网/未登录时忽略，不踢出会话 */
        })
    }

    const onFocus = () => sync()
    const onVis = () => sync()

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [isAuthed, setPermissions])
}
