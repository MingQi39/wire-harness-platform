import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { standardInstrumentApi } from '@/api/standardInstrument'
import { appMessage } from '@/utils/appMessage'
import type {
  BatchDeleteWithUpdatedAtReq,
  CreateStandardInstrumentReq,
  StandardInstrumentStockInReq,
  StandardInstrumentStockOutReq,
  StandardInstrumentListParams,
  StandardInstrumentTraceHistoryReq,
  UpdateStandardInstrumentReq,
  UpdateStandardInstrumentTraceHistoryReq,
} from '@/api/types'
import { standardAssetStockRecordKeys } from './useStandardAssetStockRecords'

export const standardInstrumentKeys = {
  all: ['standard-instruments'] as const,
  lists: () => [...standardInstrumentKeys.all, 'list'] as const,
  list: (params: StandardInstrumentListParams) => [...standardInstrumentKeys.lists(), params] as const,
  details: () => [...standardInstrumentKeys.all, 'detail'] as const,
  detail: (id: number) => [...standardInstrumentKeys.details(), id] as const,
}

export function useStandardInstrumentList(params: StandardInstrumentListParams) {
  return useQuery({
    queryKey: standardInstrumentKeys.list(params),
    queryFn: () => standardInstrumentApi.getList(params),
    placeholderData: keepPreviousData,
  })
}

export function useStandardInstrument(id: number, enabled = true) {
  return useQuery({
    queryKey: standardInstrumentKeys.detail(id),
    queryFn: () => standardInstrumentApi.getById(id),
    enabled: enabled && id > 0,
  })
}

export function useCreateStandardInstrument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateStandardInstrumentReq) => standardInstrumentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: standardInstrumentKeys.lists() })
      appMessage().success('标准仪器已保存')
    },
  })
}

export function useUpdateStandardInstrument() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { id: number; data: UpdateStandardInstrumentReq }>({
    mutationFn: ({ id, data }) => standardInstrumentApi.update(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: standardInstrumentKeys.lists() })
      queryClient.invalidateQueries({ queryKey: standardInstrumentKeys.detail(id) })
      appMessage().success('已保存')
    },
  })
}

export function useDeleteStandardInstrument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: standardInstrumentApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: standardInstrumentKeys.lists() })
      appMessage().success('已删除')
    },
  })
}

export function useBatchDeleteStandardInstruments() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, BatchDeleteWithUpdatedAtReq>({
    mutationFn: standardInstrumentApi.batchDelete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: standardInstrumentKeys.lists() })
      appMessage().success('已批量删除标准仪器')
    },
  })
}

export function useStandardInstrumentStockOut() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, StandardInstrumentStockOutReq>({
    mutationFn: standardInstrumentApi.stockOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: standardInstrumentKeys.lists() })
      queryClient.invalidateQueries({ queryKey: standardAssetStockRecordKeys.lists() })
      appMessage().success('设备已出库')
    },
  })
}

export function useStandardInstrumentStockIn() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, StandardInstrumentStockInReq>({
    mutationFn: standardInstrumentApi.stockIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: standardInstrumentKeys.lists() })
      queryClient.invalidateQueries({ queryKey: standardAssetStockRecordKeys.lists() })
      appMessage().success('设备已入库')
    },
  })
}

export function useCreateStandardInstrumentTraceHistory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ instrumentId, data }: { instrumentId: number; data: StandardInstrumentTraceHistoryReq }) =>
      standardInstrumentApi.createTraceHistory(instrumentId, data),
    onSuccess: (_data, { instrumentId }) => {
      queryClient.invalidateQueries({ queryKey: standardInstrumentKeys.lists() })
      queryClient.invalidateQueries({ queryKey: standardInstrumentKeys.detail(instrumentId) })
      appMessage().success('溯源履历已新增')
    },
  })
}

export function useUpdateStandardInstrumentTraceHistory() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { instrumentId: number; historyId: number; data: UpdateStandardInstrumentTraceHistoryReq }>({
    mutationFn: ({ instrumentId, historyId, data }) =>
      standardInstrumentApi.updateTraceHistory(instrumentId, historyId, data),
    onSuccess: (_data, { instrumentId }) => {
      queryClient.invalidateQueries({ queryKey: standardInstrumentKeys.lists() })
      queryClient.invalidateQueries({ queryKey: standardInstrumentKeys.detail(instrumentId) })
      appMessage().success('溯源履历已更新')
    },
  })
}

export function useDeleteStandardInstrumentTraceHistory() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { instrumentId: number; historyId: number; updatedAt: string }>({
    mutationFn: ({ instrumentId, historyId, updatedAt }) => standardInstrumentApi.deleteTraceHistory(instrumentId, historyId, updatedAt),
    onSuccess: (_data, { instrumentId }) => {
      queryClient.invalidateQueries({ queryKey: standardInstrumentKeys.lists() })
      queryClient.invalidateQueries({ queryKey: standardInstrumentKeys.detail(instrumentId) })
      appMessage().success('已删除')
    },
  })
}

export function useBatchDeleteStandardInstrumentTraceHistories() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { instrumentId: number; data: BatchDeleteWithUpdatedAtReq }>({
    mutationFn: ({ instrumentId, data }) => standardInstrumentApi.batchDeleteTraceHistories(instrumentId, data),
    onSuccess: (_data, { instrumentId }) => {
      queryClient.invalidateQueries({ queryKey: standardInstrumentKeys.lists() })
      queryClient.invalidateQueries({ queryKey: standardInstrumentKeys.detail(instrumentId) })
      appMessage().success('已批量删除溯源履历')
    },
  })
}
