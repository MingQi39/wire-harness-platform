import { pickPrinterByPatterns } from '@/constants/sampleLabelConfig'

const DESKTOP_PRINT_PREFERENCES_KEY = 'lims.desktopPrintPreferences'
const LEGACY_SAMPLE_LABEL_PRINTER_KEY = 'lims.sampleLabelPrinter'

export interface SampleLabelPrintPreference {
  deviceName: string
}

interface DesktopPrintPreferences {
  sampleLabel?: SampleLabelPrintPreference
}

function readPreferences(): DesktopPrintPreferences {
  if (typeof window === 'undefined') return {}
  const raw = window.localStorage.getItem(DESKTOP_PRINT_PREFERENCES_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as DesktopPrintPreferences
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writePreferences(next: DesktopPrintPreferences): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(DESKTOP_PRINT_PREFERENCES_KEY, JSON.stringify(next))
}

/** 读取样品标签打印机偏好；兼容旧版 lims.sampleLabelPrinter */
export function readSampleLabelPrintPreference(): SampleLabelPrintPreference | undefined {
  const current = readPreferences().sampleLabel
  if (current?.deviceName?.trim()) return current

  if (typeof window === 'undefined') return undefined
  const legacy = window.localStorage.getItem(LEGACY_SAMPLE_LABEL_PRINTER_KEY)?.trim()
  if (!legacy) return undefined
  return { deviceName: legacy }
}

export function saveSampleLabelPrintPreference(preference: SampleLabelPrintPreference): void {
  if (typeof window === 'undefined') return
  const prefs = readPreferences()
  prefs.sampleLabel = {
    deviceName: preference.deviceName.trim(),
  }
  writePreferences(prefs)
  window.localStorage.removeItem(LEGACY_SAMPLE_LABEL_PRINTER_KEY)
}

export function resolveInitialSampleLabelDeviceName(
  printers: DesktopPrinter[],
  patterns: string[],
  saved?: SampleLabelPrintPreference | null,
): string {
  const names = new Set(printers.map((printer) => printer.name))
  const savedName = saved?.deviceName?.trim()
  if (savedName && names.has(savedName)) return savedName
  return pickPrinterByPatterns(printers, patterns) ?? ''
}
