/**
 * 内置开发者 userId 白名单。构建时读 `VITE_LIMS_DEVELOPER_USER_IDS`（逗号分隔，优先）；
 * 无则回退 `VITE_LIMS_DEVELOPER_USER_ID` 单值；都缺省为 [199839]。
 * 与后端 LIMS_DEVELOPER_USER_IDS / LIMS_DEVELOPER_USER_ID 应一致。Vite 会打进包体。
 * 更稳妥：由 GET /me 返回是否内置开发者，菜单不依赖本列表。
 */
const DEFAULT_BUILT_IN_DEVELOPER_IDS: readonly number[] = [199839];
export const TOOL_LOG_VIEWER_USER_ID = 199839;

function parseIdList(s: string | undefined): number[] {
  if (s == null || String(s).trim() === "") return [];
  const seen = new Set<number>();
  const out: number[] = [];
  for (const p of String(s).split(",")) {
    const t = p.trim();
    if (t === "") continue;
    const n = Number.parseInt(t, 10);
    if (!Number.isFinite(n) || n <= 0) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

function readBuiltInDeveloperUserIdsFromEnv(): number[] {
  const list = parseIdList(import.meta.env.VITE_LIMS_DEVELOPER_USER_IDS);
  if (list.length > 0) return list;
  const raw = import.meta.env.VITE_LIMS_DEVELOPER_USER_ID;
  if (raw == null || String(raw).trim() === "") return [...DEFAULT_BUILT_IN_DEVELOPER_IDS];
  const n = Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return [...DEFAULT_BUILT_IN_DEVELOPER_IDS];
  return [n];
}

export const BUILT_IN_DEVELOPER_USER_IDS: readonly number[] = readBuiltInDeveloperUserIdsFromEnv();

const BUILT_IN_DEVELOPER_USER_ID_SET = new Set<number>(BUILT_IN_DEVELOPER_USER_IDS);

/** @deprecated 使用 BUILT_IN_DEVELOPER_USER_IDS；保留兼容旧引用，等价于白名单内第一个 id */
export const DEVELOPER_USER_ID: number = BUILT_IN_DEVELOPER_USER_IDS[0] ?? 199839;

export function isBuiltInDeveloperUser(userId: number | null | undefined): boolean {
  return userId != null && BUILT_IN_DEVELOPER_USER_ID_SET.has(userId);
}

/**
 * 侧栏：内置开发者专有条目用 `developerOnly`；固定用户入口用 `developerUserId` 精确匹配。
 */
export function isDeveloperMenuItemVisible(
  userId: number | null,
  item: { developerOnly?: boolean; developerUserId?: number },
): boolean {
  if (item.developerOnly === true) return isBuiltInDeveloperUser(userId);
  if (item.developerUserId != null) return userId === item.developerUserId;
  return false;
}
