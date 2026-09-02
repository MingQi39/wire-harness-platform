import { useEffect } from "react";

import { PERMISSIONS } from "@/constants/permissions";
import { useNotificationSSE, useNotificationUnread } from "@/hooks/useNotifications";
import { useSystemNotificationBridge } from "@/hooks/useSystemNotificationBridge";
import { useTodoNotifications } from "@/hooks/useTodoNotifications";
import { useAuthStore } from "@/stores/authStore";
import { useTodoNotificationStore } from "@/stores/todoNotificationStore";
import { isElectron } from "@/utils/platform";

/**
 * 全应用唯一的通知运行时。
 * NotificationBell 只负责展示，SSE、待办检测、系统点击和角标不再随展示实例重复挂载。
 */
export function useDesktopNotificationRuntime() {
  useTodoNotifications();
  useSystemNotificationBridge();

  const permissions = useAuthStore((state) => state.permissions);
  const canReadServerNotifications = permissions.includes(PERMISSIONS.NOTIFICATION_READ);
  useNotificationSSE(canReadServerNotifications);
  const serverUnread = useNotificationUnread(canReadServerNotifications);
  const localUnread = useTodoNotificationStore(
    (state) => state.notifications.filter((item) => !item.isRead).length,
  );
  const totalUnread = localUnread + (serverUnread.data?.unread ?? 0);

  useEffect(() => {
    if (!isElectron()) return;
    void window.electronAPI?.setBadgeCount?.(Math.min(totalUnread, 9999)).catch(() => undefined);
  }, [totalUnread]);
}
