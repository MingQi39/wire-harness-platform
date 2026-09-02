/**
 * 是否运行在 Electron：仅桌面端通过 preload 在 window 上注入 electronAPI；
 * 浏览器访问同一构建产物时没有 preload，故为 false。
 * 与编译时 BUILD_TARGET 无关，便于 Web / Electron 共用同一套 bundle。
 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && Boolean(window.electronAPI)
}

export function getApiBaseUrl(): string {
  // 本地开发（Web + Electron）统一走 Vite 同域 /api 代理，避免：
  // 1) localhost 页面直连 127.0.0.1 API 触发 CORS；
  // 2) 浏览器把 /auth/refresh 视为跨站导致 SameSite=Lax Cookie 不附带。
  if (import.meta.env.DEV) {
    return ''
  }
  const configured = import.meta.env.VITE_API_BASE_URL
  if (typeof configured === 'string' && configured.trim() !== '') {
    return configured.replace(/\/$/, '')
  }
  return ''
}
