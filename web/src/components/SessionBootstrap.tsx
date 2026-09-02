import { useEffect, useState, type ReactNode } from 'react'
import { refreshAccessToken } from '@/api/client'
import { PageLoading } from '@/components/PageLoading'
import { useAuthStore } from '@/stores/authStore'
import { applyRefreshSession } from '@/utils/authSession'

function hasPersistedSessionHint() {
  const state = useAuthStore.getState()
  return Boolean(
    state.accessToken ||
      state.userId ||
      state.userName ||
      state.tenantId ||
      state.permissions.length > 0,
  )
}

interface SessionBootstrapProps {
  children: ReactNode
}

export function SessionBootstrap({ children }: SessionBootstrapProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const finish = () => {
      if (!cancelled) setReady(true)
    }

    const bootstrap = async () => {
      await Promise.resolve(useAuthStore.persist.rehydrate())
      if (cancelled) return

      const { accessToken, isAuthenticated } = useAuthStore.getState()
      if (accessToken && isAuthenticated) {
        finish()
        return
      }

      if (!hasPersistedSessionHint()) {
        finish()
        return
      }

      try {
        const data = await refreshAccessToken()
        if (data) applyRefreshSession(data)
      } catch {
        useAuthStore.getState().logout()
      } finally {
        finish()
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) {
    return <PageLoading />
  }

  return <>{children}</>
}
