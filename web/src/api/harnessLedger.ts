import client from './client'
import type { PageParams } from './types'

export interface HarnessProjectItem {
  id: number
  project_name: string
  platform_model: string
  circuit_count: number
  switch_count: number
  attachment_name: string
  has_attachment: boolean
}

export interface HarnessWireItem {
  id: number
  project_id: number
  harness_name: string
  harness_no: string
  purpose: string
  status: 'in_use' | 'idle' | 'scrapped'
  status_label: string
  responsible_person: string
}

export interface HarnessProjectListParams extends PageParams {
  keyword?: string
}

export interface PaginatedHarnessProjects {
  items: HarnessProjectItem[]
  total: number
  page: number
  page_size: number
}

export interface HarnessProjectForm {
  project_name: string
  platform_model: string
  circuit_count: number
  switch_count: number
}

export interface HarnessItemForm {
  harness_name: string
  harness_no: string
  purpose: string
  status: string
  responsible_person: string
}

export const HARNESS_STATUS_OPTIONS = [
  { label: '在用', value: 'in_use' },
  { label: '空闲', value: 'idle' },
  { label: '报废', value: 'scrapped' },
] as const

export interface HarnessProjectDetail extends HarnessProjectItem {
  attachment_url?: string
}

export const harnessLedgerApi = {
  listProjects: (params: HarnessProjectListParams) =>
    client.get<never, PaginatedHarnessProjects>('/api/v1/harness-projects', { params }),

  getProject: (id: number) =>
    client.get<never, HarnessProjectDetail>(`/api/v1/harness-projects/${id}`),

  createProject: (data: HarnessProjectForm) =>
    client.post<never, HarnessProjectItem>('/api/v1/harness-projects', data),

  updateProject: (id: number, data: HarnessProjectForm) =>
    client.put<never, void>(`/api/v1/harness-projects/${id}`, data),

  deleteProject: (id: number) =>
    client.delete<never, void>(`/api/v1/harness-projects/${id}`),

  uploadAttachment: (id: number, file: File) => {
    const body = new FormData()
    body.append('file', file)
    return client.post<never, { filename: string }>(`/api/v1/harness-projects/${id}/attachment`, body)
  },

  downloadAttachment: (id: number) =>
    client.get<never, Blob>(`/api/v1/harness-projects/${id}/attachment`, { responseType: 'blob' }),

  listItems: (projectId: number) =>
    client.get<never, HarnessWireItem[]>(`/api/v1/harness-projects/${projectId}/items`),

  getItem: (id: number) =>
    client.get<never, HarnessWireItem>(`/api/v1/harness-items/${id}`),

  createItem: (projectId: number, data: HarnessItemForm) =>
    client.post<never, HarnessWireItem>(`/api/v1/harness-projects/${projectId}/items`, data),

  updateItem: (id: number, data: HarnessItemForm) =>
    client.put<never, void>(`/api/v1/harness-items/${id}`, data),

  deleteItem: (id: number) =>
    client.delete<never, void>(`/api/v1/harness-items/${id}`),

  importItems: (projectId: number, file: File) => {
    const body = new FormData()
    body.append('file', file)
    return client.post<never, { imported: number }>(`/api/v1/harness-projects/${projectId}/items/import`, body)
  },

  exportItems: (projectId: number, ids: number[]) =>
    client.get<never, Blob>(`/api/v1/harness-projects/${projectId}/items/export`, {
      params: { ids: ids.join(',') },
      responseType: 'blob',
    }),

  downloadImportTemplate: () =>
    client.get<never, Blob>('/api/v1/harness-items/import-template', { responseType: 'blob' }),
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadHarnessExport(projectId: number, ids: number[]) {
  const blob = await harnessLedgerApi.exportItems(projectId, ids)
  saveBlob(blob, '线束明细.csv')
}

export async function downloadHarnessImportTemplate() {
  const blob = await harnessLedgerApi.downloadImportTemplate()
  saveBlob(blob, '线束导入模板.csv')
}

export async function downloadProjectAttachment(projectId: number, filename: string) {
  const blob = await harnessLedgerApi.downloadAttachment(projectId)
  saveBlob(blob, filename || '附件')
}
