import { supportsDesktopAutoUpdateListeners } from '@/utils/electronCapabilities'

/** 桌面端是否应展示检查更新 UI（优先读 Electron 壳能力，兼容本地 dist 打包）。 */
export function isDesktopAutoUpdateUiEnabled(): boolean {
  if (typeof window === 'undefined') return false

  const api = window.electronAPI
  if (!supportsDesktopAutoUpdateListeners()) return false

  if (api?.isAutoUpdateEnabled != null) {
    return api.isAutoUpdateEnabled
  }

  const value = import.meta.env.VITE_ENABLE_AUTO_UPDATE?.trim().toLowerCase()
  const webFlagEnabled = value === '1' || value === 'true'
  return webFlagEnabled && api?.platform !== 'darwin'
}
