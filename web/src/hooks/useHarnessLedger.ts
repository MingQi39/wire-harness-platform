import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  harnessLedgerApi,
  type HarnessItemForm,
  type HarnessProjectForm,
  type HarnessProjectListParams,
} from '@/api/harnessLedger'

export function useHarnessProjects(params: HarnessProjectListParams) {
  return useQuery({
    queryKey: ['harness-projects', params],
    queryFn: () => harnessLedgerApi.listProjects(params),
  })
}

export function useHarnessItems(projectId: number | null) {
  return useQuery({
    queryKey: ['harness-items', projectId],
    queryFn: () => harnessLedgerApi.listItems(projectId!),
    enabled: projectId != null && projectId > 0,
  })
}

export function useHarnessProjectMutations(listParams: HarnessProjectListParams) {
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['harness-projects', listParams] })
    void qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
  }
  return {
    create: useMutation({
      mutationFn: (data: HarnessProjectForm) => harnessLedgerApi.createProject(data),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: HarnessProjectForm }) =>
        harnessLedgerApi.updateProject(id, data),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: number) => harnessLedgerApi.deleteProject(id),
      onSuccess: invalidate,
    }),
    uploadAttachment: useMutation({
      mutationFn: ({ id, file }: { id: number; file: File }) => harnessLedgerApi.uploadAttachment(id, file),
      onSuccess: invalidate,
    }),
  }
}

export function useHarnessItemMutations(projectId: number | null, listParams: HarnessProjectListParams) {
  const qc = useQueryClient()
  const invalidate = () => {
    if (projectId) {
      void qc.invalidateQueries({ queryKey: ['harness-items', projectId] })
    }
    void qc.invalidateQueries({ queryKey: ['harness-projects', listParams] })
    void qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
  }
  return {
    create: useMutation({
      mutationFn: (data: HarnessItemForm) => harnessLedgerApi.createItem(projectId!, data),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: HarnessItemForm }) => harnessLedgerApi.updateItem(id, data),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: number) => harnessLedgerApi.deleteItem(id),
      onSuccess: invalidate,
    }),
    importCsv: useMutation({
      mutationFn: (file: File) => harnessLedgerApi.importItems(projectId!, file),
      onSuccess: invalidate,
    }),
  }
}
