import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { standardMaterialApi } from '@/api/standardMaterial'
import { appMessage } from '@/utils/appMessage'
import type {
  BatchDeleteWithUpdatedAtReq,
  CreateStandardMaterialReq,
  StandardMaterialStockInReq,
  StandardMaterialStockOutReq,
  StandardMaterialListParams,
  UpdateStandardMaterialReq,
} from '@/api/types'
import { standardAssetStockRecordKeys } from './useStandardAssetStockRecords'

export const standardMaterialKeys = {
  all: ['standard-materials'] as const,
  lists: () => [...standardMaterialKeys.all, 'list'] as const,
  list: (params: StandardMaterialListParams) => [...standardMaterialKeys.lists(), params] as const,
  details: () => [...standardMaterialKeys.all, 'detail'] as const,
  detail: (id: number) => [...standardMaterialKeys.details(), id] as const,
}

export function useStandardMaterialList(params: StandardMaterialListParams) {
  return useQuery({
    queryKey: standardMaterialKeys.list(params),
    queryFn: () => standardMaterialApi.getList(params),
    placeholderData: keepPreviousData,
  })
}

export function useStandardMaterial(id: number, enabled = true) {
  return useQuery({
    queryKey: standardMaterialKeys.detail(id),
    queryFn: () => standardMaterialApi.getById(id),
    enabled: enabled && id > 0,
  })
}

export function useCreateStandardMaterial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateStandardMaterialReq) => standardMaterialApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: standardMaterialKeys.lists() })
      appMessage().success('标准物质已保存')
    },
  })
}

export function useUpdateStandardMaterial() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { id: number; data: UpdateStandardMaterialReq }>({
    mutationFn: ({ id, data }) => standardMaterialApi.update(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: standardMaterialKeys.lists() })
      queryClient.invalidateQueries({ queryKey: standardMaterialKeys.detail(id) })
      appMessage().success('已保存')
    },
  })
}

export function useDeleteStandardMaterial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: standardMaterialApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: standardMaterialKeys.lists() })
      appMessage().success('已删除')
    },
  })
}

export function useBatchDeleteStandardMaterials() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, BatchDeleteWithUpdatedAtReq>({
    mutationFn: standardMaterialApi.batchDelete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: standardMaterialKeys.lists() })
      appMessage().success('已批量删除标准物质')
    },
  })
}

export function useStandardMaterialStockOut() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, StandardMaterialStockOutReq>({
    mutationFn: standardMaterialApi.stockOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: standardMaterialKeys.lists() })
      queryClient.invalidateQueries({ queryKey: standardAssetStockRecordKeys.lists() })
      appMessage().success('设备已出库')
    },
  })
}

export function useStandardMaterialStockIn() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, StandardMaterialStockInReq>({
    mutationFn: standardMaterialApi.stockIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: standardMaterialKeys.lists() })
      queryClient.invalidateQueries({ queryKey: standardAssetStockRecordKeys.lists() })
      appMessage().success('设备已入库')
    },
  })
}
