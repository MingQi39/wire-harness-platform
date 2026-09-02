import { useQuery, useMutation, useQueryClient, keepPreviousData, type QueryClient } from '@tanstack/react-query'
import { appMessage } from '@/utils/appMessage'
import { commissionOrderApi } from '@/api/commissionOrder'
import { invalidateDashboardStats } from '@/api/dashboard'
import type {
  CommissionOrderEquipmentAssignReq,
  CommissionOrderEquipmentBatchDeleteReq,
  CommissionOrderEquipmentBatchSampleStatusReq,
  CommissionOrderListParams,
  ReplaceCommissionOrderEquipmentLinesReq,
  UpdateCommissionOrderReq,
} from '@/api/types'
import { sampleWorkspaceKeys } from '@/hooks/useSampleWorkspace'

export const commissionOrderKeys = {
  all: ['commission-orders'] as const,
  lists: () => [...commissionOrderKeys.all, 'list'] as const,
  list: (params: CommissionOrderListParams) => [...commissionOrderKeys.lists(), params] as const,
  details: () => [...commissionOrderKeys.all, 'detail'] as const,
  detail: (id: number) => [...commissionOrderKeys.details(), id] as const,
  workflow: (id: number) => [...commissionOrderKeys.all, 'workflow', id] as const,
}

/** 证书编制页委托单列表（/me/certificate-prepare-commission-orders），与委托单列表缓存隔离 */
export const certificatePrepareCommissionOrderKeys = {
  all: ['certificate-prepare-commission-orders'] as const,
  lists: () => [...certificatePrepareCommissionOrderKeys.all, 'list'] as const,
  list: (params: CommissionOrderListParams) => [...certificatePrepareCommissionOrderKeys.lists(), params] as const,
}

export const commissionOrderWorkflowTodoKeys = {
  all: ['commission-order-workflow-todos'] as const,
}

/**
 * 委托单写操作后的统一失效：
 * - lists() 前缀：覆盖委托单管理 / 样品工作台（不同 page_size、customer_id）等全部列表查询
 * - sample-workspace：客户列表、设备清单、样品记录
 */
function invalidateAfterCommissionOrderWrite(
  queryClient: QueryClient,
  options?: { id?: number; includeTodos?: boolean },
) {
  const tasks: Array<Promise<unknown>> = [
    queryClient.invalidateQueries({ queryKey: commissionOrderKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: certificatePrepareCommissionOrderKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: sampleWorkspaceKeys.all }),
    invalidateDashboardStats(queryClient),
  ]
  if (options?.id != null) {
    tasks.push(queryClient.invalidateQueries({ queryKey: commissionOrderKeys.detail(options.id) }))
  }
  if (options?.includeTodos) {
    tasks.push(queryClient.invalidateQueries({ queryKey: commissionOrderWorkflowTodoKeys.all }))
  }
  return Promise.all(tasks)
}

export function useCommissionOrderList(
  params: CommissionOrderListParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: commissionOrderKeys.list(params),
    queryFn: () => commissionOrderApi.getList(params),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  })
}

export function useCertificatePrepareCommissionOrderList(params: CommissionOrderListParams) {
  return useQuery({
    queryKey: certificatePrepareCommissionOrderKeys.list(params),
    queryFn: () => commissionOrderApi.getListForCertificatePrepare(params),
    placeholderData: keepPreviousData,
  })
}

export function useCommissionOrderDetail(id: number, enabled: boolean) {
  return useQuery({
    queryKey: commissionOrderKeys.detail(id),
    queryFn: () => commissionOrderApi.getDetail(id),
    enabled: enabled && id > 0,
  })
}

export function useCommissionOrderWorkflow(id: number, open: boolean) {
  return useQuery({
    queryKey: commissionOrderKeys.workflow(id),
    queryFn: () => commissionOrderApi.getWorkflow(id),
    enabled: open && id > 0,
  })
}

export function useCommissionOrderWorkflowTodos(enabled: boolean) {
  return useQuery({
    queryKey: commissionOrderWorkflowTodoKeys.all,
    queryFn: () => commissionOrderApi.listWorkflowTodos(),
    enabled,
    // 首页待办：流程在列表页处理完后可能处于 inactive，需与 invalidate refetchType:'all' 配合；进入首页也强制对齐服务端
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useCreateCommissionOrder(_listParams: CommissionOrderListParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: commissionOrderApi.create,
    onSuccess: () => {
      void invalidateAfterCommissionOrderWrite(queryClient)
      appMessage().success('委托单已保存')
    },
  })
}

export function useUpdateCommissionOrder(_listParams?: CommissionOrderListParams) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { id: number; data: UpdateCommissionOrderReq }>({
    mutationFn: ({ id, data }) => commissionOrderApi.update(id, data),
    onSuccess: (_: void, { id }) => {
      void invalidateAfterCommissionOrderWrite(queryClient, { id })
      appMessage().success('委托单已更新')
    },
  })
}

/** 仅替换设备清单（导入多行 / 行内保存一条请求） */
export function useReplaceCommissionOrderEquipmentLines(_listParams?: CommissionOrderListParams) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { id: number; data: ReplaceCommissionOrderEquipmentLinesReq }>({
    mutationFn: ({ id, data }) => commissionOrderApi.replaceEquipmentLines(id, data),
    onSuccess: (_: void, { id }) => {
      void invalidateAfterCommissionOrderWrite(queryClient, { id, includeTodos: true })
      appMessage().success('设备清单已保存')
    },
  })
}

export function useDeleteCommissionOrderEquipmentLine(_listParams?: CommissionOrderListParams) {
  const queryClient = useQueryClient()
  // 可选 silent：跨多个委托单循环逐次删除时，调用方需要自管理 loading + 聚合 toast，
  // 避免每次 hook 自动弹一条 success 堆叠多条 toast；委托单管理页正常使用时不传 silent，
  // 行为与历史完全一致。
  return useMutation<void, Error, { id: number; lineIndex: number; updated_at: string; silent?: boolean }>({
    mutationFn: ({ id, lineIndex, updated_at }) => commissionOrderApi.deleteEquipmentLine(id, lineIndex, updated_at),
    onSuccess: (_: void, { id, silent }) => {
      void invalidateAfterCommissionOrderWrite(queryClient, { id, includeTodos: true })
      if (!silent) appMessage().success('设备行已删除')
    },
  })
}

export function useBatchDeleteCommissionOrderEquipmentLines(_listParams?: CommissionOrderListParams) {
  const queryClient = useQueryClient()
  // 可选 silent 同上；当前后端按「单委托单一次 batch-delete」协议，调用方跨多张委托单
  // 循环时需要聚合 toast，请传 silent=true。
  return useMutation<void, Error, { id: number; data: CommissionOrderEquipmentBatchDeleteReq; silent?: boolean }>({
    mutationFn: ({ id, data }) => commissionOrderApi.batchDeleteEquipmentLines(id, data),
    onSuccess: (_: void, { id, silent }) => {
      void invalidateAfterCommissionOrderWrite(queryClient, { id, includeTodos: true })
      if (!silent) appMessage().success('设备行已批量删除')
    },
  })
}

export function useBatchUpdateCommissionOrderEquipmentSampleStatus(_listParams?: CommissionOrderListParams) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { id: number; data: CommissionOrderEquipmentBatchSampleStatusReq }>({
    mutationFn: ({ id, data }) => commissionOrderApi.batchUpdateEquipmentSampleStatus(id, data),
    onSuccess: (_: void, { id }) => {
      void invalidateAfterCommissionOrderWrite(queryClient, { id, includeTodos: true })
      appMessage().success('样品状态已批量更新')
    },
  })
}

export function useAssignCommissionOrderEquipment(_listParams?: CommissionOrderListParams) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { id: number; data: CommissionOrderEquipmentAssignReq }>({
    mutationFn: ({ id, data }) => commissionOrderApi.assignEquipment(id, data),
    onSuccess: (_: void, { id }) => {
      void invalidateAfterCommissionOrderWrite(queryClient, { id, includeTodos: true })
      appMessage().success('任务分配已保存')
    },
  })
}

export function useDeleteCommissionOrder(_listParams: CommissionOrderListParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updatedAt }: { id: number; updatedAt: string }) => commissionOrderApi.delete(id, updatedAt),
    onSuccess: () => {
      void invalidateAfterCommissionOrderWrite(queryClient)
      appMessage().success('已删除委托单')
    },
  })
}
