import type { ColumnPreferences, TableColumnDef } from './types'

export function getCellValue<T>(record: T, dataIndex: TableColumnDef<T>['dataIndex']): unknown {
  if (dataIndex == null) return undefined
  if (Array.isArray(dataIndex)) {
    let o: unknown = record
    for (const k of dataIndex) {
      o = (o as Record<string | number, unknown>)?.[k]
    }
    return o
  }
  return (record as Record<string, unknown>)?.[dataIndex as string]
}

function valueToCopyString(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'bigint') return String(v)
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    return String(v)
  }
  if (v instanceof Date) {
    return v.toISOString()
  }
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v)
    } catch {
      return String(v)
    }
  }
  return String(v)
}

/** 与单元格「复制」按钮一致：解析要写入剪贴板的纯文本 */
export function getCopyStringForCell<T>(def: TableColumnDef<T>, value: unknown, record: T): string {
  if (def.getCopyText) return def.getCopyText(value, record)
  if (def.dataIndex != null) {
    return valueToCopyString(getCellValue(record, def.dataIndex))
  }
  return valueToCopyString(value)
}

export function buildDefaultPreferences<T>(defs: TableColumnDef<T>[]): ColumnPreferences {
  const visibility: Record<string, boolean> = {}
  const fixed: Record<string, false | 'left' | 'right'> = {}
  const filterOn: Record<string, boolean> = {}
  const sortOn: Record<string, boolean> = {}
  const copyOn: Record<string, boolean> = {}
  const order: string[] = []

  for (const d of defs) {
    order.push(d.key)
    visibility[d.key] = d.defaultVisible !== false
    fixed[d.key] = d.defaultFixed === undefined ? false : d.defaultFixed
    filterOn[d.key] = d.dataIndex != null && d.filterable !== false && !!d.filterDefaultOn
    sortOn[d.key] = d.dataIndex != null && d.sortable !== false && !!d.sortDefaultOn
    copyOn[d.key] = !!d.copyDefaultOn
  }

  return { visibility, fixed, filterOn, sortOn, copyOn, order }
}

export function normalizeOrder(order: string[], allKeys: string[]): string[] {
  const seen = new Set<string>()
  const next: string[] = []
  for (const k of order) {
    if (allKeys.includes(k) && !seen.has(k)) {
      seen.add(k)
      next.push(k)
    }
  }
  for (const k of allKeys) {
    if (!seen.has(k)) next.push(k)
  }
  return next
}

function promoteSerialColumnFirst(order: string[]): string[] {
  const serialKey = '__serial_index'
  if (order[0] === serialKey || !order.includes(serialKey)) return order
  return [serialKey, ...order.filter((key) => key !== serialKey)]
}

function forceNonHideableVisible<T>(prefs: ColumnPreferences, defs: TableColumnDef<T>[]): ColumnPreferences {
  const visibility = { ...prefs.visibility }
  for (const d of defs) {
    if (d.hideable === false) visibility[d.key] = true
  }
  return { ...prefs, visibility }
}

function forceUnsupportedCapabilitiesOff<T>(prefs: ColumnPreferences, defs: TableColumnDef<T>[]): ColumnPreferences {
  const filterOn = { ...prefs.filterOn }
  const sortOn = { ...prefs.sortOn }
  const copyOn = { ...prefs.copyOn }
  for (const d of defs) {
    if (d.dataIndex == null || d.filterable === false) filterOn[d.key] = false
    if (d.dataIndex == null || d.sortable === false) sortOn[d.key] = false
    if (d.copyable === false) copyOn[d.key] = false
  }
  return { ...prefs, filterOn, sortOn, copyOn }
}

export function mergePreferences<T>(
  loaded: Partial<ColumnPreferences> | null,
  defs: TableColumnDef<T>[],
): ColumnPreferences {
  const base = buildDefaultPreferences(defs)
  const allKeys = defs.map((d) => d.key)

  if (!loaded) return forceUnsupportedCapabilitiesOff(forceNonHideableVisible(base, defs), defs)

  const merged: ColumnPreferences = {
    visibility: { ...base.visibility, ...loaded.visibility },
    fixed: { ...base.fixed, ...loaded.fixed },
    filterOn: { ...base.filterOn, ...loaded.filterOn },
    sortOn: { ...base.sortOn, ...loaded.sortOn },
    copyOn: { ...base.copyOn, ...loaded.copyOn },
    order: promoteSerialColumnFirst(normalizeOrder(loaded.order ?? [], allKeys)),
  }
  return forceUnsupportedCapabilitiesOff(forceNonHideableVisible(merged, defs), defs)
}

export function countVisible<T = unknown>(prefs: ColumnPreferences, defs: TableColumnDef<T>[]): number {
  let n = 0
  for (const d of defs) {
    if (prefs.visibility[d.key] !== false) n++
  }
  return n
}
