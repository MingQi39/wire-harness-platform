import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { standardAssetStockRecordApi } from '@/api/standardAssetStockRecord'
import { appMessage } from '@/utils/appMessage'
import type { BatchDeleteWithUpdatedAtReq, StandardAssetStockRecordListParams } from '@/api/types'

export const standardAssetStockRecordKeys = {
  all: ['standard-asset-stock-records'] as const,
  lists: () => [...standardAssetStockRecordKeys.all, 'list'] as const,
  list: (params: StandardAssetStockRecordListParams) => [...standardAssetStockRecordKeys.lists(), params] as const,
}

export function useStandardAssetStockRecordList(params: StandardAssetStockRecordListParams) {
  return useQuery({
    queryKey: standardAssetStockRecordKeys.list(params),
    queryFn: () => standardAssetStockRecordApi.getList(params),
    placeholderData: keepPreviousData,
  })
}

export function useDeleteStandardAssetStockRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: standardAssetStockRecordApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: standardAssetStockRecordKeys.lists() })
      appMessage().success('已删除')
    },
  })
}

export function useBatchDeleteStandardAssetStockRecords() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, BatchDeleteWithUpdatedAtReq>({
    mutationFn: standardAssetStockRecordApi.batchDelete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: standardAssetStockRecordKeys.lists() })
      appMessage().success('已批量删除设备出入库记录')
    },
  })
}
