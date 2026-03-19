/**
 * 人员状态常量
 */
export const PERSON_STATUS = {
  PRE_REGISTER: "预注册",
  VERIFIED: "已实名",
  SIGNED: "已签约",
  ON_SITE: "已进场",
  OFF_SITE: "已离场",
  BLACKLIST: "黑名单",
} as const

/**
 * 合同状态常量
 */
export const CONTRACT_STATUS = {
  PENDING: "待签署",
  SIGNED: "已签署",
  EXPIRED: "已过期",
  CANCELLED: "已取消",
} as const

/**
 * 结算状态常量
 */
export const SETTLEMENT_STATUS = {
  PENDING: "待确认",
  CONFIRMED: "已确认",
  PAID: "已支付",
} as const

/**
 * 审核状态常量
 */
export const REVIEW_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const

/**
 * 组织类型常量
 */
export const ORG_TYPE = {
  COMPANY: "company",
  DEPARTMENT: "department",
  PROJECT: "project",
  TEAM: "team",
} as const

/**
 * 权限键常量
 */
export const PERMISSION_KEYS = {
  // 人员管理
  PERSON_VIEW: "person:view",
  PERSON_ADD: "person:add",
  PERSON_EDIT: "person:edit",
  PERSON_DELETE: "person:delete",
  PERSON_EXPORT: "person:export",
  PERSON_IMPORT: "person:import",
  
  // 合同管理
  CONTRACT_VIEW: "contract:view",
  CONTRACT_CREATE: "contract:create",
  CONTRACT_TEMPLATE: "contract:template",
  CONTRACT_ARCHIVE: "contract:archive",
  
  // 考勤管理
  ATTENDANCE_VIEW: "attendance:view",
  ATTENDANCE_IMPORT: "attendance:import",
  ATTENDANCE_AUDIT: "attendance:audit",
  ATTENDANCE_EXPORT: "attendance:export",
  
  // 结算管理
  SETTLEMENT_VIEW: "settlement:view",
  SETTLEMENT_CREATE: "settlement:create",
  SETTLEMENT_AUDIT: "settlement:audit",
  SETTLEMENT_EXPORT: "settlement:export",
  
  // 系统管理
  SYSTEM_ORG: "system:org",
  SYSTEM_ROLE: "system:role",
  SYSTEM_USER: "system:user",
  SYSTEM_LOG: "system:log",
} as const

/**
 * API 路径常量
 */
export const API_PATHS = {
  // 认证
  AUTH_LOGIN: "/api/auth/login",
  AUTH_LOGOUT: "/api/auth/logout",
  
  // 人员
  PERSON_ARCHIVE: "/api/person/archive",
  PERSON_STATUS: "/api/person/status",
  PERSON_JOB_TITLES: "/api/person/job-titles",
  
  // 组织
  ORG_TREE: "/api/sys/org",
  
  // 角色
  ROLE_LIST: "/api/sys/role",
  
  // 考勤
  ATTENDANCE_REPORT: "/api/attendance/report",
  ATTENDANCE_LOG: "/api/attendance/log",
  
  // 合同
  CONTRACT_LIST: "/api/contract",
  CONTRACT_TEMPLATE: "/api/contract/template",
  
  // 结算
  SETTLEMENT_LIST: "/api/settlement",
} as const
