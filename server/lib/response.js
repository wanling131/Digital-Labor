/**
 * 统一响应格式（供路由层选用，前端可据此解析）
 * 成功：直接返回业务数据，或 { data } 包裹
 * 错误：HTTP 4xx/5xx + body { code, message [, details ] }
 */

const DEFAULT_CODES = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  500: 'INTERNAL_ERROR',
}

/**
 * 发送业务成功数据（不改变现有习惯：多数接口直接 res.json(data)，此处为可选封装）
 * @param {import('express').Response} res
 * @param {any} data
 * @param {number} [status=200]
 */
export function ok(res, data, status = 200) {
  res.status(status).json(data)
}

/**
 * 发送分页列表（统一格式：{ list, total, page?, pageSize? }）
 * @param {import('express').Response} res
 * @param {object} options
 * @param {any[]} options.list
 * @param {number} options.total
 * @param {number} [options.page]
 * @param {number} [options.pageSize]
 */
export function paginated(res, { list, total, page, pageSize }) {
  const body = { list, total }
  if (page != null) body.page = page
  if (pageSize != null) body.pageSize = pageSize
  res.status(200).json(body)
}

/**
 * 发送错误响应（统一格式：{ code, message [, details ] }）
 * @param {import('express').Response} res
 * @param {number} status
 * @param {string} message
 * @param {{ code?: string, details?: any }} [opts]
 */
export function err(res, status, message, opts = {}) {
  const code = opts.code || DEFAULT_CODES[status] || 'ERROR'
  const body = { code, message }
  if (opts.details != null) body.details = opts.details
  res.status(status).json(body)
}

/**
 * 从 Error 或字符串生成 message
 * @param {Error|string} e
 * @returns {string}
 */
export function toMessage(e) {
  if (typeof e === 'string') return e
  return e?.message || '服务器错误'
}
