import { useCallback, useEffect, useState } from "react";

/** 主从分栏页在移动端切换「列表 / 详情」全屏视图，桌面端始终并排展示 */
export function useMasterDetailMobilePane(isMobile: boolean) {
  const [mobilePane, setMobilePane] = useState<"list" | "detail">("list");

  useEffect(() => {
    if (!isMobile) setMobilePane("list");
  }, [isMobile]);

  const showListPane = !isMobile || mobilePane === "list";
  const showDetailPane = !isMobile || mobilePane === "detail";

  const openDetailPane = useCallback(() => {
    if (isMobile) setMobilePane("detail");
  }, [isMobile]);

  const backToListPane = useCallback(() => {
    if (isMobile) setMobilePane("list");
  }, [isMobile]);

  return { showListPane, showDetailPane, openDetailPane, backToListPane };
}
