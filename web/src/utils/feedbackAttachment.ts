export function isFeedbackImageAttachment(contentType: string, fileName: string) {
  const ct = contentType.toLowerCase()
  if (ct.startsWith('image/')) return true
  const lower = fileName.toLowerCase()
  return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].some((ext) => lower.endsWith(ext))
}

export function isFeedbackVideoAttachment(contentType: string, fileName: string) {
  const ct = contentType.toLowerCase()
  if (ct.startsWith('video/')) return true
  const lower = fileName.toLowerCase()
  return lower.endsWith('.mp4') || lower.endsWith('.webm')
}

export function formatFeedbackFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
