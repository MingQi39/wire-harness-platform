export const PERMISSIONS = {
  // 效能看板
  DASHBOARD_READ: "dashboard:read",

  // 标准仪器管理（资产管理）
  STD_INSTRUMENT_READ: "std_instrument:read",
  STD_INSTRUMENT_CREATE: "std_instrument:create",
  STD_INSTRUMENT_EDIT: "std_instrument:edit",
  STD_INSTRUMENT_DELETE: "std_instrument:delete",
  STD_INSTRUMENT_EXPORT: "std_instrument:export",
  STD_INSTRUMENT_IMPORT: "std_instrument:import",
  STD_INSTRUMENT_STOCK_OUT: "std_instrument:stock_out",
  STD_INSTRUMENT_STOCK_IN: "std_instrument:stock_in",

  // 标准物质管理（资产管理）
  STD_MATERIAL_READ: "std_material:read",
  STD_MATERIAL_CREATE: "std_material:create",
  STD_MATERIAL_EDIT: "std_material:edit",
  STD_MATERIAL_DELETE: "std_material:delete",
  STD_MATERIAL_EXPORT: "std_material:export",
  STD_MATERIAL_IMPORT: "std_material:import",
  STD_MATERIAL_STOCK_OUT: "std_material:stock_out",
  STD_MATERIAL_STOCK_IN: "std_material:stock_in",
  ASSET_STOCK_RECORD_READ: "asset_stock_record:read",
  ASSET_STOCK_RECORD_DELETE: "asset_stock_record:delete",

  // 标准管理
  STANDARD_READ: "standard:read",
  STANDARD_CREATE: "standard:create",
  STANDARD_EDIT: "standard:edit",
  STANDARD_DELETE: "standard:delete",
  STANDARD_EXPORT: "standard:export",
  STANDARD_IMPORT: "standard:import",

  // 客户管理
  CUSTOMER_READ: "customer:read",
  CUSTOMER_CREATE: "customer:create",
  CUSTOMER_EDIT: "customer:edit",
  CUSTOMER_DELETE: "customer:delete",
  CUSTOMER_EXPORT: "customer:export",
  CUSTOMER_IMPORT: "customer:import",

  // 样品管理
  SAMPLE_READ: "sample:read",
  SAMPLE_CREATE: "sample:create",
  SAMPLE_EDIT: "sample:edit",
  SAMPLE_DELETE: "sample:delete",
  SAMPLE_EXPORT: "sample:export",
  SAMPLE_IMPORT: "sample:import",

  // 实验室位置
  LAB_LOCATION_READ: "lab_location:read",
  LAB_LOCATION_CREATE: "lab_location:create",
  LAB_LOCATION_EDIT: "lab_location:edit",
  LAB_LOCATION_DELETE: "lab_location:delete",
  LAB_LOCATION_EXPORT: "lab_location:export",
  LAB_LOCATION_IMPORT: "lab_location:import",

  // 公司信息管理
  COMPANY_INFO_READ: "company_info:read",
  COMPANY_INFO_EDIT: "company_info:edit",

  // 委托单管理
  COMMISSION_ORDER_READ: "commission:read",
  COMMISSION_ORDER_CREATE: "commission:create",
  COMMISSION_ORDER_EDIT: "commission:edit",
  COMMISSION_ORDER_DELETE: "commission:delete",
  /** 委托单审核流程操作（提交/退回/转派） */
  COMMISSION_ORDER_WORKFLOW: "commission:workflow",

  // 证书封面模版
  CERT_COVER_TPL_READ: "cert_cover_tpl:read",
  CERT_COVER_TPL_CREATE: "cert_cover_tpl:create",
  CERT_COVER_TPL_EDIT: "cert_cover_tpl:edit",
  CERT_COVER_TPL_DELETE: "cert_cover_tpl:delete",

  // 原始记录模版
  ORIGINAL_RECORD_TPL_READ: "original_record_tpl:read",
  ORIGINAL_RECORD_TPL_CREATE: "original_record_tpl:create",
  ORIGINAL_RECORD_TPL_EDIT: "original_record_tpl:edit",
  ORIGINAL_RECORD_TPL_DELETE: "original_record_tpl:delete",

  // 证书报告
  CERT_REPORT_PREPARE: "cert_report:prepare",
  CERT_REPORT_REVIEW: "cert_report:review",
  CERT_REPORT_APPROVE: "cert_report:approve",
  /** 打印/导出页面基础信息修改按钮及修改记录；同时控制编制/审核/批准页的证书数据修改记录 */
  CERT_REPORT_PREPARE_EDIT: "cert_report:prepare_edit",
  /** 证书编制流程操作：提交、审核、批准、退回、转派、批量流程 */
  CERT_REPORT_WORKFLOW: "cert_report:workflow",
  /** 证书编制单流程审批时间线查看（与 cert_report:prepare 独立配置，未授予则不展示且接口不下发 events） */
  CERT_REPORT_WORKFLOW_TIMELINE: "cert_report:workflow_timeline",
  /** 证书报告打印/导出页面入口 */
  CERT_REPORT_PRINT_EXPORT: "cert_report:print_export",
  /** 原始记录打印/导出页面入口 */
  ORIGINAL_RECORD_PRINT_EXPORT: "cert_report:original_record_print_export",
  CERT_REPORT_PRINT: "cert_report:print",
  CERT_REPORT_EXPORT: "cert_report:export",
  ORIGINAL_RECORD_PRINT: "cert_report:original_record_print",
  ORIGINAL_RECORD_EXPORT: "cert_report:original_record_export",
  /** 证书报告 / 原始记录打印导出页面：删除证书行（含批量） */
  CERT_REPORT_DELETE: "cert_report:delete",

  // 文件管理
  FILE_UPLOAD: "file:upload",
  FILE_DOWNLOAD: "file:download",

  // 系统管理
  SYSTEM_MANAGE: "system:manage",
  USER_READ: "user:read",
  USER_CREATE: "user:create",
  USER_EDIT: "user:edit",
  USER_DELETE: "user:delete",
  /** 超级管理员：代重置其他用户登录密码 */
  USER_RESET_PASSWORD: "user:reset_password",
  ROLE_READ: "role:read",
  ROLE_CREATE: "role:create",
  ROLE_EDIT: "role:edit",
  ROLE_DELETE: "role:delete",
  AUDIT_READ: "audit:read",
  CONFIG_READ: "config:read",
  CONFIG_EDIT: "config:edit",
  NOTIFICATION_READ: "notification:read",
  FEEDBACK_READ: "feedback:read",
  // AI 助手
  AI_ASSISTANT_USE: "ai_assistant:use",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export function canAccessCertificateReportWorkflowWorkspace(permissions: readonly string[]): boolean {
  return (
    permissions.includes(PERMISSIONS.CERT_REPORT_PREPARE) ||
    permissions.includes(PERMISSIONS.CERT_REPORT_REVIEW) ||
    permissions.includes(PERMISSIONS.CERT_REPORT_APPROVE)
  );
}
