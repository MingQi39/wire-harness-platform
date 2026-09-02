/** @vitest-environment jsdom */
import { describe, expect, it, vi, afterEach } from 'vitest'

import { isDesktopAutoUpdateUiEnabled } from './desktopAutoUpdateEnv'

function mockAutoUpdateApi(overrides: Record<string, unknown> = {}) {
  return {
    checkForUpdate: () => Promise.resolve({ success: true }),
    onUpdateAvailable: () => () => {},
    onUpdateNotAvailable: () => () => {},
    onUpdateProgress: () => () => {},
    onUpdateReady: () => () => {},
    onUpdateError: () => () => {},
    ...overrides,
  }
}

describe('isDesktopAutoUpdateUiEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    delete (window as Window & { electronAPI?: unknown }).electronAPI
  })

  it('prefers electron shell capability when remote web lacks VITE_ENABLE_AUTO_UPDATE', () => {
    ;(window as Window & { electronAPI?: ReturnType<typeof mockAutoUpdateApi> }).electronAPI =
      mockAutoUpdateApi({
        isAutoUpdateEnabled: true,
      })

    expect(isDesktopAutoUpdateUiEnabled()).toBe(true)
  })

  it('returns false when electron shell disables auto update', () => {
    ;(window as Window & { electronAPI?: ReturnType<typeof mockAutoUpdateApi> }).electronAPI =
      mockAutoUpdateApi({
        isAutoUpdateEnabled: false,
      })

    expect(isDesktopAutoUpdateUiEnabled()).toBe(false)
  })

  it('falls back to web env for bundled local dist', () => {
    vi.stubEnv('VITE_ENABLE_AUTO_UPDATE', '1')
    ;(window as Window & { electronAPI?: ReturnType<typeof mockAutoUpdateApi> }).electronAPI =
      mockAutoUpdateApi({
        platform: 'win32',
      })

    expect(isDesktopAutoUpdateUiEnabled()).toBe(true)
  })

  it('returns false when old shell only exposes checkForUpdate without listeners', () => {
    vi.stubEnv('VITE_ENABLE_AUTO_UPDATE', '1')
    ;(window as Window & { electronAPI?: { platform: string; checkForUpdate: () => Promise<{ success: boolean }> } })
      .electronAPI = {
      platform: 'win32',
      checkForUpdate: () => Promise.resolve({ success: true }),
    }

    expect(isDesktopAutoUpdateUiEnabled()).toBe(false)
  })
})
