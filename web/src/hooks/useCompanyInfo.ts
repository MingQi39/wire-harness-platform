import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { companyInfoApi } from '@/api/companyInfo'
import { appMessage } from '@/utils/appMessage'

export const companyInfoKeys = {
  all: ['company-info'] as const,
  detail: () => [...companyInfoKeys.all, 'detail'] as const,
}

export function useCompanyInfo() {
  return useQuery({
    queryKey: companyInfoKeys.detail(),
    queryFn: companyInfoApi.get,
  })
}

export function useUpsertCompanyInfo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: companyInfoApi.upsert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyInfoKeys.detail() })
    },
  })
}

export function useUploadCompanyStamp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, updatedAt, expectedStampFileId }: { file: File; updatedAt?: string; expectedStampFileId?: number | null }) =>
      companyInfoApi.uploadStamp(file, updatedAt, expectedStampFileId),
    onSuccess: () => {
      appMessage().success('公司印章已保存')
      queryClient.invalidateQueries({ queryKey: companyInfoKeys.detail() })
    },
  })
}
