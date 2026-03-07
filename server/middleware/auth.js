/**
 * 登录校验（非开发可读：除登录接口外，请求都要带有效 token，否则返回 401）
 * 增强功能：Token刷新、黑名单、多设备登录控制
 */
import jwt from 'jsonwebtoken'
import { err } from '../lib/response.js'
import { cache } from '../lib/cache.js'

const SECRET = process.env.JWT_SECRET || 'labor-secret-change-in-prod'
const TOKEN_VERSION = process.env.TOKEN_VERSION || '1'

// Token配置
const TOKEN_CONFIG = {
  accessTokenExpiry: '2h',      // 访问令牌有效期
  refreshTokenExpiry: '7d',     // 刷新令牌有效期
  refreshThreshold: 30 * 60     // 提前30分钟刷新
}

/**
 * 生成访问令牌
 */
export function signToken(payload) {
  return jwt.sign({ ...payload, version: TOKEN_VERSION, type: 'access' }, SECRET, { 
    expiresIn: TOKEN_CONFIG.accessTokenExpiry 
  })
}

/**
 * 生成刷新令牌
 */
export function signRefreshToken(payload) {
  const refreshToken = jwt.sign({ ...payload, version: TOKEN_VERSION, type: 'refresh' }, SECRET, { 
    expiresIn: TOKEN_CONFIG.refreshTokenExpiry 
  })
  
  // 存储刷新令牌到缓存
  const key = `refresh:${payload.id || payload.workerId}`
  cache.set(key, refreshToken, 7 * 24 * 60 * 60)
  
  return refreshToken
}

/**
 * 验证Token是否有效
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, SECRET)
    
    // 检查版本
    if (decoded.version !== TOKEN_VERSION) {
      return { valid: false, error: 'Token版本已过期' }
    }
    
    // 检查是否在黑名单中
    const blacklistKey = `blacklist:${token}`
    if (cache.get(blacklistKey)) {
      return { valid: false, error: 'Token已被注销' }
    }
    
    return { valid: true, decoded }
  } catch (error) {
    return { valid: false, error: error.message }
  }
}

/**
 * 检查Token是否需要刷新
 */
function shouldRefreshToken(decoded) {
  const exp = decoded.exp * 1000
  const now = Date.now()
  return exp - now < TOKEN_CONFIG.refreshThreshold * 1000
}

/**
 * 认证中间件
 */
export function authMiddleware(req, res, next) {
  const auth = req.headers.authorization
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null
  
  if (!token) return err(res, 401, '未登录')
  
  const result = verifyToken(token)
  
  if (!result.valid) {
    return err(res, 401, result.error || '登录已过期')
  }
  
  req.user = result.decoded
  
  // 检查是否需要刷新Token
  if (shouldRefreshToken(result.decoded) && result.decoded.type === 'access') {
    const newToken = signToken({
      id: result.decoded.id,
      username: result.decoded.username,
      role: result.decoded.role,
      workerId: result.decoded.workerId
    })
    res.setHeader('X-Token-Refresh', newToken)
  }
  
  next()
}

/**
 * 可选工人认证
 */
export function optionalWorkerAuth(req, res, next) {
  const auth = req.headers.authorization
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null
  
  if (token) {
    const result = verifyToken(token)
    if (result.valid) {
      req.user = result.decoded
    }
  }
  
  next()
}

/** 仅工人端接口使用：无 workerId 则 401 */
export function requireWorker(req, res, next) {
  if (!req.user?.workerId) return err(res, 401, '请使用工人端登录')
  next()
}

/**
 * 刷新Token
 */
export function refreshToken(refreshToken) {
  const result = verifyToken(refreshToken)
  
  if (!result.valid) {
    return { ok: false, error: result.error }
  }
  
  if (result.decoded.type !== 'refresh') {
    return { ok: false, error: '无效的刷新令牌' }
  }
  
  // 验证刷新令牌是否匹配
  const key = `refresh:${result.decoded.id || result.decoded.workerId}`
  const storedToken = cache.get(key)
  
  if (storedToken !== refreshToken) {
    return { ok: false, error: '刷新令牌已失效' }
  }
  
  // 生成新的Token对
  const payload = {
    id: result.decoded.id,
    username: result.decoded.username,
    role: result.decoded.role,
    workerId: result.decoded.workerId
  }
  
  const newAccessToken = signToken(payload)
  const newRefreshToken = signRefreshToken(payload)
  
  // 将旧刷新令牌加入黑名单
  cache.set(`blacklist:${refreshToken}`, true, 7 * 24 * 60 * 60)
  
  return {
    ok: true,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  }
}

/**
 * 注销Token
 */
export function revokeToken(token) {
  try {
    const decoded = jwt.verify(token, SECRET)
    const ttl = decoded.exp - Math.floor(Date.now() / 1000)
    
    if (ttl > 0) {
      cache.set(`blacklist:${token}`, true, ttl)
    }
    
    // 同时清除刷新令牌
    if (decoded.id || decoded.workerId) {
      cache.del(`refresh:${decoded.id || decoded.workerId}`)
    }
    
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error.message }
  }
}

/**
 * 角色权限检查中间件
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return err(res, 401, '未登录')
    }
    
    if (!roles.includes(req.user.role)) {
      return err(res, 403, '权限不足')
    }
    
    next()
  }
}
