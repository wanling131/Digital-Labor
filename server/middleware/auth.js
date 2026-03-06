/**
 * 登录校验（非开发可读：除登录接口外，请求都要带有效 token，否则返回 401）
 */
import jwt from 'jsonwebtoken'
import { err } from '../lib/response.js'

const SECRET = process.env.JWT_SECRET || 'labor-secret-change-in-prod'

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}

export function authMiddleware(req, res, next) {
  const auth = req.headers.authorization
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return err(res, 401, '未登录')
  try {
    req.user = jwt.verify(token, SECRET)
    next()
  } catch (e) {
    return err(res, 401, '登录已过期')
  }
}

export function optionalWorkerAuth(req, res, next) {
  const auth = req.headers.authorization
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (token) {
    try {
      req.user = jwt.verify(token, SECRET)
    } catch (_) {}
  }
  next()
}

/** 仅工人端接口使用：无 workerId 则 401 */
export function requireWorker(req, res, next) {
  if (!req.user?.workerId) return err(res, 401, '请使用工人端登录')
  next()
}
