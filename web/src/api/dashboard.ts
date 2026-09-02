import client from './client'

export interface DashboardStats {
  project_count: number
  item_count: number
  status: {
    in_use: number
    idle: number
    scrapped: number
  }
  recent_projects: Array<{
    id: number
    project_name: string
    platform_model: string
    item_count: number
  }>
}

export const dashboardApi = {
  getStats: () => client.get<never, DashboardStats>('/api/v1/dashboard/stats'),
}
