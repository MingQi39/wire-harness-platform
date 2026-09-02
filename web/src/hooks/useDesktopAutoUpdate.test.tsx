/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useDesktopAutoUpdate } from './useDesktopAutoUpdate'

type AvailableInfo = { version: string; releaseNotes?: string; releaseDate?: string }
type UpdateSnapshot =
  | { status: 'idle' }
  | { status: 'available'; version: string }
  | { status: 'downloading'; percent: number }
  | { status: 'ready' }

function installUpdateApi(getUpdateStatus: () => Promise<UpdateSnapshot>) {
  let onAvailable: ((info: AvailableInfo) => void) | undefined

  const api: Partial<NonNullable<Window['electronAPI']>> = {
    checkForUpdate: () => Promise.resolve({ success: true }),
    getUpdateStatus,
    onUpdateAvailable: (callback: (info: AvailableInfo) => void) => {
      onAvailable = callback
      return () => {
        onAvailable = undefined
      }
    },
    onUpdateNotAvailable: () => () => {},
    onUpdateProgress: () => () => {},
    onUpdateReady: () => () => {},
    onUpdateError: () => () => {},
  }
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: api,
  })

  return {
    emitAvailable(info: AvailableInfo) {
      onAvailable?.(info)
    },
  }
}

describe('useDesktopAutoUpdate', () => {
  afterEach(() => {
    delete (window as Window & { electronAPI?: unknown }).electronAPI
  })

  it('hydrates an available update discovered before the sidebar mounted', async () => {
    installUpdateApi(async () => ({ status: 'available', version: '1.2.3' }))

    const { result } = renderHook(() => useDesktopAutoUpdate(true))

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'available', version: '1.2.3' })
    })
  })

  it('does not let a delayed snapshot overwrite a live event', async () => {
    let resolveSnapshot: ((value: { status: 'idle' }) => void) | undefined
    const api = installUpdateApi(() => new Promise((resolve) => {
      resolveSnapshot = resolve
    }))
    const { result } = renderHook(() => useDesktopAutoUpdate(true))

    act(() => {
      api.emitAvailable({ version: '2.0.0' })
    })
    await act(async () => {
      resolveSnapshot?.({ status: 'idle' })
      await Promise.resolve()
    })

    expect(result.current.state).toEqual({ status: 'available', version: '2.0.0' })
  })
})
