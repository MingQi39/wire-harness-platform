import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { originalRecordTemplateApi } from '@/api/originalRecordTemplate'
import type { BatchDeleteWithUpdatedAtReq } from '@/api/types'
import type {
  OriginalRecordGroupResp,
  OriginalRecordMethodItem,
  OriginalRecordInstrumentItem,
  OriginalRecordTemplateResp,
} from '@/api/originalRecordTemplate'
import { appMessage } from '@/utils/appMessage'

export const originalRecordTemplateKeys = {
  all: ['original-record-templates'] as const,
  tree: () => [...originalRecordTemplateKeys.all, 'tree'] as const,
}

export function updateOriginalRecordTemplateTreeCache(
  queryClient: QueryClient,
  updated: OriginalRecordTemplateResp,
) {
  queryClient.setQueryData<OriginalRecordGroupResp[]>(originalRecordTemplateKeys.tree(), (old) => {
    if (!old) return old
    return old.map((group) => ({
      ...group,
      subgroups: group.subgroups.map((subgroup) => ({
        ...subgroup,
        templates: subgroup.templates.map((template) => (template.id === updated.id ? updated : template)),
      })),
    }))
  })
}

async function getOriginalRecordTemplateAfterMutation(id: number) {
  try {
    return await originalRecordTemplateApi.getTemplate(id, { silentBizError: true })
  } catch {
    return undefined
  }
}

export function useOriginalRecordTree() {
  return useQuery({
    queryKey: originalRecordTemplateKeys.tree(),
    queryFn: () => originalRecordTemplateApi.getTree(),
  })
}

export function useCreateOriginalRecordGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => originalRecordTemplateApi.createGroup(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: originalRecordTemplateKeys.tree() })
    },
  })
}

export function useUpdateOriginalRecordGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name, updated_at }: { id: number; name: string; updated_at: string }) =>
      originalRecordTemplateApi.updateGroup(id, name, updated_at),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: originalRecordTemplateKeys.tree() })
    },
  })
}

export function useDeleteOriginalRecordGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updated_at }: { id: number; updated_at: string }) =>
      originalRecordTemplateApi.deleteGroup(id, updated_at),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: originalRecordTemplateKeys.tree() })
      appMessage().success('已删除分组')
    },
  })
}

export function useBatchDeleteOriginalRecordGroups() {
  const qc = useQueryClient()
  return useMutation<void, Error, BatchDeleteWithUpdatedAtReq>({
    mutationFn: originalRecordTemplateApi.batchDeleteGroups,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: originalRecordTemplateKeys.tree() })
      appMessage().success('已批量删除分组')
    },
  })
}

// ── 第二级子分组 ──

export function useCreateOriginalRecordSubgroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, name }: { groupId: number; name: string }) =>
      originalRecordTemplateApi.createSubgroup(groupId, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: originalRecordTemplateKeys.tree() })
    },
  })
}

export function useUpdateOriginalRecordSubgroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name, updated_at }: { id: number; name: string; updated_at: string }) =>
      originalRecordTemplateApi.updateSubgroup(id, name, updated_at),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: originalRecordTemplateKeys.tree() })
    },
  })
}

export function useDeleteOriginalRecordSubgroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updated_at }: { id: number; updated_at: string }) =>
      originalRecordTemplateApi.deleteSubgroup(id, updated_at),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: originalRecordTemplateKeys.tree() })
      appMessage().success('已删除子分组')
    },
  })
}

export function useBatchDeleteOriginalRecordSubgroups() {
  const qc = useQueryClient()
  return useMutation<void, Error, BatchDeleteWithUpdatedAtReq>({
    mutationFn: originalRecordTemplateApi.batchDeleteSubgroups,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: originalRecordTemplateKeys.tree() })
      appMessage().success('已批量删除子分组')
    },
  })
}

// ── 第三级模版 ──

export function useCreateOriginalRecordTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ subgroupId, name }: { subgroupId: number; name: string }) =>
      originalRecordTemplateApi.createTemplate(subgroupId, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: originalRecordTemplateKeys.tree() })
    },
  })
}

export function useUpdateOriginalRecordTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: {
        name: string
        version: string
        status: string
        cert_cover_desc_type: string
        methods: OriginalRecordMethodItem[]
        instruments: OriginalRecordInstrumentItem[]
        updated_at: string
      }
    }) => originalRecordTemplateApi.updateTemplate(id, data).then(() => getOriginalRecordTemplateAfterMutation(id)),
    onSuccess: (updated) => {
      if (updated) {
        updateOriginalRecordTemplateTreeCache(qc, updated)
      }
      qc.invalidateQueries({ queryKey: originalRecordTemplateKeys.tree() })
      appMessage().success('模版已保存')
    },
  })
}

export function useDeleteOriginalRecordTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updated_at }: { id: number; updated_at: string }) =>
      originalRecordTemplateApi.deleteTemplate(id, updated_at),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: originalRecordTemplateKeys.tree() })
      appMessage().success('已删除模版')
    },
  })
}

export function useBatchDeleteOriginalRecordTemplates() {
  const qc = useQueryClient()
  return useMutation<void, Error, BatchDeleteWithUpdatedAtReq>({
    mutationFn: originalRecordTemplateApi.batchDeleteTemplates,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: originalRecordTemplateKeys.tree() })
      appMessage().success('已批量删除模版')
    },
  })
}
