import { useQuery } from '@tanstack/react-query'
import { certificatePrepareWorkflowApi } from '@/api/certificatePrepareWorkflow'

export const certificatePrepareWorkflowKeys = {
  all: ['certificate-prepare-workflow'] as const,
  state: (orderId: number, lineIndex: number) =>
    [...certificatePrepareWorkflowKeys.all, 'state', orderId, lineIndex] as const,
}

export const certificatePrepareWorkflowTodoKeys = {
  all: ['certificate-prepare-workflow-todos'] as const,
}

export function useCertificatePrepareWorkflowState(commissionOrderId: number, lineIndex: number, open: boolean) {
  return useQuery({
    queryKey: certificatePrepareWorkflowKeys.state(commissionOrderId, lineIndex),
    queryFn: () => certificatePrepareWorkflowApi.getState(commissionOrderId, lineIndex),
    enabled: open && commissionOrderId > 0 && lineIndex >= 0,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useCertificatePrepareWorkflowTodos(enabled: boolean) {
  return useQuery({
    queryKey: certificatePrepareWorkflowTodoKeys.all,
    queryFn: () => certificatePrepareWorkflowApi.listTodos(),
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}
