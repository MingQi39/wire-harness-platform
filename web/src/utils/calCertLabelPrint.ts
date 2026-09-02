import dayjs from 'dayjs'
import type { CertificatePrepareTableRow } from '@/pages/certificateReport/certificatePrepareTypes'
import { resolveCertificatePrepareValidityPeriod } from '@/pages/certificateReport/certificatePrepareFormUtils'
import type { CalCertLabelLayoutOptions } from '@/constants/calCertLabelConfig'
import { DEFAULT_CAL_CERT_LABEL_LAYOUT } from '@/constants/calCertLabelConfig'
import { DESKTOP_LABEL_PRINT_UPGRADE_MESSAGE, getElectronCapability } from '@/utils/electronCapabilities'

/** 校准证标签单张数据（与 Electron 主进程 calCertLabelPrint 一致） */
export interface CalCertLabelPayload {
  serialNo: string
  calibrationDate: string
  recalibrationDate: string
  companyName: string
}

export interface CalCertLabelPrintResult {
  success: boolean
  printed: number
  error?: string
  debugLogs?: string[]
}

/** 标签上缺失字段的统一占位符 */
export const CAL_CERT_LABEL_EMPTY = '-'

export function formatCalCertSerialNo(factoryNumber: string, manageNumber: string): string {
  const factory = factoryNumber.trim()
  const manage = manageNumber.trim()
  if (factory && manage) return `${factory}/${manage}`
  return factory || manage || CAL_CERT_LABEL_EMPTY
}

/** 建议复校日期 = 校准日期 + 有效期（月）- 1 天 */
export function computeRecalibrationDate(calibrationDate: string, validityMonths: number): string {
  const base = dayjs(calibrationDate.trim())
  if (!base.isValid()) return ''
  return base.add(validityMonths, 'month').subtract(1, 'day').format('YYYY-MM-DD')
}

export function buildCalCertLabelPayload(
  row: CertificatePrepareTableRow,
  companyName: string,
): CalCertLabelPayload {
  const cp = row.certificate_prepare
  const calibrationDate = String(cp?.calibration_date ?? '').trim()
  const validityMonths = resolveCertificatePrepareValidityPeriod(cp) ?? 12
  const recalibrationDate = calibrationDate
    ? computeRecalibrationDate(calibrationDate, validityMonths) || CAL_CERT_LABEL_EMPTY
    : CAL_CERT_LABEL_EMPTY
  return {
    serialNo: formatCalCertSerialNo(row.factory_number, row.manage_number),
    calibrationDate: calibrationDate || CAL_CERT_LABEL_EMPTY,
    recalibrationDate,
    companyName: companyName.trim() || CAL_CERT_LABEL_EMPTY,
  }
}

export function buildCalCertLabelPayloads(
  rows: CertificatePrepareTableRow[],
  companyName: string,
): CalCertLabelPayload[] {
  return rows.map((row) => buildCalCertLabelPayload(row, companyName))
}

export async function printCalCertLabelsDirect(
  labels: CalCertLabelPayload[],
  deviceName: string,
  layout: CalCertLabelLayoutOptions = DEFAULT_CAL_CERT_LABEL_LAYOUT,
): Promise<CalCertLabelPrintResult> {
  const printCalCertLabels = getElectronCapability('printCalCertLabels')
  if (!printCalCertLabels) {
    return { success: false, printed: 0, error: DESKTOP_LABEL_PRINT_UPGRADE_MESSAGE }
  }
  if (labels.length === 0) {
    return { success: false, printed: 0, error: '请先勾选要打印的证书行' }
  }
  const printer = deviceName.trim()
  if (!printer) {
    return { success: false, printed: 0, error: '请先选择标签打印机' }
  }
  return printCalCertLabels(labels, { deviceName: printer, layout })
}
