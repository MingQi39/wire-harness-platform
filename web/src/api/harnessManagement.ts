import client from './client'

export interface HarnessManagementItem {
  id: number
  project_id: number
  harness_name: string
  harness_no: string
  purpose: string
  status: 'in_use' | 'idle' | 'scrapped'
  status_label: string
  responsible_person: string
  stored_at: string | null
  stored_by: string
  outbound_at: string | null
  outbound_by: string
  scrapped_at: string | null
  scrap_confirmed_by: string
  lifecycle_status: string
  lifecycle_status_label: string
}

export interface HarnessOperationLogItem {
  id: number
  action: string
  action_label: string
  operator_name: string
  remark: string
  created_at: string
}

export const harnessManagementApi = {
  listItems: (projectId: number) =>
    client.get<never, HarnessManagementItem[]>(`/api/v1/harness-management/projects/${projectId}/items`),

  stockIn: (ids: number[]) =>
    client.post<never, void>('/api/v1/harness-management/stock-in', { ids }),

  stockOut: (ids: number[]) =>
    client.post<never, void>('/api/v1/harness-management/stock-out', { ids }),

  scrap: (ids: number[]) =>
    client.post<never, void>('/api/v1/harness-management/scrap', { ids }),

  listOperationLogs: (itemId: number) =>
    client.get<never, HarnessOperationLogItem[]>(`/api/v1/harness-management/items/${itemId}/operation-logs`),
}
