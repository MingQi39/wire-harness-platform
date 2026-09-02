const NON_USER_LABELS = new Set(["信息不可用"]);

export interface UserOptionLike {
  id?: number | null;
  name?: string | null;
  username?: string | null;
}

function normalizeUserLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

function parseUserIdFromLabel(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  const match = text.match(/^(?:用户\s*#\s*|#)?(\d+)$/);
  if (!match) return null;
  const id = Number(match[1]);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

/**
 * 用户下拉展示统一优先姓名，姓名为空时回落用户名。
 * 仅在姓名与用户名均缺失时，回落到「用户 #id」。
 */
export function formatUserOptionLabel(user: UserOptionLike): string {
  const name = user.name?.trim() ?? "";
  if (name && !NON_USER_LABELS.has(name)) return name;
  const username = user.username?.trim() ?? "";
  if (username && !NON_USER_LABELS.has(username)) return username;
  if (typeof user.id === "number" && user.id > 0) return `用户 #${user.id}`;
  return name || username || "";
}

/** 兼容历史「姓名（用户名）」/「姓名(username)」展示串，统一显示姓名。 */
export function normalizeUserDisplayName(value?: string | null): string {
  const text = value?.trim() ?? "";
  if (!text) return "";
  const match = text.match(/^(.+?)\s*[（(]([^（）()]+)[）)]$/);
  if (match) {
    const name = match[1]?.trim() ?? "";
    const username = match[2]?.trim() ?? "";
    if (name && !NON_USER_LABELS.has(name)) return name;
    if (username && !NON_USER_LABELS.has(username)) return username;
  }
  return text;
}

export function normalizeUserDisplayList(value?: string | null): string {
  return String(value ?? "")
    .split("、")
    .map((item) => normalizeUserDisplayName(item))
    .filter(Boolean)
    .join("、");
}

/**
 * 构建「用户名/姓名/用户ID => 姓名优先展示」映射，用于表格展示兜底。
 */
export function buildUserDisplayNameMap(users: UserOptionLike[]): Map<string, string> {
  const map = new Map<string, string>();
  users.forEach((u) => {
    const id = typeof u.id === "number" && u.id > 0 ? u.id : null;
    const name = normalizeUserDisplayName(u.name);
    const username = normalizeUserDisplayName(u.username);
    const preferred = name || username || (id ? `用户 #${id}` : "");
    if (!preferred) return;

    map.set(normalizeUserLookupKey(preferred), preferred);
    if (name) map.set(normalizeUserLookupKey(name), preferred);
    if (username) map.set(normalizeUserLookupKey(username), preferred);
    if (id) {
      map.set(normalizeUserLookupKey(`用户 #${id}`), preferred);
      map.set(normalizeUserLookupKey(`#${id}`), preferred);
      map.set(normalizeUserLookupKey(String(id)), preferred);
    }
  });
  return map;
}

/**
 * 用户展示统一：先做历史兼容规范化，再按用户映射将 username/id 转为姓名（若可命中）。
 */
export function resolveUserDisplayName(
  value?: string | null,
  userDisplayNameMap?: ReadonlyMap<string, string>,
): string {
  const normalized = normalizeUserDisplayName(value);
  if (!normalized) return "";
  if (!userDisplayNameMap || userDisplayNameMap.size === 0) return normalized;

  const direct = userDisplayNameMap.get(normalizeUserLookupKey(normalized));
  if (direct) return direct;

  const id = parseUserIdFromLabel(normalized);
  if (id != null) {
    return (
      userDisplayNameMap.get(normalizeUserLookupKey(`用户 #${id}`)) ||
      userDisplayNameMap.get(normalizeUserLookupKey(`#${id}`)) ||
      userDisplayNameMap.get(normalizeUserLookupKey(String(id))) ||
      normalized
    );
  }

  return normalized;
}

export function resolveUserDisplayList(
  value?: string | null,
  userDisplayNameMap?: ReadonlyMap<string, string>,
): string {
  return String(value ?? "")
    .split("、")
    .map((item) => resolveUserDisplayName(item, userDisplayNameMap))
    .filter(Boolean)
    .join("、");
}

/**
 * 将事件摘要开头的操作人快照替换为最新姓名展示。
 * 样品变更记录等把 actor 名写进 summary，改名后需按 actor_user_id / 映射回填。
 */
export function resolveActorPrefixedSummary(
  summary?: string | null,
  actorUserName?: string | null,
  actorUserId?: number | null,
  userDisplayNameMap?: ReadonlyMap<string, string>,
): string {
  const text = String(summary ?? "").trim();
  if (!text) return "";

  const idText =
    typeof actorUserId === "number" && actorUserId > 0 ? String(actorUserId) : "";
  const live =
    (idText ? resolveUserDisplayName(idText, userDisplayNameMap) : "") ||
    resolveUserDisplayName(actorUserName, userDisplayNameMap) ||
    normalizeUserDisplayName(actorUserName);
  if (!live) return text;

  const snapshots = Array.from(
    new Set(
      [String(actorUserName ?? "").trim(), normalizeUserDisplayName(actorUserName)].filter(
        Boolean,
      ),
    ),
  );
  for (const snap of snapshots) {
    if (text === snap) return live;
    if (text.startsWith(`${snap} `) || text.startsWith(`${snap}\u00a0`)) {
      return `${live}${text.slice(snap.length)}`;
    }
  }

  // 无快照可替换时，若整段就是旧展示则仍回落 live（极少数脏数据）
  if (snapshots.length === 0) return text;
  return text;
}
