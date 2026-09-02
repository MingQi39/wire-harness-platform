import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { appMessage } from '@/utils/appMessage'
import { customerApi } from '@/api/customer'
import type {
  CustomerListParams,
  CustomerChangeLogListParams,
  UpdateCustomerReq,
  UpsertCustomerBillingReq,
} from '@/api/types'
import { sampleWorkspaceKeys } from '@/hooks/useSampleWorkspace'

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (params: CustomerListParams) => [...customerKeys.lists(), params] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: number) => [...customerKeys.details(), id] as const,
  billing: (id: number) => [...customerKeys.all, 'billing', id] as const,
  changeLogs: (id: number, params: CustomerChangeLogListParams) =>
    [...customerKeys.all, 'change-logs', id, params] as const,
}

export function useCustomerList(params: CustomerListParams) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => customerApi.getCustomerList(params),
    placeholderData: keepPreviousData,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: customerApi.createCustomer,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: sampleWorkspaceKeys.all })
      appMessage().success('客户已保存')
    },
  })
}

export function useCustomerDetail(id: number, enabled: boolean) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => customerApi.getCustomer(id),
    enabled: enabled && id > 0,
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { id: number; data: UpdateCustomerReq }>({
    mutationFn: ({ id, data }) => customerApi.updateCustomer(id, data),
    onSuccess: (_: void, { id }) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: [...customerKeys.all, 'change-logs', id] })
      queryClient.invalidateQueries({ queryKey: sampleWorkspaceKeys.all })
      appMessage().success('客户已更新')
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: customerApi.deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
      queryClient.invalidateQueries({ queryKey: sampleWorkspaceKeys.all })
      appMessage().success('已删除客户')
    },
  })
}

export function useCustomerChangeLogs(customerId: number, params: CustomerChangeLogListParams) {
  return useQuery({
    queryKey: customerKeys.changeLogs(customerId, params),
    queryFn: () => customerApi.getCustomerChangeLogs(customerId, params),
    enabled: customerId > 0,
    placeholderData: keepPreviousData,
  })
}

export function useCustomerBilling(customerId: number) {
  return useQuery({
    queryKey: customerKeys.billing(customerId),
    queryFn: () => customerApi.getCustomerBilling(customerId),
    enabled: customerId > 0,
  })
}

export function useUpsertCustomerBilling() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { id: number; data: UpsertCustomerBillingReq }>({
    mutationFn: ({ id, data }) => customerApi.updateCustomerBilling(id, data),
    onSuccess: (_: void, { id }) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.billing(id) })
      queryClient.invalidateQueries({ queryKey: [...customerKeys.all, 'change-logs', id] })
      appMessage().success('开票信息已保存')
    },
  })
}
