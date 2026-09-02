import type { MenuConfigItem } from "@/api/types";
import { applyEditionToMenu } from "@/edition/menu";

/**
 * 完整侧栏骨架（与后端新租户 seed 对齐）。
 * 用户/角色入口挂在「基础信息」下（路由仍为 /system/users、/system/roles）。
 */
export const DEFAULT_SIDEBAR_MENU: MenuConfigItem[] = [
  { key: "/", icon: "dashboard", label: "工作台" },
  {
    key: "/dashboard/boss",
    icon: "bar-chart-3",
    label: "效能看板",
    auth: "dashboard:read",
  },
  {
    key: "/customers",
    icon: "handshake",
    label: "客户管理",
    auth: "customer:read",
  },
  {
    key: "/samples",
    icon: "flask-conical",
    label: "样品管理",
    auth: "sample:read",
  },
  {
    key: "/standards",
    icon: "book",
    label: "标准管理",
    auth: "standard:read",
  },
  {
    key: "/assets",
    icon: "package-2",
    label: "资产管理",
    children: [
      {
        key: "/assets/standard-instruments",
        icon: "deployment-unit",
        label: "标准仪器管理",
        auth: "std_instrument:read",
      },
      {
        key: "/assets/standard-materials",
        icon: "inbox",
        label: "标准物质管理",
        auth: "std_material:read",
      },
      {
        key: "/assets/stock-records",
        icon: "archive",
        label: "设备出入库记录",
        auth: "asset_stock_record:read",
      },
    ],
  },
  {
    key: "/commission-orders",
    icon: "schedule",
    label: "委托单管理",
    auth: "commission:read",
  },
  {
    key: "/certificate-reports",
    icon: "file-text",
    label: "证书报告管理",
    children: [
      {
        key: "/certificate-reports/prepare",
        icon: "form",
        label: "证书报告编制",
        auth: "cert_report:prepare",
      },
      {
        key: "/certificate-reports/review",
        icon: "clipboard-check",
        label: "证书报告审核",
        auth: "cert_report:review",
      },
      {
        key: "/certificate-reports/approve",
        icon: "stamp",
        label: "证书报告批准",
        auth: "cert_report:approve",
      },
      {
        key: "/certificate-reports/print-export",
        icon: "file-text",
        label: "证书报告打印/导出",
        auth: "cert_report:print_export",
      },
      {
        key: "/certificate-reports/original-record-print-export",
        icon: "file-excel",
        label: "原始记录打印/导出",
        auth: "cert_report:original_record_print_export",
      },
    ],
  },
  {
    key: "/report-extract",
    icon: "file-search",
    label: "检测报告提取",
    developerOnly: true,
  },
  {
    key: "/templates",
    icon: "layout",
    label: "模版管理",
    children: [
      {
        key: "/templates/cert-cover",
        icon: "file-protect",
        label: "证书封面&说明页模版",
        auth: "cert_cover_tpl:read",
      },
      {
        key: "/templates/original-record",
        icon: "file-text",
        label: "原始记录/证书内页模版",
        auth: "original_record_tpl:read",
      },
    ],
  },
  {
    key: "/basic-info",
    icon: "appstore",
    label: "基础信息",
    children: [
      {
        key: "/laboratory-locations",
        icon: "experiment",
        label: "实验室位置",
        auth: "lab_location:read",
      },
      {
        key: "/basic-info/company",
        icon: "building",
        label: "公司信息管理",
        auth: "company_info:read",
      },
      {
        key: "/system/users",
        icon: "user",
        label: "用户管理",
        auth: "user:read",
      },
      {
        key: "/system/roles",
        icon: "team",
        label: "角色管理",
        auth: "role:read",
      },
    ],
  },
];

/** 已下线菜单项；合并服务端 menu_config 时忽略，避免历史配置重新出现在侧栏 */
const REMOVED_MENU_KEYS = new Set([
  "/system",
  "/system/audit",
  "/system/tool-logs",
  "/system/feedbacks",
  "/system/config",
]);

function mergeLeaf(def: MenuConfigItem, server?: MenuConfigItem): MenuConfigItem {
  if (!server) return { ...def };
  if (def.developerOnly === true || def.developerUserId != null) {
    return {
      ...def,
      key: def.key,
      icon: server.icon || def.icon,
      label: def.label,
      labelKey: server.labelKey !== undefined ? server.labelKey : def.labelKey,
      auth: undefined,
      module: server.module !== undefined ? server.module : def.module,
      developerOnly: def.developerOnly,
      developerUserId: def.developerUserId,
    };
  }
  return {
    ...def,
    key: def.key,
    icon: server.icon || def.icon,
    label: def.label,
    labelKey: server.labelKey !== undefined ? server.labelKey : def.labelKey,
    auth: server.auth != null ? server.auth : def.auth,
    module: server.module !== undefined ? server.module : def.module,
  };
}

/**
 * 以 DEFAULT_SIDEBAR_MENU 为骨架，用接口返回的 menu_config 覆盖图标/文案等；
 * 避免历史库里只有「工作台」或缺少客户项时侧栏残缺。
 */
export function mergeMenuWithDefaults(parsed: MenuConfigItem[]): MenuConfigItem[] {
  const list = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  if (list.length === 0) {
    return applyEditionToMenu(
      DEFAULT_SIDEBAR_MENU.map((m) =>
        m.children ? { ...m, children: m.children.map((c) => ({ ...c })) } : { ...m },
      ),
    );
  }

  const serverByKey = new Map(list.map((i) => [i.key, i]));

  function mergeTop(def: MenuConfigItem): MenuConfigItem {
    const server = serverByKey.get(def.key);
    if (!def.children?.length) {
      return mergeLeaf(def, server);
    }

    const sChildren = server?.children ?? [];
    const sMap = new Map(sChildren.map((c) => [c.key, c]));
    const children = def.children.map((dc) => mergeLeaf(dc, sMap.get(dc.key)));

    return {
      ...def,
      icon: server?.icon || def.icon,
      label: def.label,
      labelKey: server?.labelKey !== undefined ? server.labelKey : def.labelKey,
      module: server?.module !== undefined ? server.module : def.module,
      key: def.key,
      auth: undefined,
      children,
    };
  }

  const merged = DEFAULT_SIDEBAR_MENU.map(mergeTop);
  const known = new Set(DEFAULT_SIDEBAR_MENU.map((m) => m.key));
  const knownChildKeys = new Set(
    DEFAULT_SIDEBAR_MENU.flatMap((m) => (m.children ?? []).map((c) => c.key)),
  );
  const extras = list.filter(
    (i) =>
      !REMOVED_MENU_KEYS.has(i.key) &&
      !known.has(i.key) &&
      !knownChildKeys.has(i.key) &&
      ![...known].some((k) => k.startsWith(i.key + "/")) &&
      ![...known].some((k) => i.key.startsWith(k + "/")),
  );
  const mergedWithExtras = extras.length ? [...merged, ...extras] : merged;
  return applyEditionToMenu(mergedWithExtras);
}
