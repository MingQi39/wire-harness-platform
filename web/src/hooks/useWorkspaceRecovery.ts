import { useEffect, useRef } from "react";

import { appMessage } from "@/utils/appMessage";
import { isElectron } from "@/utils/platform";
import { useAuthStore } from "@/stores/authStore";

/**
 * 登录后检查上次异常退出或断网留下的未同步工作文件。
 * 不提供“最近文件”列表；用户重新进入对应业务时，主进程会优先恢复该文件。
 */
export function useWorkspaceRecovery() {
  const tenantId = useAuthStore((state) => state.tenantId);
  const userId = useAuthStore((state) => state.userId);
  const notifiedOwnerRef = useRef("");

  useEffect(() => {
    if (!isElectron() || !tenantId || !userId) return;
    const ownerKey = `${tenantId}:${userId}`;
    if (notifiedOwnerRef.current === ownerKey) return;
    notifiedOwnerRef.current = ownerKey;

    void window.electronAPI?.listDirtyWorkspaceFiles?.(ownerKey)
      .then((files) => {
        if (!files.length) return;
        appMessage().warning(
          `检测到 ${files.length} 个未同步的本地工作文件；重新进入对应业务时将优先恢复，避免覆盖本地修改。`,
        );
      })
      .catch(() => {
        notifiedOwnerRef.current = "";
      });
  }, [tenantId, userId]);
}
