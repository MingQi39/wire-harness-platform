/** 解析 JWT payload 中的 exp（秒），失败返回 null */
export function getAccessTokenExpirySec(token: string): number | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  const payloadPart = parts[1]
  if (!payloadPart) return null
  try {
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const payload = JSON.parse(atob(padded)) as { exp?: unknown }
    return typeof payload.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp : null
  } catch {
    return null
  }
}

/** access token 是否已过期或即将过期（默认预留 30s，避免边界 401） */
export function isAccessTokenExpired(token: string, skewMs = 30_000): boolean {
  const expSec = getAccessTokenExpirySec(token)
  if (expSec == null) return true
  return Date.now() >= expSec * 1000 - skewMs
}
