import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { setupSystemNotificationClickHandler } from '@/utils/systemNotification'
import { isElectron } from '@/utils/platform'

/** Electron 桌面端：点击系统通知后聚焦窗口并跳转到对应页面。 */
export function useSystemNotificationBridge() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isElectron()) return
    const handleClick = (payload: { id: string; link?: string }) => {
      if (payload.link) navigate(payload.link)
    }
    void window.electronAPI?.consumePendingNotificationClick?.().then((pending) => {
      if (pending) handleClick(pending)
    })
    return setupSystemNotificationClickHandler((payload) => {
      handleClick(payload)
      void window.electronAPI?.consumePendingNotificationClick?.()
    })
  }, [navigate])
}
