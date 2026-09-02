import client from './client'
import type { ColumnPreferences } from '@/components/ConfigurableTable/types'

const LS_PREFIX = 'wire-harness-table-prefs:'

function readLocal(tableKey: string): { preferences: ColumnPreferences | null } {
  try {
    const raw = localStorage.getItem(LS_PREFIX + tableKey)
    if (!raw) return { preferences: null }
    return { preferences: JSON.parse(raw) as ColumnPreferences }
  } catch {
    return { preferences: null }
  }
}

function writeLocal(tableKey: string, prefs: ColumnPreferences) {
  localStorage.setItem(LS_PREFIX + tableKey, JSON.stringify(prefs))
}

export const meApi = {
  getTablePreferences: async (tableKey: string) => readLocal(tableKey),

  putTablePreferences: async (tableKey: string, preferences: ColumnPreferences) => {
    writeLocal(tableKey, preferences)
    try {
      await client.put(`/api/v1/me/table-preferences/${tableKey}`, { preferences })
    } catch {
      /* backend optional */
    }
    return { preferences }
  },
}
