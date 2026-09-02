import type {
  SampleLabelPrintConfig,
  SampleLabelPrintLayout,
} from '@/api/types'

export type { SampleLabelPrintConfig, SampleLabelPrintLayout, SampleLabelPrinterProfile } from '@/api/types'

export interface SampleLabelLayoutOptions {
  widthMm: number
  heightMm: number
  fontSizePt: number
  statusFontSizePt: number
  paddingTopMm: number
  paddingRightMm: number
  paddingBottomMm: number
  paddingLeftMm: number
  offsetXmm?: number
  offsetYmm?: number
}

export const DEFAULT_SAMPLE_LABEL_PRINT_CONFIG: SampleLabelPrintConfig = {
  layout: {
    width_mm: 60,
    height_mm: 40,
    font_size_pt: 8,
    status_font_size_pt: 7,
    padding_top_mm: 2,
    padding_right_mm: 2.5,
    padding_bottom_mm: 1.5,
    padding_left_mm: 2.5,
    offset_x_mm: 0,
    offset_y_mm: 0,
  },
  printer_name_patterns: [
    'dl-720',
    '720w',
    'deli',
    '得力',
  ],
  printer_profiles: [],
}

export function toSampleLabelLayoutOptions(
  layout: SampleLabelPrintLayout = DEFAULT_SAMPLE_LABEL_PRINT_CONFIG.layout,
): SampleLabelLayoutOptions {
  return {
    widthMm: layout.width_mm,
    heightMm: layout.height_mm,
    fontSizePt: layout.font_size_pt,
    statusFontSizePt: layout.status_font_size_pt,
    paddingTopMm: layout.padding_top_mm,
    paddingRightMm: layout.padding_right_mm,
    paddingBottomMm: layout.padding_bottom_mm,
    paddingLeftMm: layout.padding_left_mm,
    offsetXmm: layout.offset_x_mm ?? 0,
    offsetYmm: layout.offset_y_mm ?? 0,
  }
}

export function resolveLayoutWithProfileOffset(
  config: SampleLabelPrintConfig,
  profileId?: string,
): SampleLabelLayoutOptions {
  const profile = profileId
    ? config.printer_profiles.find((item) => item.id === profileId)
    : undefined
  const base = toSampleLabelLayoutOptions(config.layout)
  return {
    ...base,
    offsetXmm: (config.layout.offset_x_mm ?? 0) + (profile?.offset_x_mm ?? 0),
    offsetYmm: (config.layout.offset_y_mm ?? 0) + (profile?.offset_y_mm ?? 0),
  }
}

export function mergeSampleLabelPrintConfig(
  partial?: Partial<SampleLabelPrintConfig> | null,
): SampleLabelPrintConfig {
  if (!partial) return DEFAULT_SAMPLE_LABEL_PRINT_CONFIG
  return {
    layout: { ...DEFAULT_SAMPLE_LABEL_PRINT_CONFIG.layout, ...partial.layout },
    printer_name_patterns:
      partial.printer_name_patterns?.length
        ? partial.printer_name_patterns
        : DEFAULT_SAMPLE_LABEL_PRINT_CONFIG.printer_name_patterns,
    printer_profiles: partial.printer_profiles ?? [],
  }
}

export function formatSampleLabelSize(config: SampleLabelPrintConfig): string {
  const { width_mm: w, height_mm: h } = config.layout
  return `${w}×${h}mm`
}

function compilePattern(pattern: string): RegExp | null {
  const trimmed = pattern.trim()
  if (!trimmed) return null
  try {
    return new RegExp(trimmed, 'i')
  } catch {
    return new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  }
}

function normalizePrinterMatchText(value: string | undefined): string {
  return String(value ?? '').trim().normalize('NFKC')
}

/** 精臣 NIIMBOT M3 在 Windows/蓝牙下的常见命名：M3-I413060182、M3_xxx 等 */
export function isNiimbotM3LikePrinter(
  printer: Pick<DesktopPrinter, 'name' | 'displayName'>,
): boolean {
  const haystacks = [printer.displayName, printer.name]
    .map(normalizePrinterMatchText)
    .filter(Boolean)
  return haystacks.some(
    (text) =>
      /^M3(?:[-_\s]|$|\d)/i.test(text) ||
      /\bNIIMBOT\b.*\bM3\b/i.test(text) ||
      /\bM3\b.*\bNIIMBOT\b/i.test(text) ||
      /精臣.*M3/i.test(text) ||
      /^jc:\/\//i.test(text),
  )
}

/** 得力标签机（样品标签专用） */
export function isDeliLikePrinter(
  printer: Pick<DesktopPrinter, 'name' | 'displayName'>,
): boolean {
  if (isNiimbotM3LikePrinter(printer)) return false
  const haystacks = [printer.displayName, printer.name]
    .map(normalizePrinterMatchText)
    .filter(Boolean)
  return haystacks.some((text) => /dl-?720|720w|\bdeli\b|得力/i.test(text))
}

export function filterDeliPrinters(printers: DesktopPrinter[]): DesktopPrinter[] {
  return printers.filter(isDeliLikePrinter)
}

export function printerMatchesPatterns(
  printer: Pick<DesktopPrinter, 'name' | 'displayName'>,
  patterns: string[],
): boolean {
  if (patterns.length === 0) return true
  const haystacks = [printer.displayName, printer.name].map(normalizePrinterMatchText)
  return patterns.some((pattern) => {
    const regex = compilePattern(pattern)
    if (!regex) return false
    return haystacks.some((text) => text.length > 0 && regex.test(text))
  })
}

export function filterPrintersByPatterns(
  printers: DesktopPrinter[],
  patterns: string[],
): DesktopPrinter[] {
  if (patterns.length === 0) return printers
  return printers.filter((printer) => printerMatchesPatterns(printer, patterns))
}

export function pickPrinterByPatterns(
  printers: DesktopPrinter[],
  patterns: string[],
): string | undefined {
  const matched = filterPrintersByPatterns(printers, patterns)
  return matched.find(isDeliLikePrinter)?.name ?? matched[0]?.name
}
