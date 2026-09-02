export interface PageParams {
  page: number
  /** 多数列表接口与后端 PageReq 一致，单页最大 100，超出会导致请求参数校验失败 */
  page_size: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  page_size: number
}

export interface BatchDeleteItem {
  id: number
  updated_at: string
}

export interface BatchDeleteWithUpdatedAtReq {
  items: BatchDeleteItem[]
}

// ---- 行业类型 ----
export type IndustryType = 'metrology' | 'testing'

// ---- 动态字段 schema ----
export interface FieldSchema {
  key: string
  label: string
  type: 'string' | 'number' | 'select' | 'date'
  required: boolean
  options?: { label: string; value: string }[]
}

// ---- 客户 ----
export interface Customer {
  id: number
  tenant_id: number
  customer_name: string
  customer_address: string
  cert_org_name_zh: string
  cert_org_name_en: string
  cert_address_zh: string
  cert_address_en: string
  contact: string
  email: string
  created_by: number
  created_at: string
  updated_at: string
}

export interface CreateCustomerReq {
  customer_name: string
  customer_address: string
  cert_org_name_zh: string
  cert_org_name_en: string
  cert_address_zh: string
  cert_address_en: string
  contact: string
  email: string
}

export interface UpdateCustomerReq extends CreateCustomerReq {
  updated_at: string
}

export interface CustomerListParams extends PageParams {
  keyword?: string
  /** 表头筛选：客户名称模糊 */
  customer_name?: string
  /** 表头筛选：客户地址模糊 */
  customer_address?: string
}

/** 与列表筛选一致；响应为 Excel（.xlsx） */
export interface CustomerExportReq {
  format: 'xlsx'
  /** 指定时仅导出该客户，忽略 keyword / customer_name / customer_address（与 ids 同时出现时以 ids 为准） */
  id?: number
  /** 指定时仅导出这些客户，忽略筛选与单条 id */
  ids?: number[]
  keyword?: string
  customer_name?: string
  customer_address?: string
}

export type CustomerChangeLogListParams = PageParams

export interface CustomerBillingInfo {
  id?: number
  customer_id: number
  company_name: string
  tax_no: string
  billing_bank: string
  bank_account: string
  billing_address: string
  billing_phone: string
  invoice_category: string
  created_at?: string
  updated_at?: string
}

export type UpsertCustomerBillingReq = Omit<
  CustomerBillingInfo,
  'id' | 'customer_id' | 'created_at'
>

// ---- 样品管理工作台 ----
/** 左侧客户列表：字段对齐客户管理，数据来源于委托单关联客户 */
export interface SampleWorkspaceCustomer {
  customer_id: number
  customer_name: string
  customer_address: string
  cert_org_name_zh: string
  cert_org_name_en: string
  cert_address_zh: string
  cert_address_en: string
  contact: string
  email: string
  order_count: number
  latest_order_at: string
}

export interface SampleWorkspaceCustomerListParams extends PageParams {
  keyword?: string
}

export interface SampleWorkspaceCommissionOrder {
  id: number
  order_number: string
  customer_id: number
  customer_name: string
  customer_address: string
  biz_created_at: string
  business_staff_name: string
  workflow_status_label: string
  equipment_count: number
  updated_at: string
}

export interface SampleWorkspaceCommissionOrderListParams extends PageParams {
  keyword?: string
  workflow_status?: string
}

export interface SampleWorkspaceEquipmentLineListParams {
  keyword?: string
  sample_status?: string
}

/** 样品收发状态：空=未登记 */
export type SampleEquipmentStockStatus = 'stocked_in' | 'stocked_out' | ''

export interface SampleWorkspaceEquipmentLine extends CommissionOrderEquipmentLineReq {
  line_index: number
  /** 最近一次登记为「现场」的时间（列表聚合） */
  on_site_registered_at?: string
  /** 最近一次登记为「带回」的时间（列表聚合） */
  bring_back_registered_at?: string
  /** 上述「带回」登记的操作人（列表聚合） */
  bring_back_confirmed_by?: string
}

export interface SampleEquipmentRecordEvent {
  id: number
  event_type: 'sample_status_change' | 'equipment_assign' | 'sample_stock_in' | 'sample_stock_out' | string
  sample_status?: string
  prev_sample_status?: string
  assignee_user_id?: number
  assignee_display_name?: string
  prev_assignee_user_id?: number
  prev_assignee_display_name?: string
  actor_user_id: number
  actor_user_name: string
  summary: string
  created_at: string
}

export interface SampleEquipmentRecord {
  commission_order_id: number
  line_index: number
  line_id?: string
  device_name: string
  device_model: string
  factory_number: string
  manage_number: string
  manufacturer: string
  sample_status?: string
  order_updated_at: string
  events: SampleEquipmentRecordEvent[]
  total: number
}

export interface UpdateEquipmentSampleStatusReq {
  commission_order_id: number
  line_index: number
  sample_status: 'bring_back' | 'on_site'
  updated_at: string
}

/** POST .../equipment-stock-in | equipment-stock-out */
export interface SampleWorkspaceEquipmentStockReq {
  line_indexes: number[]
  person_id: number
  action_date: string
  remark?: string
  updated_at: string
}

export interface SampleLabelPrintLayout {
  width_mm: number
  height_mm: number
  font_size_pt: number
  status_font_size_pt: number
  padding_top_mm: number
  padding_right_mm: number
  padding_bottom_mm: number
  padding_left_mm: number
  offset_x_mm?: number
  offset_y_mm?: number
}

export interface SampleLabelPrinterProfile {
  id: string
  label: string
  match_patterns: string[]
  offset_x_mm?: number
  offset_y_mm?: number
}

export interface SampleLabelPrintConfig {
  layout: SampleLabelPrintLayout
  printer_profiles: SampleLabelPrinterProfile[]
  printer_name_patterns: string[]
}

// ---- 实验室位置 ----
export interface LaboratoryLocation {
  id: number
  tenant_id: number
  laboratory_no: string
  department: string
  laboratory_name: string
  laboratory_name_en: string
  remark: string
  created_by: number
  created_at: string
  updated_at: string
}

export interface CreateLaboratoryLocationReq {
  laboratory_no: string
  department: string
  laboratory_name: string
  laboratory_name_en: string
  remark: string
}

export interface UpdateLaboratoryLocationReq extends CreateLaboratoryLocationReq {
  updated_at: string
}

export interface LaboratoryLocationListParams extends PageParams {
  keyword?: string
  laboratory_no?: string
  department?: string
  laboratory_name?: string
  laboratory_name_en?: string
}

export interface LaboratoryLocationExportReq {
  format: 'xlsx'
  id?: number
  ids?: number[]
  keyword?: string
  laboratory_no?: string
  department?: string
  laboratory_name?: string
  laboratory_name_en?: string
}

// ---- 公司信息 ----
export interface CompanyInfo {
  id: number
  tenant_id: number
  company_name: string
  unified_social_credit_code: string
  address: string
  phone: string
  email: string
  website: string
  legal_representative: string
  contact_person: string
  remark: string
  stamp_file_id?: number | null
  created_by: number
  updated_by: number
  created_at: string
  updated_at: string
}

export interface UpsertCompanyInfoReq {
  company_name: string
  unified_social_credit_code: string
  address: string
  phone: string
  email: string
  website: string
  legal_representative: string
  contact_person: string
  remark: string
  updated_at?: string
}

export interface CompanySampleLabelPrintConfig extends SampleLabelPrintConfig {
  layout_preset: 'compact' | 'standard' | 'large' | 'custom' | string
  updated_at?: string
}

export interface UpsertCompanySampleLabelPrintConfigReq {
  width_mm: number
  height_mm: number
  layout_preset: string
  layout: SampleLabelPrintLayout
  printer_profiles: SampleLabelPrinterProfile[]
  printer_name_patterns: string[]
  updated_at?: string
}

// ---- 证书封面模版 ----
export interface CertCoverTemplate {
  id: number
  tenant_id: number
  name: string
  excel_file_id: number
  excel_file_name: string
  publish_date: string
  implementation_date: string
  version: string
  status: string
  /** Electron 桌面端上传文件时记录的本地文件路径，用于编辑保存后自动写回本地 */
  local_file_path: string
  /**
   * 创建人 user_id。前端与 authStore.userId 对比可判定本人是否可写
   * （后端内置开发者 199839 与其他用户的数据相互不可写，详见 cursor rule）。
   */
  created_by: number
  created_at: string
  updated_at: string
}

export interface CertCoverTemplateListParams extends PageParams {
  name?: string
  version?: string
  status?: string
}


// ---- 标准 ----
export interface Standard {
  id: number
  tenant_id: number
  status: string
  cnas_passed: string
  established: string
  method_code: string
  method_name: string
  method_name_en: string
  capability: string
  publish_date?: string | null
  implementation_date?: string | null
  authorized_signatory: string
  created_by: number
  created_at: string
  updated_at: string
}

export interface CreateStandardReq {
  status?: string
  cnas_passed?: string
  established?: string
  method_code: string
  method_name: string
  method_name_en?: string
  capability?: string
  publish_date?: string
  implementation_date?: string
  authorized_signatory?: string
}

export interface UpdateStandardReq extends CreateStandardReq {
  updated_at: string
}

export interface StandardListParams extends PageParams {
  method_code?: string
  method_name?: string
  status?: string
  capability?: string
}

/** 与列表筛选一致；导出为 Excel（.xlsx） */
export interface StandardExportReq {
  format: 'xlsx'
  id?: number
  /** 多选导出；与 id、列表筛选互斥，优先级 ids > id > 筛选 */
  ids?: number[]
  method_code?: string
  method_name?: string
  status?: string
  capability?: string
}

// ---- 标准仪器 ----
export type StandardInstrumentManagementStatus = '在用' | '停用' | '溯源中' | '维修中' | '报废'
export type StandardAssetStockStatus = '实验室内' | '实验室外'

export interface StandardInstrumentTraceHistory {
  historyId: number
  instrument_id: number
  name: string
  model: string
  measurement_range: string
  serial_no: string
  management_no: string
  technical_specs: string
  management_status: StandardInstrumentManagementStatus
  manufacturer: string
  trace_date: string
  trace_cycle_months: number
  valid_until: string
  certificate_no: string
  trace_org: string
  trace_method: string
  department_id?: number
  department: string
  trace_fee?: string
  trace_result?: string
  created_at?: string
  updated_at?: string
}

export interface StandardInstrument {
  id: number
  tenant_id: number
  name: string
  model: string
  measurement_range: string
  serial_no: string
  management_no: string
  technical_specs: string
  management_status: StandardInstrumentManagementStatus
  manufacturer: string
  stock_status?: StandardAssetStockStatus
  stock_out_person?: string
  stock_out_date?: string
  stock_in_person?: string
  stock_in_date?: string
  stock_remark?: string
  trace_date: string
  trace_cycle_months: number
  valid_until: string
  certificate_no: string
  trace_org: string
  trace_method: string
  department_id?: number
  department: string
  trace_fee?: string
  trace_result?: string
  created_by?: number
  created_at?: string
  updated_at?: string
  trace_history?: StandardInstrumentTraceHistory[]
}

export interface StandardInstrumentTraceHistoryReq {
  name?: string
  model?: string
  measurement_range?: string
  serial_no?: string
  management_no?: string
  technical_specs?: string
  management_status?: StandardInstrumentManagementStatus
  manufacturer?: string
  trace_date: string
  trace_cycle_months: number
  valid_until: string
  certificate_no: string
  trace_org: string
  trace_method: string
  department_id?: number
  department?: string
  trace_fee?: string
  trace_result?: string
  updated_at?: string
}

export type UpdateStandardInstrumentTraceHistoryReq = StandardInstrumentTraceHistoryReq & {
  updated_at: string
}

export interface CreateStandardInstrumentReq extends StandardInstrumentTraceHistoryReq {
  name: string
  model: string
  measurement_range: string
  serial_no: string
  management_no: string
  technical_specs: string
  management_status: StandardInstrumentManagementStatus
  manufacturer: string
}

/** 与后端 dto.BatchCreateStandardInstrumentReq 对齐；单批最多 1000 行，超出由后端 400 拒绝 */
export interface BatchCreateStandardInstrumentReq {
  items: CreateStandardInstrumentReq[]
}

export type UpdateStandardInstrumentReq = Pick<
  CreateStandardInstrumentReq,
  | 'name'
  | 'model'
  | 'measurement_range'
  | 'serial_no'
  | 'management_no'
  | 'technical_specs'
  | 'management_status'
  | 'manufacturer'
> & {
  updated_at: string
}

export interface StandardInstrumentListParams extends PageParams {
  keyword?: string
  name?: string
  model?: string
  measurement_range?: string
  management_no?: string
  serial_no?: string
  management_status?: string
  certificate_no?: string
  department?: string
  stock_status?: StandardAssetStockStatus
}

export interface StandardAssetStockItem {
  id: number
  updated_at: string
}

export interface StandardInstrumentStockOutReq {
  items: StandardAssetStockItem[]
  stock_out_person_id: number
  stock_out_date: string
  stock_remark?: string
}

export interface StandardInstrumentStockInReq {
  items: StandardAssetStockItem[]
  stock_in_person_id: number
  stock_in_date: string
  stock_remark?: string
}

export interface StandardInstrumentExportReq {
  format: 'xlsx'
  id?: number
  ids?: number[]
  keyword?: string
  name?: string
  management_no?: string
  serial_no?: string
}

// ---- 标准物质 ----
export interface StandardMaterial {
  id: number
  tenant_id: number
  management_no: string
  name: string
  model: string
  measurement_range: string
  batch_no: string
  technical_specs: string
  standard_value: string
  manufacturer: string
  value_date: string
  trace_cycle_months: number
  valid_until: string
  certificate_no: string
  calibration_unit: string
  department_id?: number
  department: string
  quantity: number
  stock_status?: StandardAssetStockStatus
  stock_out_person?: string
  stock_out_date?: string
  stock_in_person?: string
  stock_in_date?: string
  stock_remark?: string
  created_by?: number
  created_at?: string
  updated_at: string
}

export interface CreateStandardMaterialReq {
  management_no?: string
  name: string
  model: string
  measurement_range: string
  batch_no: string
  technical_specs: string
  standard_value: string
  manufacturer: string
  value_date: string
  trace_cycle_months: number
  valid_until: string
  certificate_no: string
  calibration_unit: string
  department_id?: number
  department?: string
  quantity: number
}

export interface UpdateStandardMaterialReq extends CreateStandardMaterialReq {
  updated_at: string
}

/** 与后端 dto.BatchCreateStandardMaterialReq 对齐；单批最多 1000 行，超出由后端 400 拒绝 */
export interface BatchCreateStandardMaterialReq {
  items: CreateStandardMaterialReq[]
}

export interface StandardMaterialListParams extends PageParams {
  keyword?: string
  name?: string
  model?: string
  measurement_range?: string
  management_no?: string
  batch_no?: string
  certificate_no?: string
  department?: string
  stock_status?: StandardAssetStockStatus
}

export interface StandardMaterialStockOutReq {
  items: StandardAssetStockItem[]
  stock_out_person_id: number
  stock_out_date: string
  stock_remark?: string
}

export interface StandardMaterialStockInReq {
  items: StandardAssetStockItem[]
  stock_in_person_id: number
  stock_in_date: string
  stock_remark?: string
}

// ---- 设备出入库记录 ----
export type StandardAssetType = 'instrument' | 'material'

export interface StandardAssetStockRecord {
  id: number
  asset_type: StandardAssetType
  asset_id: number
  asset_name: string
  stock_status: StandardAssetStockStatus
  stock_out_date: string
  stock_out_person: string
  stock_in_date: string
  stock_in_person: string
  remark: string
  created_at: string
  updated_at: string
}

export interface StandardAssetStockRecordListParams extends PageParams {
  asset_type?: StandardAssetType
  stock_status?: StandardAssetStockStatus
  stock_out_person?: string
  stock_in_person?: string
}

// ---- 委托单 ----
export type CommissionNumberMode = 'auto' | 'manual'

/**
 * 标准器 / 标准物质单行的结构化承载，与后端 dto.StandardItem JSON 字段严格一一对应。
 *
 * 设计语义：
 *  - 同时承载标准仪器与标准物质两类，靠 source_type 字段区分（"instrument" / "material"）；
 *    与 DB original_record_template_instruments 表设计一致，picker 也是两类共用一个 modal。
 *  - 所有字段都是 string（含日期 "YYYY-MM-DD" 字符串），与后端结构化数组按 JSON 落库时
 *    保持一致；前端在 antd Form 状态机内直接以 `StandardItem[]` 形态承载，不再走文本 round-trip。
 *  - source_type 仅有 "material" / "instrument" 两个合法值；空 / undefined 时后端兜底推断
 *    （命中模板 → 模板 source_type；calibration_unit 非空且 trace_org 为空 → material；其它 → instrument）。
 */
export interface StandardItem {
  name?: string
  model?: string
  manage_code?: string
  trace_date?: string
  valid_until?: string
  trace_org?: string
  calibration_unit?: string
  measurement_range?: string
  certificate_no?: string
  technical_specs?: string
  source_type?: "material" | "instrument"
}

/** 委托单设备清单单行（提交接口，无前端临时 key） */
/** 证书编制页「证书编制信息」草稿（存于 equipment_lines[].certificate_prepare） */
export interface CommissionEquipmentPrepareDraft {
  received_date?: string
  calibration_date?: string
  calibration_location?: Array<string | number>
  calibration_person?: string[]
  env_temperature?: string
  env_humidity?: string
  env_other?: string
  validity_period?: string
  audit_date?: string
  auditor?: string
  publish_date?: string
  approver?: string
  /** 已停用字段；技术依据以 technical_basis_standard_ids / technical_basis_text 为准。 */
  technical_basis?: string
  /** 标准 ID 列表（与 technical_basis 字符串语义一致，但保留结构便于直接使用） */
  technical_basis_standard_ids?: number[]
  /** 自由文本兜底（如方法编号+名称等无法匹配主数据的描述） */
  technical_basis_text?: string
  cert_inner_template?: string
  cert_report_template?: string
  /** 首次成功生成内页/证书时由后端锁定的内页 Excel 文件 ID，避免模版更新影响已出证设备行 */
  inner_template_excel_file_id?: number
  cert_report_excel_file_id?: number
  /**
   * 标记 inner_template_excel_file_id 指向的是「用户在本地 Excel/WPS 中编辑保存」的版本。
   * 后端 PDF 渲染（原始记录 / 校准结果 / 完整证书）以及再次「编辑内页」会据此跳过 tplengine.RenderBytes：
   * 用户编辑版的所有 `{{xxx}}` 占位符已被首次渲染消费，二次注入签名图会变 no-op 导致丢签名，
   * 必须按「所见即所得」直接转 PDF。切换/重选模版时由后端清空该字段。
   * 前端不直接编辑该字段；保留类型仅用于「编辑内页」自动保存后的缓存乐观更新。
   */
  inner_template_excel_user_edited?: boolean
  /** 「证书数据填写」table 编辑过的标准器/标准物质条目，按 picker 选定顺序保序。 */
  standards?: StandardItem[]
  cert_remark?: string
}

export interface CommissionOrderEquipmentLineReq {
  /** 后端稳定行 ID；新建行可由前端生成 UUID，便于与责任人绑定 */
  line_id?: string
  device_name: string
  device_model: string
  factory_number: string
  manage_number: string
  manufacturer: string
  /** 样品状态：带回 / 现场 */
  sample_status: 'bring_back' | 'on_site'
  /** 附件（可选） */
  attachment?: string
  assignment_status: 'pending' | 'done'
  assignee_user_id?: number
  assignee_display_name?: string
  /** 样品收发：stocked_in / stocked_out；空=未登记 */
  stock_status?: SampleEquipmentStockStatus | string
  stock_in_date?: string
  stock_in_person?: string
  stock_in_person_id?: number
  stock_out_date?: string
  stock_out_person?: string
  stock_out_person_id?: number
  stock_remark?: string
  certificate_prepare?: CommissionEquipmentPrepareDraft
}

/** POST /commission-orders/:id/equipment/assign */
export interface CommissionOrderEquipmentAssignReq {
  assignee_user_id: number
  /** 当前已持久化设备清单数组下标（与列表/详情接口 equipment_lines 顺序一致） */
  line_indexes: number[]
  updated_at: string
}

/** POST /commission-orders/:id/equipment-lines/batch-delete */
export interface CommissionOrderEquipmentBatchDeleteReq {
  /** 当前已持久化设备清单数组下标（与列表/详情接口 equipment_lines 顺序一致） */
  line_indexes: number[]
  updated_at: string
}

/** POST /commission-orders/:id/equipment-lines/batch-sample-status */
export interface CommissionOrderEquipmentBatchSampleStatusReq {
  /** 当前已持久化设备清单数组下标（与列表/详情接口 equipment_lines 顺序一致） */
  line_indexes: number[]
  sample_status: 'bring_back' | 'on_site'
  updated_at: string
}

/** PUT /commission-orders/:id/equipment-lines（仅替换设备清单，一条请求可提交多行） */
export interface ReplaceCommissionOrderEquipmentLinesReq {
  equipment_lines: CommissionOrderEquipmentLineReq[]
  updated_at: string
}

/** 客户对服务的要求（与后端 JSON 一致） */
export interface CommissionServiceRequirements {
  time_requirement: 'rush_24h' | 'normal' | 'by_date'
  pickup_by_date?: string
  instrument_pickup_method: 'self' | 'deliver_back' | 'mail_back'
  payment_method: 'transfer' | 'check' | 'cash'
  uncalibratable_handling: 'agree_outsource' | 'no_outsource'
  cert_forward_requirement: 'forward' | 'no_forward'
  calibration_norm_requirement: 'national_standard' | 'customer_doc'
  calibration_label_requirement: 'need_label' | 'no_label'
  /** 证书判定要求 */
  cert_conclusion_requirement: 'need_conclusion' | 'no_conclusion'
  /** 证书有效期/建议再校日期等说明 */
  cert_validity_requirement: 'need_validity_note' | 'no_validity_note'
}

export interface CommissionOrder {
  id: number
  tenant_id: number
  number_mode: CommissionNumberMode
  order_number: string
  customer_id: number
  creator_display: string
  biz_created_at: string
  service_requirements: CommissionServiceRequirements
  other_requirements_html: string
  business_staff_user_id: number
  image_file_ids: number[]
  attachment_file_ids: number[]
  equipment_lines?: CommissionOrderEquipmentLineReq[]
  created_by: number
  created_at: string
  updated_at: string
}

export interface CommissionOrderListItem extends CommissionOrder {
  customer_name: string
  /** 来自客户主档，与委托单 customer_id 关联 */
  customer_address: string
  cert_org_name_zh: string
  cert_address_zh: string
  business_staff_name: string
  workflow_step?: number
  workflow_status?: string
  workflow_assignee_user_id?: number
  /** 列表状态列：委托单创建 | 委托单审核 | 审核完成 */
  workflow_status_label?: string
  /**
   * 证书编制列表在 equipment_assigned_me 时返回：普通用户仅本人责任行；管理员为全部「任务已分配」行；
   * line_index 为库内 equipment_lines 下标，与证书编制流程接口一致
   */
  prepare_certificate_lines?: Array<CommissionOrderEquipmentLineReq & { line_index: number }>
}

export interface CreateCommissionOrderReq {
  number_mode: CommissionNumberMode
  order_number?: string
  customer_id: number
  biz_created_at: string
  service_requirements: CommissionServiceRequirements
  other_requirements_html: string
  business_staff_user_id: number
  image_file_ids?: number[]
  attachment_file_ids?: number[]
  equipment_lines?: CommissionOrderEquipmentLineReq[]
}

export interface UpdateCommissionOrderReq extends CreateCommissionOrderReq {
  updated_at: string
}

export interface CommissionOrderListParams extends PageParams {
  keyword?: string
  order_number?: string
  /** 按客户 ID 筛选（样品管理工作台等场景） */
  customer_id?: number
  customer_name?: string
  time_requirement?: string
  instrument_pickup_method?: string
  payment_method?: string
  business_staff_name?: string
  order_status?: string
  cert_number?: string
  device_name?: string
  device_model?: string
  factory_number?: string
  manage_number?: string
  manufacturer?: string
  /** 仅看待办（当前登录用户为流程处理人且未结束）；传 true 时由后端筛选 */
  workflow_pending_me?: boolean
  /** 仅看设备任务已分配给自己的行（非 admin）；证书编制页应传 true */
  equipment_assigned_me?: boolean
  /** 证书编制流程步骤筛选：1=证书审核提交，2=证书审核，3=证书批准 */
  cert_workflow_step?: 1 | 2 | 3
  /**
   * 仅保留证书编制流程已「完成」(status=completed) 的设备行；
   * 证书报告 / 原始记录打印导出页应固定传 true，未走完流程的数据不进入打印池。
   */
  cert_workflow_completed_only?: boolean
}

/** GET /commission-orders/:id/workflow */
export interface CommissionOrderWorkflowEvent {
  kind: string
  created_at: string
  actor_user_id: number
  actor_user_name: string
  opinion?: string
  assignee_user_id?: number
  assignee_user_name?: string
}

export interface WorkflowUserOption {
  id: number
  username?: string
  name: string
}

export interface CommissionOrderWorkflowState {
  commission_order_id: number
  order_number: string
  order_created_at: string
  created_by_user_id: number
  created_by_display_name: string
  business_staff_user_id: number
  /** 角色「技术负责人（tech_lead）」中创建时间最早的在职用户主键；未配置时为 0，前端按业务人员兜底 */
  tech_lead_user_id?: number
  step: number
  status: 'in_progress' | 'approved'
  current_assignee_user_id: number
  current_assignee_name: string
  /** JWT 用户 id（与登录态一致），用于与 current_assignee_user_id 做数值比较 */
  current_user_id?: number
  /** 当前用户为处理人：可填本步表单并提交 */
  can_act: boolean
  /** 当前用户可转派（含管理员） */
  can_reassign?: boolean
  /** 仅当前处理人 */
  is_current_assignee: boolean
  events: CommissionOrderWorkflowEvent[]
  /** 转派/选人：与流程接口一并返回，无需 user:read */
  picker_users: WorkflowUserOption[]
}

export interface CommissionOrderWorkflowTodo {
  commission_order_id: number
  order_number: string
  customer_name: string
  step: number
  /** workflow：流程当前处理人；equipment_assigned：设备已分配且 assignee_user_id 为当前用户 */
  todo_kind?: 'workflow' | 'equipment_assigned'
  /** 设备任务待办：已分配给当前用户的设备行数 */
  assigned_equipment_count?: number
}

/** 证书编制流程（委托单 × 设备行） */
export interface CertificatePrepareWorkflowEvent {
  kind: string
  created_at: string
  actor_user_name: string
  next_user_name?: string
  assignee_user_name?: string
}

export interface CertificatePrepareWorkflowState {
  persisted: boolean
  row_key: string
  commission_order_id: number
  equipment_line_index: number
  order_number: string
  step: number
  status: 'in_progress' | 'completed'
  preparer_user_id: number
  current_assignee_user_id: number
  current_assignee_name: string
  reviewer_user_id?: number | null
  reviewer_user_name?: string
  approver_user_id?: number | null
  approver_user_name?: string
  current_user_id: number
  can_act: boolean
  can_reassign?: boolean
  is_current_assignee: boolean
  events: CertificatePrepareWorkflowEvent[]
  picker_users: WorkflowUserOption[]
}

export interface CertificatePrepareWorkflowTodo {
  commission_order_id: number
  equipment_line_index: number
  order_number: string
  customer_name: string
  device_name: string
  step: number
}

/** PATCH /commission-orders/:id/certificate-prepare-form/:lineIndex */
export interface CertificatePrepareFormSaveReq {
  /** 打印/导出页修改态下可同步更新客户主档 */
  customer_name?: string
  customer_address?: string
  cert_org_name_zh?: string
  cert_address_zh?: string
  /** 打印/导出页修改态下可同步更新设备行与标准仪器主档 */
  device_name?: string
  device_model?: string
  factory_number?: string
  manage_number?: string
  manufacturer?: string
  received_date: string
  calibration_date: string
  calibration_location: Array<string | number>
  calibration_person: string[]
  env_temperature: string
  env_humidity: string
  env_other: string
  validity_period: string
  audit_date: string
  auditor: string
  publish_date: string
  approver: string
  /** 已停用字段；保留空字符串以兼容当前前端 payload 类型。 */
  technical_basis: string
  /** 结构化标准 ID 列表。 */
  technical_basis_standard_ids?: number[]
  /** 自由文本技术依据，不参与引用统计。 */
  technical_basis_text?: string
  cert_inner_template: string
  cert_report_template: string
  /** 显式重选模板时，要求后端不沿用已锁定的内页模板 Excel 快照。 */
  reset_inner_template_excel_snapshot?: boolean
  /** 显式重选模板时，要求后端不沿用已锁定的封面模板 Excel 快照。 */
  reset_cert_report_excel_snapshot?: boolean
  /** PR2 重构后改为结构化数组；与 CommissionEquipmentPrepareDraft.standards 形态一致。 */
  standards: StandardItem[]
  cert_remark: string
  updated_at: string
}

// ---- 认证 ----
export interface LoginReq {
  username: string
  password: string
  /** 可选；多企业同登录名时需传，与后端 tenant_code 一致 */
  tenant_code?: string
}

export interface LoginResp {
  access_token: string
  /** Electron 等无法携带 Cookie 的客户端通过 body 获取 refresh token */
  refresh_token?: string
  permissions?: string[]
  user_name?: string
  /** 当前登录用户主键，与 JWT 一致；用于与业务数据中的 user_id 比较，勿用展示名 */
  user_id?: number
  tenant_id: number
  industry_type: IndustryType
}

export interface RegisterReq {
  tenant_code: string
  username: string
  password: string
  name: string
  email?: string
}

export interface ChangePasswordReq {
  old_password: string
  new_password: string
}

export interface VerifyPasswordReq {
  password: string
}

export interface UpdateProfileReq {
  name?: string
  email?: string
  updated_at: string
}

export interface ProfileResp {
  id: number
  username: string
  name: string
  email: string
  signature_file_id?: number | null
  roles: string[]
  updated_at: string
}

// ---- 异步任务 ----
export interface AsyncTask {
  id: string
  type: string
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
  result?: string
  error?: string
  created_at: string
}

// ---- 租户 ----
export interface Tenant {
  id: number
  name: string
  code: string
  plan: string
  status: string
}

// ---- 权限 ----
export interface PermissionVO {
  id: number
  code: string
  name: string
  resource: string
  action: string
  type: 'menu' | 'button' | 'api'
  parent_id: number
  sort: number
  description: string
}

export interface PermissionTreeNode {
  id: number
  code: string
  name: string
  type: string
  description: string
  children?: PermissionTreeNode[]
}

// ---- 角色 ----
export interface Role {
  id: number
  name: string
  display_name?: string
  description: string
  permissions?: PermissionVO[]
  user_count: number
  created_at: string
  updated_at: string
}

export interface CreateRoleReq {
  name: string
  display_name?: string
  description?: string
}

export interface UpdateRoleReq {
  name?: string
  display_name?: string
  description?: string
  updated_at: string
}

export interface SetRolePermissionsReq {
  permission_ids: number[]
  updated_at: string
}

export interface RoleListParams extends PageParams {
  keyword?: string
}

export interface RoleBrief {
  id: number
  name: string
  display_name?: string
}

// ---- 用户管理 ----
export interface UserInfo {
  id: number
  username: string
  name: string
  email: string
  status: string
  signature_file_id?: number | null
  roles: RoleBrief[]
  created_at: string
  updated_at: string
}

export interface CreateUserReq {
  username: string
  password: string
  name: string
  email?: string
  role_ids?: number[]
}

export interface UpdateUserReq {
  name?: string
  email?: string
  updated_at: string
}

export interface SetUserRolesReq {
  role_ids: number[]
  updated_at: string
}

export interface SetUserStatusReq {
  status: 'active' | 'disabled'
  updated_at: string
}

/** 批量更新：至少包含 status 或 role_ids 之一；省略 role_ids 表示不修改角色；传空数组表示清空角色 */
export interface BatchUpdateUsersReq {
  user_ids: number[]
  status?: 'active' | 'disabled'
  role_ids?: number[]
}

export interface AdminResetUserPasswordReq {
  new_password: string
}

export interface UserListParams extends PageParams {
  status?: string
  keyword?: string
  username?: string
  name?: string
  email?: string
}

// ---- 文件 ----
export interface FileRecord {
  id: number
  file_name: string
  storage_key: string
  file_size: number
  content_type: string
  uploaded_by: number
  created_at: string
}

// ---- 字典 ----
export interface DictItem {
  label: string
  value: string
  color?: string
}

export interface DictGroup {
  name: string
  items: DictItem[]
}

// ---- 审计日志 ----
export interface AuditLog {
  id: number
  tenant_id?: number
  trace_id: string
  user_id: number
  user_name: string
  action: string
  resource_type: string
  resource_id: number
  before_data: string
  after_data: string
  ip_addr: string
  remark: string
  menu_name: string
  button_name: string
  api_method: string
  api_path: string
  permission_code: string
  created_at: string
}

export interface AuditLogListParams extends PageParams {
  action?: string
  resource_type?: string
  user_name?: string
  start_date?: string
  end_date?: string
  menu_name?: string
  button_name?: string
  api_method?: string
  api_path?: string
  permission_code?: string
  trace_id?: string
}

// ---- 通知 ----
export interface Notification {
  id: number
  title: string
  content: string
  type: string
  ref_type: string
  ref_id: number
  is_read: boolean
  created_at: string
}

export interface NotificationListParams extends PageParams {
  is_read?: boolean
  type?: string
}

export interface NotificationCountResp {
  unread: number
}

// ---- 菜单配置（后端动态下发） ----
export interface MenuConfigItem {
  key: string
  icon: string
  label: string
  labelKey?: string
  /** 无 auth：始终显示；`string[]` 为**任一则可见**（与 PRD 侧栏多码规则一致） */
  auth?: string | string[]
  /** 为 true 时仅「内置开发者」白名单用户可见，与 BUILT_IN_DEVELOPER_USER_IDS 一致 */
  developerOnly?: boolean
  /**
   * 兼容：非空时与 developerOnly 类似，见侧栏 isDeveloperMenuItemVisible（不比较数值，只表示本项为内置菜单）
   * @deprecated 新配置请用 developerOnly: true
   */
  developerUserId?: number
  module?: string
  children?: MenuConfigItem[]
}

// ---- 用户反馈 ----
export type UserFeedbackType = 'bug' | 'suggestion'
export type UserFeedbackStatus = 'pending' | 'processing' | 'resolved' | 'closed'

export interface FeedbackAttachment {
  id: number
  file_name: string
  content_type: string
  file_size: number
}

export interface UserFeedback {
  id: number
  user_id: number
  user_name: string
  menu_key: string
  menu_label: string
  feedback_type: UserFeedbackType
  content: string
  attachment_file_ids: number[]
  attachments?: FeedbackAttachment[]
  current_path: string
  app_version: string
  client_info: string
  status: UserFeedbackStatus
  developer_reply?: string
  developer_reply_attachment_file_ids?: number[]
  developer_reply_attachments?: FeedbackAttachment[]
  developer_replied_at?: string
  created_at: string
  updated_at: string
}

export interface CreateUserFeedbackReq {
  menu_key?: string
  menu_label?: string
  feedback_type: UserFeedbackType
  content: string
  attachment_file_ids?: number[]
  current_path?: string
  app_version?: string
  client_info?: string
}

export interface UpdateUserFeedbackStatusReq {
  status: UserFeedbackStatus
  updated_at: string
}

export interface UpdateUserFeedbackReplyReq {
  content?: string
  attachment_file_ids?: number[]
  updated_at: string
}

export interface UserFeedbackListParams extends PageParams {
  keyword?: string
  feedback_type?: UserFeedbackType
  status?: UserFeedbackStatus
  menu_key?: string
  user_name?: string
  start_date?: string
  end_date?: string
}

export interface UserFeedbackMineListParams extends PageParams {
  keyword?: string
  status?: UserFeedbackStatus
}

// ---- 系统配置 ----
export interface SystemConfig {
  key: string
  value: string
  description: string
  updated_at: string
}

export interface UpdateConfigReq {
  key: string
  value: string
  updated_at: string
}

// ---- 导出/导入 ----
export interface ExportReq {
  format: 'csv' | 'xlsx'
  status?: string
  type?: string
  keyword?: string
  sort_by?: string
  sort_order?: string
}

export interface ImportResp {
  total: number
  success: number
  failed: number
  errors?: string[]
}

// ---- 批量操作 ----
export interface BatchDeleteReq {
  ids: number[]
}
