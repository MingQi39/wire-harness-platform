import { useState, useCallback, useEffect } from 'react'

import { isElectron } from '@/utils/platform'

async function readFullscreenState(): Promise<boolean> {
  if (isElectron() && window.electronAPI?.getWindowFullscreen) {
    return window.electronAPI.getWindowFullscreen()
  }
  return Boolean(document.fullscreenElement)
}

async function applyFullscreen(next: boolean): Promise<boolean> {
  if (isElectron() && window.electronAPI?.setWindowFullscreen) {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {})
    }
    return window.electronAPI.setWindowFullscreen(next)
  }

  if (next && !document.fullscreenElement) {
    await document.documentElement.requestFullscreen().catch(() => {})
  } else if (!next && document.fullscreenElement) {
    await document.exitFullscreen().catch(() => {})
  }

  return Boolean(document.fullscreenElement)
}

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    let disposed = false

    const sync = async () => {
      const value = await readFullscreenState()
      if (!disposed) setIsFullscreen(value)
    }

    void sync()

    const onDomFullscreenChange = () => {
      if (isElectron()) return
      void sync()
    }

    document.addEventListener('fullscreenchange', onDomFullscreenChange)
    const unsubscribe = window.electronAPI?.onWindowFullscreenChange?.((fullscreen) => {
      if (!disposed) setIsFullscreen(fullscreen)
    })

    return () => {
      disposed = true
      document.removeEventListener('fullscreenchange', onDomFullscreenChange)
      unsubscribe?.()
    }
  }, [])

  const toggle = useCallback(async () => {
    const applied = await applyFullscreen(!isFullscreen)
    setIsFullscreen(applied)
  }, [isFullscreen])

  return { isFullscreen, toggle }
}
