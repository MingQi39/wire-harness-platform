import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { queryClient } from '@/queryClient'

interface AuthState {
  accessToken: string | null
  userId: number | null
  permissions: string[]
  userName: string | null
  tenantId: number | null
  isAuthenticated: boolean
  setAccessToken: (token: string) => void
  setUserId: (id: number | null) => void
  setPermissions: (perms: string[]) => void
  setUserName: (name: string) => void
  setTenantId: (id: number) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      userId: null,
      permissions: [],
      userName: null,
      tenantId: null,
      isAuthenticated: false,

      setAccessToken: (token) => set({ accessToken: token, isAuthenticated: true }),
      setUserId: (id) => set({ userId: id }),
      setPermissions: (perms) => set({ permissions: perms }),
      setUserName: (name) => set({ userName: name }),
      setTenantId: (id) => set({ tenantId: id }),

      logout: () => {
        queryClient.clear()
        set({
          accessToken: null,
          userId: null,
          permissions: [],
          userName: null,
          tenantId: null,
          isAuthenticated: false,
        })
      },
    }),
    {
      name: 'wire-harness-auth',
      partialize: (state) => ({
        permissions: state.permissions,
        userName: state.userName,
        userId: state.userId,
        tenantId: state.tenantId,
      }),
      onRehydrateStorage: () => (state, err) => {
        if (err || !state) return
        useAuthStore.setState({ isAuthenticated: Boolean(state.accessToken) })
      },
    },
  ),
)

if (import.meta.hot) {
  const prev = import.meta.hot.data?.authHmr as
    | { accessToken: string | null; isAuthenticated: boolean }
    | undefined
  if (prev?.accessToken) {
    useAuthStore.setState({
      accessToken: prev.accessToken,
      isAuthenticated: prev.isAuthenticated,
    })
  }
  import.meta.hot.dispose((data) => {
    const s = useAuthStore.getState()
    data.authHmr = {
      accessToken: s.accessToken,
      isAuthenticated: s.isAuthenticated,
    }
  })
}

export async function persistRefreshToken(_token: string | null): Promise<void> {
  // Web 端 refresh token 由 HttpOnly Cookie 管理
}
