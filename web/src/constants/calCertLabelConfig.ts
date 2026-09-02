import type { SampleLabelPrintConfig } from '@/api/types'
import { mergeSampleLabelPrintConfig } from '@/constants/sampleLabelConfig'

export interface CalCertLabelLayoutOptions {
  widthMm: number
  heightMm: number
  fontSizePt: number
  companyFontSizePt: number
  sideBannerWidthMm: number
  footerHeightMm: number
  paddingTopMm: number
  paddingRightMm: number
  paddingBottomMm: number
  paddingLeftMm: number
  offsetXmm?: number
  offsetYmm?: number
}

export const DEFAULT_CAL_CERT_LABEL_LAYOUT: CalCertLabelLayoutOptions = {
  widthMm: 40,
  heightMm: 20,
  fontSizePt: 7,
  companyFontSizePt: 5.5,
  sideBannerWidthMm: 6,
  footerHeightMm: 3.2,
  paddingTopMm: 0.8,
  paddingRightMm: 0.4,
  paddingBottomMm: 0.4,
  paddingLeftMm: 1.2,
  offsetXmm: 0,
  offsetYmm: 0,
}

/** 校准证标签仅使用精臣 USB SDK 打印机列表 */
export const DEFAULT_CAL_CERT_LABEL_PRINT_CONFIG: SampleLabelPrintConfig = mergeSampleLabelPrintConfig({
  layout: {
    width_mm: DEFAULT_CAL_CERT_LABEL_LAYOUT.widthMm,
    height_mm: DEFAULT_CAL_CERT_LABEL_LAYOUT.heightMm,
    font_size_pt: DEFAULT_CAL_CERT_LABEL_LAYOUT.fontSizePt,
    status_font_size_pt: DEFAULT_CAL_CERT_LABEL_LAYOUT.companyFontSizePt,
    padding_top_mm: DEFAULT_CAL_CERT_LABEL_LAYOUT.paddingTopMm,
    padding_right_mm: DEFAULT_CAL_CERT_LABEL_LAYOUT.paddingRightMm,
    padding_bottom_mm: DEFAULT_CAL_CERT_LABEL_LAYOUT.paddingBottomMm,
    padding_left_mm: DEFAULT_CAL_CERT_LABEL_LAYOUT.paddingLeftMm,
    offset_x_mm: 0,
    offset_y_mm: 0,
  },
  printer_name_patterns: ["^jc://", "精臣", "niimbot", "^M3"],
})

export function resolveCalCertLabelLayoutForPrint(): CalCertLabelLayoutOptions {
  return { ...DEFAULT_CAL_CERT_LABEL_LAYOUT }
}

export function formatCalCertLabelSize(): string {
  const { widthMm, heightMm } = DEFAULT_CAL_CERT_LABEL_LAYOUT
  return `${widthMm}×${heightMm}mm`
}
