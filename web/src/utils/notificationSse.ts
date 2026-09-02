import { getElectronCapability, supportsSecureStorage } from '@/utils/electronCapabilities'
import { isElectron } from '@/utils/platform'
import { traceIdHeaders } from '@/utils/trace'

const REFRESH_TOKEN_KEY = 'lims-refresh-token'

/** Web：同域 Cookie；Electron：Authorization Bearer（避免 token 进入 URL/日志） */
export function connectNotificationSSE(
  url: string,
  accessToken: string | null,
  onMessage: (data: string) => void,
): () => void {
  if (isElectron()) {
    if (!accessToken) return () => {}
    return connectFetchSSE(url, accessToken, onMessage)
  }

  const es = new EventSource(url)
  es.onmessage = (event) => onMessage(event.data)
  es.onerror = () => {
    // EventSource 会自动重连
  }
  return () => es.close()
}

function connectFetchSSE(
  url: string,
  accessToken: string,
  onMessage: (data: string) => void,
): () => void {
  const controller = new AbortController()
  let closed = false

  void (async () => {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: traceIdHeaders({
          Accept: 'text/event-stream',
          Authorization: `Bearer ${accessToken}`,
        }),
        credentials: 'include',
        signal: controller.signal,
      })
      if (!res.ok || !res.body) return

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (!closed) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        buffer = consumeSSEBuffer(buffer, onMessage)
      }
    } catch {
      // 网络波动时静默，外层可依赖轮询 unread-count
    }
  })()

  return () => {
    closed = true
    controller.abort()
  }
}

function consumeSSEBuffer(buffer: string, onMessage: (data: string) => void): string {
  const parts = buffer.split('\n\n')
  const rest = parts.pop() ?? ''
  for (const block of parts) {
    for (const line of block.split('\n')) {
      if (line.startsWith('data:')) {
        onMessage(line.slice(5).trimStart())
      }
    }
  }
  return rest
}

export async function loadElectronRefreshToken(): Promise<string | null> {
  if (!isElectron() || !supportsSecureStorage()) return null
  try {
    return await getElectronCapability('secureStorageGet')!(REFRESH_TOKEN_KEY)
  } catch (err) {
    console.warn('[lims] secureStorageGet failed', err)
    return null
  }
}

export async function saveElectronRefreshToken(token: string | null): Promise<void> {
  if (!isElectron() || !supportsSecureStorage()) return
  try {
    if (token) {
      await getElectronCapability('secureStorageSet')!(REFRESH_TOKEN_KEY, token)
    } else {
      await getElectronCapability('secureStorageRemove')!(REFRESH_TOKEN_KEY)
    }
  } catch (err) {
    // 登录/刷新不应因旧壳缺少安全存储而中断；会话仍可在内存中继续。
    console.warn('[lims] secure storage write failed', err)
  }
}
