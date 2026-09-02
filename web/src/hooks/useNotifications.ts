import { useEffect } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { notificationApi } from '@/api/notification'
import type { Notification, NotificationListParams } from '@/api/types'
import { useAuthStore } from '@/stores/authStore'
import { getApiBaseUrl, isElectron } from '@/utils/platform'
import { connectNotificationSSE } from '@/utils/notificationSse'
import { getServerNotificationTarget } from '@/utils/notificationNavigation'
import { isAppWindowFocused, showSystemNotification } from '@/utils/systemNotification'

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (params: NotificationListParams) => [...notificationKeys.lists(), params] as const,
  unread: () => [...notificationKeys.all, 'unread'] as const,
}

export function useNotificationList(params: NotificationListParams, enabled: boolean) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationApi.list(params),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: enabled ? 120_000 : false,
    refetchIntervalInBackground: isElectron(),
  })
}

export function useNotificationUnread(enabled: boolean) {
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: notificationApi.unreadCount,
    enabled,
    refetchInterval: enabled ? 120_000 : false,
    refetchIntervalInBackground: isElectron(),
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: notificationApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: notificationApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

export function useNotificationSSE(enabled: boolean) {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((s) => s.accessToken)
  const permissions = useAuthStore((s) => s.permissions)

  useEffect(() => {
    if (!enabled) return
    if (isElectron() && !accessToken) return
    if (!isElectron() && typeof EventSource === 'undefined') return

    const base = getApiBaseUrl()
    const url = `${base}/api/v1/notifications/sse`

    const close = connectNotificationSSE(url, accessToken, (data) => {
      void handleServerNotificationPush(data, permissions, queryClient)
    })
    return close
  }, [accessToken, enabled, permissions, queryClient])
}

async function handleServerNotificationPush(
  raw: string,
  permissions: readonly string[],
  queryClient: QueryClient,
) {
  let notification: Notification | null = null
  try {
    notification = JSON.parse(raw) as Notification
  } catch {
    queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    return
  }

  if (notification?.id && notification.title) {
    const focused = await isAppWindowFocused()
    const link = getServerNotificationTarget(notification, permissions)
    if (focused) {
      toast.info(notification.title, {
        description: notification.content || undefined,
        duration: 4500,
      })
    } else {
      await showSystemNotification({
        id: `server-${notification.id}`,
        title: notification.title,
        body: notification.content ?? '',
        link: link || undefined,
      })
    }
  }

  queryClient.invalidateQueries({ queryKey: notificationKeys.all })
}
