import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { appMessage } from '@/utils/appMessage'
import { roleApi } from '@/api/role'
import type { BatchDeleteWithUpdatedAtReq, RoleListParams, UpdateRoleReq } from '@/api/types'

export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  list: (params: RoleListParams) => [...roleKeys.lists(), params] as const,
  details: () => [...roleKeys.all, 'detail'] as const,
  detail: (id: number) => [...roleKeys.details(), id] as const,
}

export function useRoleList(params: RoleListParams) {
  return useQuery({
    queryKey: roleKeys.list(params),
    queryFn: () => roleApi.getRoleList(params),
    placeholderData: keepPreviousData,
  })
}

export function useRoleDetail(id: number) {
  return useQuery({
    queryKey: roleKeys.detail(id),
    queryFn: () => roleApi.getRoleDetail(id),
    enabled: !!id,
  })
}

export function useAllRoles() {
  return useQuery({
    queryKey: [...roleKeys.all, 'all'],
    queryFn: () => roleApi.getRoleList({ page: 1, page_size: 9999 }),
  })
}

export function useCreateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: roleApi.createRole,
    onSuccess: () => {
      appMessage().success('角色创建成功')
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() })
    },
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateRoleReq }) =>
      roleApi.updateRole(id, data),
    onSuccess: (_data, { id }) => {
      appMessage().success('角色更新成功')
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() })
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(id) })
    },
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: roleApi.deleteRole,
    onSuccess: () => {
      appMessage().success('角色删除成功')
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() })
    },
  })
}

export function useBatchDeleteRoles() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, BatchDeleteWithUpdatedAtReq>({
    mutationFn: roleApi.batchDeleteRoles,
    onSuccess: () => {
      appMessage().success('角色批量删除成功')
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() })
    },
  })
}

export function useSetRolePermissions(roleId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ permissionIds, updatedAt }: { permissionIds: number[]; updatedAt: string }) =>
      roleApi.setRolePermissions(roleId, { permission_ids: permissionIds, updated_at: updatedAt }),
    onSuccess: () => {
      appMessage().success('权限配置保存成功')
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(roleId) })
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() })
    },
  })
}
