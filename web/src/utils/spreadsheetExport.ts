const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function normalizeSheetName(name: string): string {
  const cleaned = (name || 'Sheet1').trim().replace(/[\\/?*[\]:]/g, '_')
  return Array.from(cleaned || 'Sheet1').slice(0, 31).join('')
}

/**
 * 仅识别这四种内联富文本标签；与 `RichInlineText.tsx` / `RichInlineTextEditor.tsx` 以及
 * `spreadsheetImport.ts` 的 `serializeExcelJsRichText` 严格对称，保证导入 → 编辑 → 导出 round-trip 一致。
 */
type AllowedInlineTag = 'i' | 'b' | 'sub' | 'sup'
const INLINE_TAG_SET = new Set<AllowedInlineTag>(['i', 'b', 'sub', 'sup'])

/** ExcelJS RichTextRun 字段映射（仅取我们生成的几项）。 */
interface ExcelJsRichTextRun {
  text: string
  font?: {
    italic?: boolean
    bold?: boolean
    vertAlign?: 'subscript' | 'superscript'
  }
}

/** `<sub>` / `<sup>` 互斥，靠最内层声明决定；italic / bold 独立叠加。 */
interface RichTextStyle {
  italic?: boolean
  bold?: boolean
  vertAlign?: 'subscript' | 'superscript'
}

function decodeHtmlEntities(s: string): string {
  if (!s || s.indexOf('&') < 0) return s
  return s.replace(/&(#x?[0-9A-Fa-f]+|amp|lt|gt|quot|apos|nbsp);/g, (m, code: string) => {
    if (code === 'amp') return '&'
    if (code === 'lt') return '<'
    if (code === 'gt') return '>'
    if (code === 'quot') return '"'
    if (code === 'apos') return "'"
    if (code === 'nbsp') return '\u00a0'
    if (code.startsWith('#x') || code.startsWith('#X')) {
      const n = parseInt(code.slice(2), 16)
      if (Number.isFinite(n)) return String.fromCodePoint(n)
    } else if (code.startsWith('#')) {
      const n = parseInt(code.slice(1), 10)
      if (Number.isFinite(n)) return String.fromCodePoint(n)
    }
    return m
  })
}

function makeRunFont(style: RichTextStyle): ExcelJsRichTextRun['font'] | undefined {
  const font: NonNullable<ExcelJsRichTextRun['font']> = {}
  if (style.italic) font.italic = true
  if (style.bold) font.bold = true
  if (style.vertAlign) font.vertAlign = style.vertAlign
  return Object.keys(font).length > 0 ? font : undefined
}

/**
 * 把含 `<i>` `<b>` `<sub>` `<sup>` 的内联富文本字符串解析成 ExcelJS RichText runs；
 * 解析失败、不含尖括号或不含白名单标签时返回 `null`（调用方按纯文本写入即可）。
 *
 * 与 `RichInlineText.parseRichInline` 严格对称：未识别标签 / 闭合不齐时整体回退 null，由调用方
 * 走 plain string 路径，避免向 Excel 写入半截标签字面值。
 */
export function parseInlineRichTextToExcelJsRuns(value: string): ExcelJsRichTextRun[] | null {
  if (!value || value.indexOf('<') < 0) return null

  const runs: ExcelJsRichTextRun[] = []
  const stack: AllowedInlineTag[] = []
  let i = 0
  const len = value.length
  const flush = (text: string) => {
    if (!text) return
    const style: RichTextStyle = {}
    for (const tag of stack) {
      if (tag === 'i') style.italic = true
      else if (tag === 'b') style.bold = true
      else if (tag === 'sub') style.vertAlign = 'subscript'
      else if (tag === 'sup') style.vertAlign = 'superscript'
    }
    const font = makeRunFont(style)
    const run: ExcelJsRichTextRun = font ? { text, font } : { text }
    runs.push(run)
  }

  while (i < len) {
    const lt = value.indexOf('<', i)
    if (lt < 0) {
      flush(decodeHtmlEntities(value.slice(i)))
      i = len
      break
    }
    if (lt > i) flush(decodeHtmlEntities(value.slice(i, lt)))
    const gt = value.indexOf('>', lt + 1)
    if (gt < 0) return null
    const raw = value.slice(lt + 1, gt)
    const isClose = raw.startsWith('/')
    const tagName = (isClose ? raw.slice(1) : raw).trim().toLowerCase()
    if (!INLINE_TAG_SET.has(tagName as AllowedInlineTag)) return null
    if (isClose) {
      const top = stack[stack.length - 1]
      if (top !== tagName) return null
      stack.pop()
    } else {
      stack.push(tagName as AllowedInlineTag)
    }
    i = gt + 1
  }
  if (stack.length !== 0) return null
  // 没有任何标签时退化为 null，让调用方走 plain string 路径，避免被 ExcelJS 当 RichText 多写一份样式。
  const hasFormatting = runs.some((run) => run.font && Object.keys(run.font).length > 0)
  if (!hasFormatting) return null
  return runs
}

/**
 * 生成真正的 OOXML Excel 文件，供表格模板和导出下载使用。
 *
 * `richTextColumns`（1-based 列号集合）指定哪些列的字符串单元格应识别 `<i>` `<b>` `<sub>` `<sup>`
 * 并按 ExcelJS RichText 写入，避免用户在 Excel 中看到 `<i>U</i>=5HLD` 字面值。
 * 不在该集合内、或识别不到富文本标签的格子，仍按纯文本写入。
 */
export async function buildSpreadsheetXlsxBlob(
  rows: string[][],
  options?: {
    sheetName?: string
    columnWidths?: number[]
    /** 1-based 列号。命中后会尝试把字符串当作内联富文本写入；解析失败回退为纯文本。 */
    richTextColumns?: number[]
  },
): Promise<Blob> {
  const { Workbook } = await import('exceljs')
  const workbook = new Workbook()
  const worksheet = workbook.addWorksheet(normalizeSheetName(options?.sheetName ?? 'Sheet1'))

  const richTextColumnSet = new Set<number>(options?.richTextColumns ?? [])

  rows.forEach((row, rowIdx) => {
    const added = worksheet.addRow(row.map((cell) => String(cell ?? '')))
    if (rowIdx === 0 || richTextColumnSet.size === 0) {
      return
    }
    // 仅对数据行（rowIdx >= 1）做富文本识别；表头始终是纯文本表头。
    row.forEach((rawCell, colIdx) => {
      const colNumber = colIdx + 1
      if (!richTextColumnSet.has(colNumber)) return
      const value = String(rawCell ?? '')
      if (!value || value.indexOf('<') < 0) return
      const runs = parseInlineRichTextToExcelJsRuns(value)
      if (!runs || runs.length === 0) return
      // ExcelJS 单元格 richText 形态：cell.value = { richText: [...] }
      added.getCell(colNumber).value = { richText: runs }
    })
  })

  const firstRow = worksheet.getRow(1)
  firstRow.font = { bold: true }
  firstRow.alignment = { vertical: 'middle' }

  const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0)
  for (let i = 1; i <= maxColumns; i += 1) {
    worksheet.getColumn(i).width = options?.columnWidths?.[i - 1] ?? 14
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], { type: XLSX_MIME })
}
