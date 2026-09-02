import dayjs from 'dayjs'

export const DISPLAY_DATE_FORMAT = 'YYYY年MM月DD日'
export const DISPLAY_DATETIME_FORMAT = 'YYYY年MM月DD日 HH:mm:ss'

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export function formatDate(value: unknown): string {
  const text = String(value ?? '').trim()
  if (!text) return '—'
  const parsed = dayjs(text)
  return parsed.isValid() ? parsed.format(DISPLAY_DATE_FORMAT) : text
}

export function formatDateTime(value: unknown): string {
  const text = String(value ?? '').trim()
  if (!text) return '—'
  const parsed = dayjs(text)
  if (parsed.isValid()) {
    return parsed.format(DISPLAY_DATETIME_FORMAT)
  }

  // 兜底：兼容已格式化为“YYYY年MM月DD日”的旧数据，强制补秒
  const zhDateMatch = text.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/)
  if (zhDateMatch) {
    const year = Number(zhDateMatch[1])
    const month = Number(zhDateMatch[2])
    const day = Number(zhDateMatch[3])
    return `${year}年${pad2(month)}月${pad2(day)}日 00:00:00`
  }

  return text
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 9) return '早安'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}
