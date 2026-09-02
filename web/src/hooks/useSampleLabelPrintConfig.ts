import { sampleWorkspaceApi } from '@/api/sampleWorkspace'
import { mergeSampleLabelPrintConfig } from '@/constants/sampleLabelConfig'
import { useQuery } from '@tanstack/react-query'
import { sampleWorkspaceKeys } from './useSampleWorkspace'

export function useSampleLabelPrintConfig() {
  return useQuery({
    queryKey: [...sampleWorkspaceKeys.all, 'label-print-config'] as const,
    queryFn: () => sampleWorkspaceApi.getLabelPrintConfig(),
    staleTime: 5 * 60 * 1000,
    select: (data) => mergeSampleLabelPrintConfig(data),
  })
}
