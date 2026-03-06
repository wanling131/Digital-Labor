/**
 * 全局错误处理中间件：捕获路由中未处理的异常，返回统一 500 格式
 * 约定：业务中 res.status(4xx).json(...) 已发送则不再抛错；未 catch 的异常由此处理
 */
import { toMessage } from '../lib/response.js'

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err)
  const status = err.status ?? err.statusCode ?? 500
  const code = err.code || (status >= 500 ? 'INTERNAL_ERROR' : 'ERROR')
  const message = toMessage(err)
  res.status(status).json({ code, message })
}
