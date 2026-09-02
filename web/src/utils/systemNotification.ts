import { getElectronCapability } from '@/utils/electronCapabilities'
import { isElectron } from '@/utils/platform'

export interface SystemNotificationPayload {
  id: string
  title: string
  body: string
  link?: string
}

export async function isAppWindowFocused(): Promise<boolean> {
  if (typeof document !== 'undefined' && !document.hasFocus()) return false
  if (!isElectron()) return document.hasFocus()
  return (await getElectronCapability('isWindowFocused')?.()) ?? document.hasFocus()
}

export async function showSystemNotification(payload: SystemNotificationPayload): Promise<void> {
  if (!isElectron()) return
  const show = getElectronCapability('showSystemNotification')
  if (!show) return

  const result = await show({
    id: payload.id,
    title: payload.title,
    body: payload.body,
    link: payload.link,
  })
  if (!result.success) {
    console.warn("[system-notification]", result.error || "系统通知展示失败")
  }
}

/** 窗口不在前台时弹出系统通知，便于用户在其他应用中看到 LIMS 消息。 */
export async function showSystemNotificationIfBackground(payload: SystemNotificationPayload): Promise<boolean> {
  const focused = await isAppWindowFocused()
  if (focused) return false
  await showSystemNotification(payload)
  return true
}

export function setupSystemNotificationClickHandler(
  handler: (payload: { id: string; link?: string }) => void,
): () => void {
  if (!isElectron()) return () => {}
  const subscribe = getElectronCapability('onNotificationClicked')
  return subscribe?.(handler) ?? (() => {})
}
