import type { LoginResp } from '@/api/types'
import { useAuthStore } from '@/stores/authStore'

export async function applyRefreshSession(data: LoginResp): Promise<void> {
  const s = useAuthStore.getState()
  s.setAccessToken(data.access_token)
  if (data.user_id != null && data.user_id > 0) {
    s.setUserId(data.user_id)
  }
  if (data.permissions != null) {
    s.setPermissions(data.permissions)
  }
  if (data.user_name != null) {
    s.setUserName(data.user_name)
  }
  if (data.tenant_id != null) {
    s.setTenantId(data.tenant_id)
  }
}

export async function ensureElectronRefreshTokenLoaded(): Promise<string | null> {
  return null
}
