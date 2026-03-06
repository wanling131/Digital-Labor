/**
 * 操作日志中间件（非开发可读：每次请求结束后把谁、做了什么、成功与否写入日志表）
 */
import { db } from '../db/index.js'

export function logMiddleware(req, res, next) {
  const start = Date.now()
  const originalJson = res.json.bind(res)
  res.json = function (body) {
    try {
      const userId = req.user?.userId
      const username = req.user?.username || ''
      const module = req.path?.split('/').filter(Boolean).join('/') || 'unknown'
      const action = req.method
      const detail = req.body && Object.keys(req.body).length ? JSON.stringify(req.body).slice(0, 500) : ''
      const result = res.statusCode < 400 ? 'success' : 'fail'
      db.prepare(
        'INSERT INTO op_log (user_id, username, module, action, detail, result) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(userId ?? null, username, module, action, detail, result)
    } catch (e) {
      console.error('log error', e)
    }
    return originalJson(body)
  }
  next()
}
