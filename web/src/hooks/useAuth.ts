import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { getApiErrorMessage } from '@/api/client'
import { persistRefreshToken, useAuthStore } from '@/stores/authStore'
import { appMessage } from '@/utils/appMessage'

export function useLogin() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const setUserId = useAuthStore((s) => s.setUserId)
  const setPermissions = useAuthStore((s) => s.setPermissions)
  const setUserName = useAuthStore((s) => s.setUserName)
  const setTenantId = useAuthStore((s) => s.setTenantId)
  const navigate = useNavigate()

  return useMutation({
    mutationFn: authApi.loginUser,
    onError: (err) => {
      appMessage().error(getApiErrorMessage(err))
    },
    onSuccess: async (data) => {
      if (!data?.access_token) {
        appMessage().error('登录响应异常，请稍后重试')
        return
      }
      setAccessToken(data.access_token)
      if (data.refresh_token) {
        await persistRefreshToken(data.refresh_token)
      }
      if (data.user_id != null && data.user_id > 0) {
        setUserId(data.user_id)
      }
      if (data.permissions) {
        setPermissions(data.permissions)
      }
      if (data.user_name) {
        setUserName(data.user_name)
      }
      if (data.tenant_id) {
        setTenantId(data.tenant_id)
      }
      appMessage().success('登录成功')
      navigate('/')
    },
  })
}
