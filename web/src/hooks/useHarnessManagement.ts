import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { harnessManagementApi } from '@/api/harnessManagement'
import { invalidateHarnessData } from '@/utils/invalidateHarnessData'

export function useHarnessManagementItems(projectId: number | null) {
  return useQuery({
    queryKey: ['harness-management-items', projectId],
    queryFn: () => harnessManagementApi.listItems(projectId!),
    enabled: projectId != null && projectId > 0,
  })
}

export function useHarnessOperationLogs(itemId: number | null, open: boolean) {
  return useQuery({
    queryKey: ['harness-operation-logs', itemId],
    queryFn: () => harnessManagementApi.listOperationLogs(itemId!),
    enabled: open && itemId != null && itemId > 0,
  })
}

export function useHarnessManagementMutations(projectId: number | null) {
  const qc = useQueryClient()
  const invalidate = () => invalidateHarnessData(qc, projectId)
  return {
    stockIn: useMutation({
      mutationFn: (ids: number[]) => harnessManagementApi.stockIn(ids),
      onSuccess: invalidate,
    }),
    stockOut: useMutation({
      mutationFn: (ids: number[]) => harnessManagementApi.stockOut(ids),
      onSuccess: invalidate,
    }),
    scrap: useMutation({
      mutationFn: (ids: number[]) => harnessManagementApi.scrap(ids),
      onSuccess: invalidate,
    }),
  }
}
