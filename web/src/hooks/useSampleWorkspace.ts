import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { appMessage } from '@/utils/appMessage'
import { sampleWorkspaceApi } from '@/api/sampleWorkspace'
import type {
  SampleWorkspaceCommissionOrderListParams,
  SampleWorkspaceCustomerListParams,
  SampleWorkspaceEquipmentLineListParams,
  SampleWorkspaceEquipmentStockReq,
  UpdateEquipmentSampleStatusReq,
} from '@/api/types'

export const sampleWorkspaceKeys = {
  all: ['sample-workspace'] as const,
  customers: (params: SampleWorkspaceCustomerListParams) =>
    [...sampleWorkspaceKeys.all, 'customers', params] as const,
  orders: (customerId: number, params: SampleWorkspaceCommissionOrderListParams) =>
    [...sampleWorkspaceKeys.all, 'orders', customerId, params] as const,
  equipment: (orderId: number, params?: SampleWorkspaceEquipmentLineListParams) =>
    [...sampleWorkspaceKeys.all, 'equipment', orderId, params ?? {}] as const,
  record: (orderId: number, lineIndex: number) =>
    [...sampleWorkspaceKeys.all, 'record', orderId, lineIndex] as const,
}

export function useSampleWorkspaceCustomers(params: SampleWorkspaceCustomerListParams) {
  return useQuery({
    queryKey: sampleWorkspaceKeys.customers(params),
    queryFn: () => sampleWorkspaceApi.getWorkspaceCustomers(params),
    // KeepAlive 保活下依赖 invalidate；缩短 stale，避免 30s 全局默认挡住刷新
    staleTime: 0,
  })
}

export function useSampleWorkspaceCommissionOrders(
  customerId: number,
  params: SampleWorkspaceCommissionOrderListParams,
) {
  return useQuery({
    queryKey: sampleWorkspaceKeys.orders(customerId, params),
    queryFn: () => sampleWorkspaceApi.getWorkspaceCommissionOrders(customerId, params),
    enabled: customerId > 0,
    staleTime: 0,
  })
}

export function useSampleWorkspaceEquipmentLines(
  orderId: number,
  params?: SampleWorkspaceEquipmentLineListParams,
) {
  const resolvedParams = params ?? {}
  return useQuery({
    queryKey: sampleWorkspaceKeys.equipment(orderId, resolvedParams),
    // 从 queryKey 取参，避免闭包拿到旧 keyword 导致「搜了但不筛」
    queryFn: ({ queryKey }) => {
      const keyOrderId = queryKey[2] as number
      const keyParams = queryKey[3] as SampleWorkspaceEquipmentLineListParams
      return sampleWorkspaceApi.getWorkspaceEquipmentLines(keyOrderId, keyParams)
    },
    enabled: orderId > 0,
    staleTime: 0,
  })
}

export function useSampleEquipmentRecord(orderId: number, lineIndex: number | null, enabled: boolean) {
  return useQuery({
    queryKey: sampleWorkspaceKeys.record(orderId, lineIndex ?? -1),
    queryFn: () => sampleWorkspaceApi.getEquipmentSampleRecord(orderId, lineIndex!),
    enabled: enabled && orderId > 0 && lineIndex != null && lineIndex >= 0,
    staleTime: 0,
  })
}

export function useUpdateEquipmentSampleStatus(_orderId: number, _lineIndex: number | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateEquipmentSampleStatusReq) => sampleWorkspaceApi.updateEquipmentSampleStatus(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sampleWorkspaceKeys.all })
      appMessage().success('样品状态已更新')
    },
  })
}

export function useSampleWorkspaceEquipmentStockIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      commissionOrderId,
      data,
    }: {
      commissionOrderId: number
      data: SampleWorkspaceEquipmentStockReq
    }) => sampleWorkspaceApi.stockInEquipmentLines(commissionOrderId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sampleWorkspaceKeys.all })
      appMessage().success('样品已入库')
    },
  })
}

export function useSampleWorkspaceEquipmentStockOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      commissionOrderId,
      data,
    }: {
      commissionOrderId: number
      data: SampleWorkspaceEquipmentStockReq
    }) => sampleWorkspaceApi.stockOutEquipmentLines(commissionOrderId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sampleWorkspaceKeys.all })
      appMessage().success('样品已出库')
    },
  })
}
