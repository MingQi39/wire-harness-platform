import { useQuery, useMutation, useQueryClient, keepPreviousData, type QueryClient } from '@tanstack/react-query'
import type { AxiosProgressEvent } from 'axios'
import { certCoverTemplateApi } from '@/api/certCoverTemplate'
import type { BatchDeleteWithUpdatedAtReq, CertCoverTemplate, CertCoverTemplateListParams, PageResult } from '@/api/types'
import { appMessage } from '@/utils/appMessage'

export const certCoverTemplateKeys = {
  all: ['cert-cover-templates'] as const,
  lists: () => [...certCoverTemplateKeys.all, 'list'] as const,
  list: (params: CertCoverTemplateListParams) => [...certCoverTemplateKeys.lists(), params] as const,
  details: () => [...certCoverTemplateKeys.all, 'detail'] as const,
  detail: (id: number) => [...certCoverTemplateKeys.details(), id] as const,
}

export function updateCertCoverTemplateCaches(queryClient: QueryClient, updated: CertCoverTemplate) {
  queryClient.setQueriesData<PageResult<CertCoverTemplate>>(
    { queryKey: certCoverTemplateKeys.lists() },
    (old) => {
      if (!old) return old
      return {
        ...old,
        list: old.list.map((item) => (item.id === updated.id ? updated : item)),
      }
    },
  )
  queryClient.setQueryData(certCoverTemplateKeys.detail(updated.id), updated)
}

async function getCertCoverTemplateAfterMutation(id: number) {
  try {
    return await certCoverTemplateApi.get(id, { silentBizError: true })
  } catch {
    return undefined
  }
}

export function useCertCoverTemplateList(params: CertCoverTemplateListParams) {
  return useQuery({
    queryKey: certCoverTemplateKeys.list(params),
    queryFn: () => certCoverTemplateApi.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useCreateCertCoverTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      data,
      onUploadProgress,
    }: {
      data: {
        name: string
        publish_date: string
        implementation_date: string
        version: string
        status: string
        file: File
        local_file_path?: string
      }
      onUploadProgress?: (event: AxiosProgressEvent) => void
    }) => certCoverTemplateApi.create(data, { onUploadProgress }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certCoverTemplateKeys.lists() })
      appMessage().success('模版已保存')
    },
  })
}

export function useUpdateCertCoverTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
      onUploadProgress,
    }: {
      id: number
      data: {
        name: string
        publish_date: string
        implementation_date: string
        version: string
        status: string
        file?: File
        local_file_path?: string
        updated_at: string
      }
      onUploadProgress?: (event: AxiosProgressEvent) => void
    }) => certCoverTemplateApi.update(id, data, { onUploadProgress }).then(() => getCertCoverTemplateAfterMutation(id)),
    onSuccess: (updated, { id }) => {
      if (updated) {
        updateCertCoverTemplateCaches(queryClient, updated)
      }
      queryClient.invalidateQueries({ queryKey: certCoverTemplateKeys.lists() })
      queryClient.invalidateQueries({ queryKey: certCoverTemplateKeys.detail(id) })
      appMessage().success('模版已更新')
    },
  })
}

export function useDeleteCertCoverTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: certCoverTemplateApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certCoverTemplateKeys.lists() })
      appMessage().success('已删除模版')
    },
  })
}

export function useBatchDeleteCertCoverTemplates() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, BatchDeleteWithUpdatedAtReq>({
    mutationFn: certCoverTemplateApi.batchDelete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certCoverTemplateKeys.lists() })
      appMessage().success('已批量删除模版')
    },
  })
}
