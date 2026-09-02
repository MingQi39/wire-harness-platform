import type { QueryClient } from '@tanstack/react-query'

/** 台账与线束管理共用数据源，变更后统一刷新相关缓存。 */
export function invalidateHarnessData(qc: QueryClient, projectId?: number | null) {
  void qc.invalidateQueries({ queryKey: ['harness-projects'] })
  void qc.invalidateQueries({ queryKey: ['harness-items'] })
  void qc.invalidateQueries({ queryKey: ['harness-management-items'] })
  void qc.invalidateQueries({ queryKey: ['harness-operation-logs'] })
  void qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
  if (projectId != null && projectId > 0) {
    void qc.invalidateQueries({ queryKey: ['harness-items', projectId] })
    void qc.invalidateQueries({ queryKey: ['harness-management-items', projectId] })
  }
}
