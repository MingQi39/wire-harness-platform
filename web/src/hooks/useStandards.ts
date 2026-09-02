import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { appMessage } from '@/utils/appMessage'
import { standardApi } from '@/api/standard'
import type { BatchDeleteWithUpdatedAtReq, StandardListParams, UpdateStandardReq } from '@/api/types'

export const standardKeys = {
  all: ['standards'] as const,
  lists: () => [...standardKeys.all, 'list'] as const,
  list: (params: StandardListParams) => [...standardKeys.lists(), params] as const,
  details: () => [...standardKeys.all, 'detail'] as const,
  detail: (id: number) => [...standardKeys.details(), id] as const,
}

export function useStandardList(params: StandardListParams) {
  return useQuery({
    queryKey: standardKeys.list(params),
    queryFn: () => standardApi.getStandardList(params),
    placeholderData: keepPreviousData,
  })
}

export function useCreateStandard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: standardApi.createStandard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: standardKeys.lists() })
      appMessage().success('标准已保存')
    },
  })
}

export function useUpdateStandard() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { id: number; data: UpdateStandardReq }>({
    mutationFn: ({ id, data }) => standardApi.updateStandard(id, data),
    onSuccess: (_: void, { id }) => {
      queryClient.invalidateQueries({ queryKey: standardKeys.lists() })
      queryClient.invalidateQueries({ queryKey: standardKeys.detail(id) })
      appMessage().success('已保存')
    },
  })
}

export function useDeleteStandard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: standardApi.deleteStandard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: standardKeys.lists() })
      appMessage().success('已删除标准')
    },
  })
}

export function useBatchDeleteStandards() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, BatchDeleteWithUpdatedAtReq>({
    mutationFn: standardApi.batchDeleteStandards,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: standardKeys.lists() })
      appMessage().success('已批量删除标准')
    },
  })
}
