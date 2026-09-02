import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { meApi } from '@/api/me'
import { useAuthStore } from '@/stores/authStore'
import type { ColumnPreferences, TableColumnDef } from './types'
import { buildDefaultPreferences, mergePreferences } from './columnUtils'

const LEGACY_LS_PREFIX = 'lims-table-prefs:'

function readLegacyLocalStorage(storageKey: string): Partial<ColumnPreferences> | null {
  try {
    const raw = localStorage.getItem(LEGACY_LS_PREFIX + storageKey)
    if (!raw) return null
    return JSON.parse(raw) as Partial<ColumnPreferences>
  } catch {
    return null
  }
}

function clearLegacyLocalStorage(storageKey: string) {
  try {
    localStorage.removeItem(LEGACY_LS_PREFIX + storageKey)
  } catch {
    /* ignore */
  }
}

const prefSaveDelayMs = 450

function tablePrefQueryKey(tableKey: string) {
  return ['me', 'table-preferences', tableKey] as const
}

export function useColumnPreferences<T>(storageKey: string, defs: TableColumnDef<T>[]) {
  const defaults = useMemo(() => buildDefaultPreferences(defs), [defs])
  const defSig = useMemo(() => defs.map((d) => d.key).join('|'), [defs])
  const defsRef = useRef(defs)
  defsRef.current = defs

  const accessToken = useAuthStore((s) => s.accessToken)
  const enabled = Boolean(accessToken && storageKey)

  const [prefs, setPrefsState] = useState<ColumnPreferences>(() =>
    mergePreferences(null, defsRef.current),
  )

  useEffect(() => {
    setPrefsState(mergePreferences(null, defsRef.current))
  }, [storageKey])

  const { data, isFetched, isPending } = useQuery({
    queryKey: tablePrefQueryKey(storageKey),
    queryFn: () => meApi.getTablePreferences(storageKey),
    enabled,
    staleTime: 5 * 60 * 1000,
  })

  const putMutation = useMutation({
    mutationFn: (payload: { tableKey: string; preferences: ColumnPreferences }) =>
      meApi.putTablePreferences(payload.tableKey, payload.preferences),
  })

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flushSaveTimer = useCallback(() => {
    if (saveTimerRef.current != null) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
  }, [])

  // 登出或 token 清空：取消待写入的防抖请求，并重置列状态（避免换账号后误写或短暂展示上一用户配置）
  useEffect(() => {
    if (!accessToken) {
      flushSaveTimer()
      setPrefsState(mergePreferences(null, defsRef.current))
    }
  }, [accessToken, flushSaveTimer])

  const scheduleSave = useCallback(
    (next: ColumnPreferences) => {
      flushSaveTimer()
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null
        putMutation.mutate({ tableKey: storageKey, preferences: next })
      }, prefSaveDelayMs)
    },
    [flushSaveTimer, putMutation, storageKey],
  )

  // 从服务端（及一次性 localStorage 迁移）合并到本地状态
  useEffect(() => {
    if (!enabled) {
      return
    }
    if (!isFetched || data == null) return

    let partial: Partial<ColumnPreferences> | null = data.preferences
    if (partial == null) {
      const legacy = readLegacyLocalStorage(storageKey)
      if (legacy) {
        partial = legacy
        const mergedForUpload = mergePreferences(legacy, defsRef.current)
        void meApi.putTablePreferences(storageKey, mergedForUpload).then(() => clearLegacyLocalStorage(storageKey)).catch(() => {})
      }
    }
    setPrefsState(mergePreferences(partial, defsRef.current))
  }, [enabled, isFetched, data, storageKey, defSig])

  useEffect(() => {
    return () => flushSaveTimer()
  }, [flushSaveTimer])

  const setPrefs = useCallback(
    (updater: ColumnPreferences | ((prev: ColumnPreferences) => ColumnPreferences)) => {
      setPrefsState((prev) => {
        const next = typeof updater === 'function' ? (updater as (p: ColumnPreferences) => ColumnPreferences)(prev) : updater
        scheduleSave(next)
        return next
      })
    },
    [scheduleSave],
  )

  const resetPrefs = useCallback(() => {
    flushSaveTimer()
    setPrefsState(defaults)
    if (enabled) {
      putMutation.mutate({ tableKey: storageKey, preferences: defaults })
    }
  }, [defaults, enabled, flushSaveTimer, putMutation, storageKey])

  return { prefs, setPrefs, resetPrefs, defaults, isLoadingRemote: enabled && isPending }
}
