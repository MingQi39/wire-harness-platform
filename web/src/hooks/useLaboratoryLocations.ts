import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { laboratoryLocationApi } from '@/api/laboratoryLocation'
import { appMessage } from '@/utils/appMessage'
import type { BatchDeleteWithUpdatedAtReq, LaboratoryLocationListParams, UpdateLaboratoryLocationReq } from '@/api/types'

export const laboratoryLocationKeys = {
  all: ['laboratory-locations'] as const,
  lists: () => [...laboratoryLocationKeys.all, 'list'] as const,
  list: (params: LaboratoryLocationListParams) => [...laboratoryLocationKeys.lists(), params] as const,
  details: () => [...laboratoryLocationKeys.all, 'detail'] as const,
  detail: (id: number) => [...laboratoryLocationKeys.details(), id] as const,
}

export function useLaboratoryLocationList(params: LaboratoryLocationListParams) {
  return useQuery({
    queryKey: laboratoryLocationKeys.list(params),
    queryFn: () => laboratoryLocationApi.getList(params),
    placeholderData: keepPreviousData,
  })
}

export function useCreateLaboratoryLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: laboratoryLocationApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: laboratoryLocationKeys.lists() })
      appMessage().success('实验室位置已保存')
    },
  })
}

export function useLaboratoryLocationDetail(id: number, enabled: boolean) {
  return useQuery({
    queryKey: laboratoryLocationKeys.detail(id),
    queryFn: () => laboratoryLocationApi.get(id),
    enabled: enabled && id > 0,
  })
}

export function useUpdateLaboratoryLocation() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { id: number; data: UpdateLaboratoryLocationReq }>({
    mutationFn: ({ id, data }) => laboratoryLocationApi.update(id, data),
    onSuccess: (_: void, { id }) => {
      queryClient.invalidateQueries({ queryKey: laboratoryLocationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: laboratoryLocationKeys.detail(id) })
      appMessage().success('实验室位置已更新')
    },
  })
}

export function useDeleteLaboratoryLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: laboratoryLocationApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: laboratoryLocationKeys.lists() })
      appMessage().success('已删除实验室位置')
    },
  })
}

export function useBatchDeleteLaboratoryLocations() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, BatchDeleteWithUpdatedAtReq>({
    mutationFn: laboratoryLocationApi.batchDelete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: laboratoryLocationKeys.lists() })
      appMessage().success('已批量删除实验室位置')
    },
  })
}
