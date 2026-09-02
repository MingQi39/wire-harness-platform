import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'

/**
 * 侧边栏/顶栏展示名统一：优先姓名，空则回落用户名。
 * 用于纠正 localStorage 中历史登录残留的 username。
 */
export async function syncAuthDisplayNameFromProfile(): Promise<string | null> {
  const profile = await authApi.getProfile()
  const display = profile.name?.trim() || profile.username?.trim() || ''
  if (!display) return null
  useAuthStore.getState().setUserName(display)
  return display
}
