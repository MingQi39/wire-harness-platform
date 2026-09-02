import type { SampleLabelLayoutOptions, SampleLabelPrintConfig } from '@/constants/sampleLabelConfig'
import { resolveLayoutWithProfileOffset } from '@/constants/sampleLabelConfig'
import { appMessage } from '@/utils/appMessage'
import { DESKTOP_LABEL_PRINT_UPGRADE_MESSAGE, getElectronCapability } from '@/utils/electronCapabilities'
import type { SampleLabelPayload } from './sampleLabelPrint'

export interface SampleLabelPrintResult {
  success: boolean
  printed: number
  error?: string
  debugLogs?: string[]
}

export const SAMPLE_LABEL_TEST_PAYLOAD: SampleLabelPayload = {
  commissioningUnit: '测试委托单位',
  deviceName: '测试设备',
  factoryNumber: 'TEST-SN-001',
  manageNumber: 'TEST-MG-001',
  orderNumber: 'TEST-ORDER-001',
  attachment: '测试附件',
}

export async function renderSampleLabelPreviewHtml(
  layout: SampleLabelLayoutOptions,
  payload: SampleLabelPayload = SAMPLE_LABEL_TEST_PAYLOAD,
): Promise<string> {
  const renderSampleLabelHtml = getElectronCapability('renderSampleLabelHtml')
  if (!renderSampleLabelHtml) {
    throw new Error(DESKTOP_LABEL_PRINT_UPGRADE_MESSAGE)
  }
  return renderSampleLabelHtml(payload, layout)
}

export function showUnsafeSampleLabelPrintWarning(logs?: string[]): void {
  if (!logs?.length) return

  const text = logs.join('\n')
  const isStaleOrUnsafeNiimbotPipeline =
    (text.includes('NIIMBOT') || text.includes('M3-')) &&
    (text.includes('tspl-prepare') || text.includes('strategy":"captured-image"') || text.includes('strategy=captured-image') || text.includes('custom-page-size')) &&
    !text.includes('niimbot-safe-export-v3') &&
    !text.includes('niimbot-block-print')
  if (!isStaleOrUnsafeNiimbotPipeline) return

  appMessage().error({
    content:
      '检测到不安全的精臣打印管线（仍在静默出纸）。请重新打包并安装最新桌面客户端；仅更新网页无效。新版本会拦截连吐并导出预览图。',
    duration: 12,
  })
}

export async function printSampleLabelTest(
  deviceName: string,
  layout: SampleLabelLayoutOptions,
  payload: SampleLabelPayload = SAMPLE_LABEL_TEST_PAYLOAD,
): Promise<SampleLabelPrintResult> {
  const { printSampleLabelsDirect } = await import('./sampleLabelPrint')
  const result = await printSampleLabelsDirect([payload], deviceName, layout)
  if (!result.success) showUnsafeSampleLabelPrintWarning(result.debugLogs)
  return result
}

export function resolveSampleLabelLayoutForPrint(
  config?: Pick<SampleLabelPrintConfig, 'layout'> | null,
): SampleLabelLayoutOptions {
  if (!config) {
    return resolveLayoutWithProfileOffset({
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
      printer_name_patterns: [],
      printer_profiles: [],
    })
  }
  return resolveLayoutWithProfileOffset({
    layout: config.layout,
    printer_name_patterns: [],
    printer_profiles: [],
  })
}
