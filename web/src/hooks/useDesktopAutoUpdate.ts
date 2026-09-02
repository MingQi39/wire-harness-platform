import { useCallback, useEffect, useState } from 'react'

import { normalizeUpdateErrorMessage, type DesktopUpdateStatus } from '@/layouts/desktopUpdateUtils'
import { getElectronCapability, supportsDesktopAutoUpdateListeners } from '@/utils/electronCapabilities'

export function useDesktopAutoUpdate(enabled: boolean) {
  const [state, setState] = useState<DesktopUpdateStatus>({ status: 'idle' })

  useEffect(() => {
    if (!enabled) return undefined

    if (!supportsDesktopAutoUpdateListeners()) return undefined

    const onUpdateAvailable = getElectronCapability('onUpdateAvailable')!
    const onUpdateNotAvailable = getElectronCapability('onUpdateNotAvailable')!
    const onUpdateProgress = getElectronCapability('onUpdateProgress')!
    const onUpdateReady = getElectronCapability('onUpdateReady')!
    const onUpdateError = getElectronCapability('onUpdateError')!
    let disposed = false
    let receivedLiveEvent = false

    const applyLiveState = (next: DesktopUpdateStatus) => {
      receivedLiveEvent = true
      setState(next)
    }

    const cleanups = [
      onUpdateAvailable((info) => applyLiveState({ status: 'available', version: info.version })),
      onUpdateNotAvailable(() => applyLiveState({ status: 'idle' })),
      onUpdateProgress((progress) => applyLiveState({ status: 'downloading', percent: Math.round(progress.percent) })),
      onUpdateReady(() => applyLiveState({ status: 'ready' })),
      onUpdateError((err) => applyLiveState({ status: 'error', message: normalizeUpdateErrorMessage(err.message) })),
    ]

    const getUpdateStatus = getElectronCapability('getUpdateStatus')
    if (getUpdateStatus) {
      void getUpdateStatus()
        .then((snapshot) => {
          if (!disposed && !receivedLiveEvent) setState(snapshot)
        })
        .catch(() => {
          // 旧壳或瞬时 IPC 失败时保留实时事件监听，不打扰用户。
        })
    }

    return () => {
      disposed = true
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [enabled])

  const download = useCallback(() => {
    const downloadUpdate = getElectronCapability('downloadUpdate')
    if (!downloadUpdate) return

    setState({ status: 'downloading', percent: 0 })
    void downloadUpdate().then((result) => {
      if (!result.success) {
        setState({ status: 'error', message: normalizeUpdateErrorMessage(result.error || '下载更新失败') })
      }
    })
  }, [])

  const install = useCallback(() => {
    void getElectronCapability('installUpdate')?.()
  }, [])

  const dismissError = useCallback(() => {
    setState({ status: 'idle' })
  }, [])

  const visible = state.status === 'available' || state.status === 'downloading' || state.status === 'ready' || state.status === 'error'

  return { state, visible, download, install, dismissError }
}
