import { useAuthStore } from '@/stores/authStore'
import axios from 'axios'

export interface OpenDesktopPdfOptions {
  descriptor: DesktopArtifactDescriptor
  fetchBytes: () => Promise<Uint8Array>
  forceRefresh?: boolean
  allowOfflineFallback?: boolean
}

export type DesktopPdfOpenSource = 'cache' | 'generated' | 'stale' | 'temporary'

export function desktopArtifactOwnerKey(): string {
  const { tenantId, userId } = useAuthStore.getState()
  return `${tenantId ?? 'unknown-tenant'}:${userId ?? 'unknown-user'}`
}

/**
 * 桌面 PDF 的唯一打开入口。
 * 缓存命中、原子落盘、系统打开和离线旧版降级均隐藏在这个 module 后面。
 */
export async function openDesktopPdf(
  options: OpenDesktopPdfOptions,
): Promise<{ source: DesktopPdfOpenSource; createdAt?: string }> {
  const api = window.electronAPI
  if (!api) throw new Error('桌面能力不可用')

  if (!options.forceRefresh && api.openCachedArtifact) {
    const cached = await api.openCachedArtifact(options.descriptor)
    if (cached.hit) {
      return { source: 'cache', createdAt: cached.createdAt }
    }
  }

  try {
    const bytes = await options.fetchBytes()
    if (api.storeAndOpenArtifact) {
      const stored = await api.storeAndOpenArtifact(options.descriptor, bytes)
      if (stored.hit) {
        return { source: 'generated', createdAt: stored.createdAt }
      }
    }
    await api.openFileInSystemApp(bytes, options.descriptor.fileName, true)
    return { source: 'temporary' }
  } catch (error) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    const networkUnavailable = offline || (axios.isAxiosError(error) && !error.response)
    if (networkUnavailable && options.allowOfflineFallback !== false && api.openLatestArtifact) {
      const stale = await api.openLatestArtifact(options.descriptor)
      if (stale.hit) {
        return { source: 'stale', createdAt: stale.createdAt }
      }
    }
    throw error
  }
}
