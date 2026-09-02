/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest'

import {
  DESKTOP_LABEL_PRINT_UPGRADE_MESSAGE,
  getElectronCapability,
  hasElectronCapability,
  supportsDesktopAutoUpdateListeners,
  supportsDesktopAutoUpdateStatus,
  supportsSecureStorage,
} from './electronCapabilities'

function setElectronAPI(api: Partial<NonNullable<Window['electronAPI']>>) {
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: api,
  })
}

describe('electronCapabilities', () => {
  afterEach(() => {
    delete (window as Window & { electronAPI?: unknown }).electronAPI
  })

  it('detects missing preload methods on partial old shell', () => {
    setElectronAPI({
      isElectron: true,
      checkForUpdate: () => Promise.resolve({ success: true }),
    })

    expect(hasElectronCapability('checkForUpdate')).toBe(true)
    expect(hasElectronCapability('printSampleLabels')).toBe(false)
    expect(hasElectronCapability('onUpdateAvailable')).toBe(false)
    expect(supportsDesktopAutoUpdateListeners()).toBe(false)
    expect(supportsSecureStorage()).toBe(false)
    expect(getElectronCapability('listJcPrinters')).toBeUndefined()
  })

  it('accepts full auto-update listener set', () => {
    setElectronAPI({
      checkForUpdate: () => Promise.resolve({ success: true }),
      onUpdateAvailable: () => () => {},
      onUpdateNotAvailable: () => () => {},
      onUpdateProgress: () => () => {},
      onUpdateReady: () => () => {},
      onUpdateError: () => () => {},
    })

    expect(supportsDesktopAutoUpdateListeners()).toBe(true)
  })

  it('detects optional update-status snapshot support', () => {
    setElectronAPI({
      getUpdateStatus: () => Promise.resolve({ status: 'idle' }),
    })

    expect(supportsDesktopAutoUpdateStatus()).toBe(true)
  })

  it('exports upgrade hint for label print', () => {
    expect(DESKTOP_LABEL_PRINT_UPGRADE_MESSAGE).toMatch(/安装最新/)
  })
})
