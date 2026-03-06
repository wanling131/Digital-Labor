/**
 * 简单请求校验与分页参数解析
 */
import { PAGINATION } from './constants.js'

/**
 * 解析分页参数，返回 { limit, offset, page, pageSize }
 * @param {object} query - req.query
 * @param {{ defaultPageSize?: number, maxPageSize?: number }} [opts]
 */
export function parsePagination(query, opts = {}) {
  const defaultSize = opts.defaultPageSize ?? PAGINATION.DEFAULT_PAGE_SIZE
  const maxSize = opts.maxPageSize ?? PAGINATION.MAX_PAGE_SIZE
  const page = Math.max(1, parseInt(query.page, 10) || PAGINATION.DEFAULT_PAGE)
  const pageSize = Math.min(maxSize, Math.max(1, parseInt(query.pageSize, 10) || defaultSize))
  const limit = pageSize
  const offset = (page - 1) * pageSize
  return { limit, offset, page, pageSize }
}

/**
 * 必填字符串（trim 后非空）
 * @param {any} value
 * @param {string} [fieldName='字段']
 * @returns {{ ok: false, message: string } | { ok: true, value: string }}
 */
export function requireNonEmptyString(value, fieldName = '字段') {
  const s = value != null && typeof value === 'string' ? value.trim() : ''
  if (!s) return { ok: false, message: `${fieldName}必填` }
  return { ok: true, value: s }
}

/**
 * 必填正整数数组
 * @param {any} value
 * @param {string} [fieldName='ids']
 * @returns {{ ok: false, message: string } | { ok: true, value: number[] }}
 */
export function requirePositiveIntArray(value, fieldName = 'ids') {
  if (!Array.isArray(value) || value.length === 0) return { ok: false, message: `${fieldName} 须为非空数组` }
  const nums = value.map((v) => parseInt(v, 10)).filter((n) => Number.isInteger(n) && n > 0)
  if (nums.length === 0) return { ok: false, message: `${fieldName} 须为正整数数组` }
  return { ok: true, value: nums }
}
