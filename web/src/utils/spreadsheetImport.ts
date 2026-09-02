import readXlsxFile from 'read-excel-file'

/**
 * 富文本片段。`html` 仅在该单元格含有内联富文本（斜体/上下标）时存在；前端可借此渲染。
 * 字段语义与 OOXML rich text 一一对应：italic → `<i>`，vertAlign=subscript → `<sub>`，vertAlign=superscript → `<sup>`。
 */
export interface SpreadsheetRichTextCell {
  text: string
  html?: string
}

/**
 * 去掉 UTF-8 BOM（U+FEFF）：不移除普通前导空白。
 * 先去掉流首连续 BOM；再去掉「一段 ASCII 空白后的首个 BOM」（兼容异常导出），循环直到不变。
 */
export function stripSpreadsheetBom(s: string): string {
  if (!s) return s
  let out = s
  for (;;) {
    const before = out
    while (out.length && out.charCodeAt(0) === 0xfeff) {
      out = out.slice(1)
    }
    out = out.replace(/^([\t\n\v\f\r ]+)\uFEFF/, '$1')
    if (out === before) break
  }
  return out
}

/** RFC 式 CSV 单行解析（支持引号与逗号） */
export function parseSpreadsheetCsvLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
          continue
        }
        inQuotes = false
      } else {
        cur += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      result.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  result.push(cur)
  return result
}

/** 将 UTF-8 CSV 全文解析为二维表（每行已拆列），不含表头语义 */
export function parseUtf8CsvTextToMatrix(text: string): string[][] {
  const raw = stripSpreadsheetBom(String(text ?? ''))
  if (!raw.trim()) return []
  const physicalLines = raw.split(/\r\n|\n|\r/).filter((l) => l.length > 0)
  return physicalLines.map((line) => parseSpreadsheetCsvLine(line))
}

/** 将 XLSX 读出的单元格统一为字符串（含 Date → YYYY-MM-DD） */
export function coerceSpreadsheetMatrix(rows: unknown[][]): string[][] {
  return rows.map((row) =>
    (row ?? []).map((cell) => {
      if (cell == null || cell === '') return ''
      if (cell instanceof Date) {
        const d = cell
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
      }
      return String(cell).trim()
    }),
  )
}

/** HTML 文本属性转义：避免单元格中出现 `<` `>` `&` 之类字符被误当作标签解析（标签由本模块按字段类型显式拼接）。 */
function escapeHtmlAttrText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** ExcelJS RichText 片段（仅取我们关心的字段） */
interface ExcelJsRichTextRun {
  text?: string
  font?: {
    italic?: boolean
    bold?: boolean
    vertAlign?: 'subscript' | 'superscript'
  }
}

/**
 * 把 ExcelJS 的 richText 数组序列化为「白名单 HTML」：仅 `<i>` / `<b>` / `<sub>` / `<sup>`，无属性。
 * 同时返回拼接后的纯文本（用于回退到非富文本展示与下游写库）。
 * 若所有片段都没有任何格式标记，返回 `{ text, html: undefined }`，让上游退化为纯字符串。
 */
function serializeExcelJsRichText(runs: ExcelJsRichTextRun[]): { text: string; html?: string } {
  let text = ''
  let html = ''
  let hasFormatting = false
  for (const run of runs) {
    const raw = run?.text ?? ''
    text += raw
    let segment = escapeHtmlAttrText(raw)
    const font = run?.font
    if (font?.vertAlign === 'subscript') {
      segment = `<sub>${segment}</sub>`
      hasFormatting = true
    } else if (font?.vertAlign === 'superscript') {
      segment = `<sup>${segment}</sup>`
      hasFormatting = true
    }
    if (font?.italic) {
      segment = `<i>${segment}</i>`
      hasFormatting = true
    }
    if (font?.bold) {
      segment = `<b>${segment}</b>`
      hasFormatting = true
    }
    html += segment
  }
  return { text, html: hasFormatting ? html : undefined }
}

/** ExcelJS cell.value 形态（仅取我们关心的几种） */
type ExcelJsCellValue =
  | null
  | undefined
  | string
  | number
  | boolean
  | Date
  | { richText?: ExcelJsRichTextRun[] }
  | { text?: string; hyperlink?: string }
  | { formula?: string; result?: ExcelJsCellValue }
  | { error?: string }

function coerceExcelJsCellAsString(value: ExcelJsCellValue): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  if (value instanceof Date) {
    const d = value
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  if (typeof value === 'object') {
    if ('richText' in value && Array.isArray(value.richText)) {
      const { text } = serializeExcelJsRichText(value.richText)
      return text.trim()
    }
    if ('result' in value && value.result != null) {
      return coerceExcelJsCellAsString(value.result as ExcelJsCellValue)
    }
    if ('text' in value && typeof (value as { text?: unknown }).text === 'string') {
      return String((value as { text: string }).text).trim()
    }
    if ('error' in value && typeof (value as { error?: unknown }).error === 'string') {
      return ''
    }
  }
  return String(value).trim()
}

/**
 * 用 ExcelJS 读取首工作表，保留内联富文本（斜体/上下标）。
 * 单元格值：富文本 → HTML 字符串（仅 `<i>` `<b>` `<sub>` `<sup>`），其它 → 纯文本。
 * 仅用于「标准仪器」「标准物质」等需要保留科学计数与变量记号的导入场景。
 */
async function readSpreadsheetFileAsRichMatrix(file: File): Promise<string[][]> {
  const { Workbook } = await import('exceljs')
  const wb = new Workbook()
  const buf = await file.arrayBuffer()
  await wb.xlsx.load(buf)
  const sheet = wb.worksheets[0]
  if (!sheet) return []
  let lastUsedRow = 0
  let lastUsedCol = 0
  // ExcelJS 的 rowCount/columnCount 在导入模板含尾部空行时仍会保留，需要按真实出现的单元格收敛
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > lastUsedRow) lastUsedRow = rowNumber
    row.eachCell({ includeEmpty: false }, (_cell, colNumber) => {
      if (colNumber > lastUsedCol) lastUsedCol = colNumber
    })
  })
  if (lastUsedRow === 0 || lastUsedCol === 0) return []
  const out: string[][] = []
  for (let r = 1; r <= lastUsedRow; r += 1) {
    const row = sheet.getRow(r)
    const arr: string[] = []
    for (let c = 1; c <= lastUsedCol; c += 1) {
      const cell = row.getCell(c)
      const raw = cell?.value as ExcelJsCellValue
      if (raw && typeof raw === 'object' && 'richText' in raw && Array.isArray(raw.richText)) {
        const { text, html } = serializeExcelJsRichText(raw.richText)
        // 单元格只有空白/换行的「假富文本」按纯文本处理，避免无意义包裹标签
        const trimmed = (html ?? text).trim()
        if (!trimmed) {
          arr.push('')
        } else if (html) {
          arr.push(html)
        } else {
          arr.push(text.trim())
        }
      } else {
        arr.push(coerceExcelJsCellAsString(raw))
      }
    }
    out.push(arr)
  }
  return out
}

/** 是否为 OOXML 表格（扩展名 / MIME），用于选择解析分支 */
export function isSpreadsheetXlsxFile(file: File): boolean {
  const n = file.name.toLowerCase()
  return (
    n.endsWith('.xlsx') ||
    n.endsWith('.xlsm') ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
}

/**
 * 读取用户选择的表格文件为字符串矩阵（首行即表头行，与后端导入语义一致）。
 * 支持 UTF-8 CSV 与 .xlsx/.xlsm 首工作表。
 *
 * 当 `options.preserveRichText` 为 true 时（仅 xlsx 生效），单元格中带斜体/上下标的富文本会被序列化为
 * 受限 HTML 字符串（仅 `<i>` `<b>` `<sub>` `<sup>`），以便上游字段保留科学计数与变量记号。
 * CSV 路径恒为纯文本（CSV 本身不承载富文本）。
 */
export async function readSpreadsheetFileAsMatrix(
  file: File,
  options?: { preserveRichText?: boolean },
): Promise<string[][]> {
  if (isSpreadsheetXlsxFile(file)) {
    if (options?.preserveRichText) {
      return readSpreadsheetFileAsRichMatrix(file)
    }
    const raw = await readXlsxFile(file)
    return coerceSpreadsheetMatrix(raw)
  }
  const text = await file.text()
  return parseUtf8CsvTextToMatrix(text)
}
