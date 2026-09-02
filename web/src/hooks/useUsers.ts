import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { appMessage } from '@/utils/appMessage'
import { bumpCertificateSignatureVersion } from '@/utils/certificateSignatureVersion'
import { userApi } from '@/api/user'
import type { BatchDeleteWithUpdatedAtReq, BatchUpdateUsersReq, UserListParams } from '@/api/types'
import { USER_DISPLAY_NAME_MAP_QUERY_KEY } from '@/hooks/useUserDisplayNameMap'

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: UserListParams) => [...userKeys.lists(), params] as const,
}

function invalidateUserDisplayCaches(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: userKeys.lists() })
  void queryClient.invalidateQueries({ queryKey: USER_DISPLAY_NAME_MAP_QUERY_KEY })
  void queryClient.invalidateQueries({ queryKey: ['me-active-users'] })
}

export function useUserList(params: UserListParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => userApi.getUserList(params),
    placeholderData: keepPreviousData,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: userApi.createUser,
    onSuccess: () => {
      appMessage().success('用户创建成功')
      invalidateUserDisplayCaches(queryClient)
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updatedAt }: { id: number; updatedAt: string }) => userApi.deleteUser(id, updatedAt),
    onSuccess: () => {
      appMessage().success('用户删除成功')
      invalidateUserDisplayCaches(queryClient)
    },
  })
}

export function useBatchDeleteUsers() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, BatchDeleteWithUpdatedAtReq>({
    mutationFn: userApi.batchDeleteUsers,
    onSuccess: () => {
      appMessage().success('用户批量删除成功')
      invalidateUserDisplayCaches(queryClient)
    },
  })
}

export function useBatchUpdateUsers() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ payload }: { payload: BatchUpdateUsersReq }) => userApi.batchUpdateUsers(payload),
    onSuccess: () => {
      appMessage().success('批量修改已保存')
      invalidateUserDisplayCaches(queryClient)
    },
  })
}

export function useSetUserStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, updatedAt }: { id: number; status: 'active' | 'disabled'; updatedAt: string }) =>
      userApi.setUserStatus(id, { status, updated_at: updatedAt }),
    onSuccess: () => {
      appMessage().success('状态已更新')
      invalidateUserDisplayCaches(queryClient)
    },
  })
}

export function useSetUserRoles() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role_ids, updatedAt }: { id: number; role_ids: number[]; updatedAt: string }) =>
      userApi.setUserRoles(id, { role_ids, updated_at: updatedAt }),
    onSuccess: () => {
      appMessage().success('角色分配成功')
      invalidateUserDisplayCaches(queryClient)
    },
  })
}

export function useUploadUserSignature() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file, updatedAt, expectedSignatureFileId }: { id: number; file: File; updatedAt: string; expectedSignatureFileId?: number | null }) =>
      userApi.uploadUserSignature(id, file, updatedAt, expectedSignatureFileId),
    onSuccess: () => {
      bumpCertificateSignatureVersion()
      appMessage().success('签名已保存')
      invalidateUserDisplayCaches(queryClient)
    },
  })
}

export function useDeleteUserSignature() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updatedAt, expectedSignatureFileId }: { id: number; updatedAt: string; expectedSignatureFileId?: number | null }) =>
      userApi.deleteUserSignature(id, updatedAt, expectedSignatureFileId),
    onSuccess: () => {
      bumpCertificateSignatureVersion()
      appMessage().success('签名已删除')
      invalidateUserDisplayCaches(queryClient)
    },
  })
}

export function useResetUserPassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, plainNewPassword }: { id: number; plainNewPassword: string }) =>
      userApi.resetUserPassword(id, plainNewPassword),
    onSuccess: () => {
      appMessage().success('密码已重置')
      invalidateUserDisplayCaches(queryClient)
    },
  })
}
