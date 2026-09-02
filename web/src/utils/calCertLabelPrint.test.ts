import { describe, expect, it } from 'vitest'
import type { CertificatePrepareTableRow } from '@/pages/certificateReport/certificatePrepareTypes'
import {
  buildCalCertLabelPayload,
  buildCalCertLabelPayloads,
  CAL_CERT_LABEL_EMPTY,
  computeRecalibrationDate,
  formatCalCertSerialNo,
} from './calCertLabelPrint'

function makeRow(partial: Partial<CertificatePrepareTableRow>): CertificatePrepareTableRow {
  return {
    rowKey: '1-0',
    commission_order_id: 1,
    updated_at: '2026-01-01T00:00:00Z',
    line_index: 0,
    order_number: 'CO-001',
    customer_name: '客户',
    customer_address: '',
    cert_org_name_zh: '',
    cert_address_zh: '',
    cert_number: 'CO-001-1',
    device_name: '卡尺',
    device_model: '0-150',
    factory_number: '',
    manage_number: '',
    manufacturer: '',
    ...partial,
  }
}

describe('formatCalCertSerialNo', () => {
  it('同时存在时以斜杠连接出厂编号与管理编号', () => {
    expect(formatCalCertSerialNo('EO916925', 'JR-IE-0038')).toBe('EO916925/JR-IE-0038')
  })

  it('仅有一项时返回该项', () => {
    expect(formatCalCertSerialNo('EO916925', '')).toBe('EO916925')
    expect(formatCalCertSerialNo('', 'JR-IE-0038')).toBe('JR-IE-0038')
  })

  it('两项皆空时返回占位符', () => {
    expect(formatCalCertSerialNo('', '')).toBe(CAL_CERT_LABEL_EMPTY)
  })
})

describe('computeRecalibrationDate', () => {
  it('校准日期 + 有效期（月）- 1 天', () => {
    expect(computeRecalibrationDate('2026-01-15', 12)).toBe('2027-01-14')
    expect(computeRecalibrationDate('2024-03-01', 12)).toBe('2025-02-28')
  })

  it('无效日期返回空字符串', () => {
    expect(computeRecalibrationDate('', 12)).toBe('')
  })
})

describe('buildCalCertLabelPayload', () => {
  it('从证书编制行生成标签字段', () => {
    const row = makeRow({
      factory_number: 'EO916925',
      manage_number: 'JR-IE-0038',
      certificate_prepare: {
        calibration_date: '2026-08-12',
        validity_period: '12',
      },
    })
    expect(buildCalCertLabelPayload(row, '深圳精宇航检测技术有限公司')).toEqual({
      serialNo: 'EO916925/JR-IE-0038',
      calibrationDate: '2026-08-12',
      recalibrationDate: '2027-08-11',
      companyName: '深圳精宇航检测技术有限公司',
    })
  })

  it('缺少字段时用 "-" 占位，仍可生成 payload', () => {
    const row = makeRow({
      certificate_prepare: { validity_period: '12' },
    })
    expect(buildCalCertLabelPayload(row, '公司')).toEqual({
      serialNo: CAL_CERT_LABEL_EMPTY,
      calibrationDate: CAL_CERT_LABEL_EMPTY,
      recalibrationDate: CAL_CERT_LABEL_EMPTY,
      companyName: '公司',
    })
  })
})

describe('buildCalCertLabelPayloads', () => {
  it('批量生成，缺失数据行同样输出占位符', () => {
    const rows = [
      makeRow({
        factory_number: 'A',
        certificate_prepare: { calibration_date: '2026-01-01', validity_period: '6' },
      }),
      makeRow({
        cert_number: 'CO-001-2',
        factory_number: 'B',
        certificate_prepare: { validity_period: '6' },
      }),
    ]
    expect(buildCalCertLabelPayloads(rows, '公司')).toEqual([
      {
        serialNo: 'A',
        calibrationDate: '2026-01-01',
        recalibrationDate: '2026-06-30',
        companyName: '公司',
      },
      {
        serialNo: 'B',
        calibrationDate: CAL_CERT_LABEL_EMPTY,
        recalibrationDate: CAL_CERT_LABEL_EMPTY,
        companyName: '公司',
      },
    ])
  })
})
