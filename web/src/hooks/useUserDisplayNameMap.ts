import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { userApi } from "@/api/user";
import { useAuthStore } from "@/stores/authStore";
import { buildUserDisplayNameMap } from "@/utils/userDisplay";

/** 用户展示名映射缓存 key；改名后需 invalidate 此前缀。 */
export const USER_DISPLAY_NAME_MAP_QUERY_KEY = ["me-active-users", "display-name-map"] as const;

/**
 * 用户展示映射（用户名/ID => 姓名优先）。
 * 使用 /me/active-users，避免依赖 user:read 权限。
 */
export function useUserDisplayNameMap() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data } = useQuery({
    queryKey: USER_DISPLAY_NAME_MAP_QUERY_KEY,
    queryFn: () =>
      userApi.getActiveUserSuggestList({
        page: 1,
        page_size: 9999,
      }, { silentBizError: true }),
    enabled: Boolean(accessToken),
    retry: false,
    staleTime: 5 * 60_000,
  });

  return useMemo(() => buildUserDisplayNameMap(data?.list ?? []), [data?.list]);
}
