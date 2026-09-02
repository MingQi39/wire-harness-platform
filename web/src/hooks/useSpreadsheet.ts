import { useExport } from './useExport'
import { useImport, type UseImportOptions } from './useImport'
import type { ImportResp } from '@/api/types'

export interface UseSpreadsheetExportOptions {
  /** 下载文件名前缀，不含扩展名，如 customers、客户导入模板 */
  filenamePrefix: string
  /** 文件扩展名，默认 xlsx */
  fileExtension?: string
}

/**
 * 表格导出（Excel）：基于 useExport，统一 `.xlsx` 与时间戳后缀。
 * 请求函数须返回 Blob（如 `getSpreadsheetBlob` / `postSpreadsheetBlob` 的 Promise）。
 */
export function useSpreadsheetExport<P = void>(
  exportFn: (params: P) => Promise<unknown>,
  options: UseSpreadsheetExportOptions,
) {
  const ext = options.fileExtension ?? 'xlsx'
  return useExport(exportFn, {
    filename: () => `${options.filenamePrefix}_${Date.now()}.${ext}`,
  })
}

/**
 * 表格导入（CSV / XLSX）：与 useImport 相同，命名统一便于与 `postSpreadsheetImport` 搭配。
 */
export function useSpreadsheetImport(
  importFn: (file: File) => Promise<ImportResp>,
  options: UseImportOptions,
) {
  return useImport(importFn, options)
}
