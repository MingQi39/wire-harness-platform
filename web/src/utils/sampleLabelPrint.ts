import type { SampleWorkspaceCommissionOrder, SampleWorkspaceEquipmentLine } from '@/api/types'
import type { SampleLabelLayoutOptions } from '@/constants/sampleLabelConfig'
import {
  DESKTOP_LABEL_PRINT_UPGRADE_MESSAGE,
  getElectronCapability,
} from '@/utils/electronCapabilities'
import type { SampleLabelPrintResult } from './sampleLabelPrintActions'

/** 样品标签打印载荷（与 Electron 主进程 sampleLabelPrint 一致） */
export interface SampleLabelPayload {
  commissioningUnit: string
  deviceName: string
  factoryNumber: string
  manageNumber: string
  orderNumber: string
  attachment?: string
}

export type { SampleLabelLayoutOptions }

export function buildSampleLabelPayloads(
  rows: SampleWorkspaceEquipmentLine[],
  order: SampleWorkspaceCommissionOrder,
): SampleLabelPayload[] {
  const commissioningUnit = order.customer_name?.trim() || '—'
  const orderNumber = order.order_number?.trim() || '—'
  return rows.map((row) => ({
    commissioningUnit,
    deviceName: row.device_name?.trim() || '—',
    factoryNumber: row.factory_number?.trim() || '—',
    manageNumber: row.manage_number?.trim() || '—',
    orderNumber,
    attachment: row.attachment?.trim() || '',
  }))
}

export async function printSampleLabelsDirect(
  labels: SampleLabelPayload[],
  deviceName: string,
  layout: SampleLabelLayoutOptions,
): Promise<SampleLabelPrintResult> {
  const printSampleLabels = getElectronCapability('printSampleLabels')
  if (!printSampleLabels) {
    return { success: false, printed: 0, error: DESKTOP_LABEL_PRINT_UPGRADE_MESSAGE }
  }
  if (labels.length === 0) {
    return { success: false, printed: 0, error: '请先勾选要打印的设备' }
  }
  const printer = deviceName.trim()
  if (!printer) {
    return { success: false, printed: 0, error: '请先选择标签打印机' }
  }

  return printSampleLabels(labels, { deviceName: printer, layout })
}
