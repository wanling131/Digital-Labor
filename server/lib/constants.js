/**
 * 业务常量（避免魔法字符串分散在路由中）
 */

/** 人员状态流转 */
export const PERSON_STATUS_LIST = ['预注册', '已实名', '已签约', '已进场', '已离场', '黑名单']

/** 合同实例状态 */
export const CONTRACT_STATUS = {
  PENDING: '待签署',
  SIGNED: '已签署',
  INVALIDATED: '已作废',
}

/** 结算单状态 */
export const SETTLEMENT_STATUS = {
  PENDING: '待确认',
  CONFIRMED: '已确认',
  REJECTED: '已驳回',
}

/** 用户角色 */
export const USER_ROLE = {
  ADMIN: 'admin',
  USER: 'user',
}

/** 分页默认与上限 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
}
