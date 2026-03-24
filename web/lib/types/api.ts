/**
 * API 响应通用类型定义
 */

// ==================== 通用响应类型 ====================

/** 标准 API 响应包装 */
export interface ApiResponse<T = unknown> {
  ok?: boolean
  message?: string
  data?: T
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/** 分页请求参数 */
export interface PaginationParams {
  page?: number
  pageSize?: number
}

// ==================== 用户与认证 ====================

/** 用户信息 */
export interface User {
  id: number
  username: string
  name: string
  org_id?: number
  org_name?: string
  role: string
  enabled: number
  created_at?: string
}

/** 登录响应 */
export interface LoginResponse {
  token: string
  user: User
}

/** 工人登录响应 */
export interface WorkerLoginResponse {
  token: string
  person: Person
}

/** 权限信息 */
export interface PermissionInfo {
  permissions: string[]
  org_id: number | null
  role: string
}

// ==================== 组织 ====================

/** 组织节点 */
export interface Org {
  id: number
  parent_id: number
  name: string
  type: string
  sort: number
  manager?: string
  created_at?: string
  memberCount?: number
  children?: Org[]
}

/** 组织树响应 */
export interface OrgTreeResponse {
  tree: Org[]
}

// ==================== 人员档案 ====================

/** 人员档案 */
export interface Person {
  id: number
  org_id?: number
  org_name?: string
  work_no?: string
  name: string
  id_card?: string
  mobile?: string
  bank_card?: string
  status: string
  contract_signed: number
  on_site: number
  job_title?: string
  work_address?: string
  signature_image?: string
  face_verified: number
  face_verified_at?: string
  auth_review_status?: string
  created_at?: string
  updated_at?: string
}

/** 人员证书 */
export interface PersonCertificate {
  id: number
  name: string
  certificate_no?: string
  issue_date?: string
  expiry_date?: string
  status: string
}

/** 状态统计 */
export interface StatusCount {
  status: string
  count: number
}

// ==================== 合同 ====================

/** 合同模板 */
export interface ContractTemplate {
  id: number
  name: string
  file_path?: string
  version: number
  is_visual: number
  created_at?: string
  variables?: TemplateVariable[]
}

/** 模板变量 */
export interface TemplateVariable {
  id?: number
  name: string
  label: string
  type: string
  options?: string
  required: number
}

/** 合同实例 */
export interface ContractInstance {
  id: number
  template_id?: number
  title: string
  person_id: number
  person_name?: string
  work_no?: string
  person_org_id?: number
  org_name?: string
  status: string
  deadline?: string
  signed_at?: string
  pdf_path?: string
  sign_image_snapshot?: string
  signature_hash?: string
  created_at?: string
}

// ==================== 考勤 ====================

/** 考勤记录 */
export interface Attendance {
  id: number
  person_id: number
  person_name?: string
  work_no?: string
  org_id?: number
  org_name?: string
  work_date: string
  clock_in?: string
  clock_out?: string
  hours: number
  standard_hours: number
  overtime_hours: number
  created_at?: string
}

/** 打卡日志 */
export interface ClockLog {
  id: number
  person_id: number
  person_name?: string
  work_no?: string
  org_name?: string
  punch_at: string
  type: 'in' | 'out'
  source: string
  created_at?: string
}

// ==================== 结算 ====================

/** 结算单 */
export interface Settlement {
  id: number
  person_id: number
  person_name?: string
  work_no?: string
  period_start: string
  period_end: string
  total_hours: number
  amount_due: number
  amount_paid: number
  status: string
  confirm_at?: string
  confirm_method?: string
  sign_image_snapshot?: string
  created_at?: string
  updated_at?: string
}

// ==================== 通知 ====================

/** 通知消息 */
export interface Notification {
  id: number
  person_id: number
  type: string
  title: string
  body?: string
  read_at?: string
  created_at?: string
}

// ==================== 操作日志 ====================

/** 操作日志 */
export interface OpLog {
  id: number
  user_id?: number
  username?: string
  module: string
  action: string
  detail?: string
  result?: string
  data_before?: string
  data_after?: string
  created_at?: string
}

// ==================== 设备与现场 ====================

/** 设备信息 */
export interface Equipment {
  id: number
  org_id?: number
  org_name?: string
  name: string
  code?: string
  status: string
  created_at?: string
  updated_at?: string
}

/** 现场日志 */
export interface SiteLog {
  id: number
  org_id?: number
  org_name?: string
  user_id?: number
  user_name?: string
  log_type: string
  content?: string
  created_at?: string
}

/** 在岗看板数据 */
export interface BoardData {
  projects: Array<{
    org_id: number
    org_name: string
    expected: number
    count: number
  }>
  total: number
  total_expected: number
}

// ==================== 工种配置 ====================

/** 工种配置 */
export interface JobTitleConfig {
  id: number
  code?: string
  name: string
  parent_id?: number
  sort: number
  children?: JobTitleConfig[]
}

/** 工种列表响应 */
export interface JobTitlesResponse {
  list: JobTitleConfig[] | string[]
  flat: string[]
}

// ==================== 数据看板 ====================

/** KPI 看板数据 */
export interface KpiData {
  totalPersons: number
  onSiteCount: number
  contractSignedCount: number
  todayAttendance: number
}

/** 趋势数据点 */
export interface TrendPoint {
  date: string
  count: number
}

// ==================== 导入结果 ====================

/** 批量导入结果 */
export interface ImportResult {
  ok: boolean
  imported: number
  total: number
  error_count: number
  errors: Array<{
    row: number
    errors: string[]
    data?: Record<string, unknown>
  }>
  error_rows: number[]
  message: string
}
