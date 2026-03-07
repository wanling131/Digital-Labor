/**
 * 限流中间件
 * 提供API请求频率限制功能，防止暴力破解和DDoS攻击
 */

import { cache } from '../lib/cache.js'

// 限流配置（登录允许多次以便自动化测试中每用例独立登录）
const RATE_LIMIT_CONFIG = {
  // 登录接口限制
  login: {
    windowMs: 15 * 60 * 1000, // 15分钟
    maxRequests: 30, // 满足单次测试套件内多次登录
    message: '登录尝试次数过多，请15分钟后重试'
  },
  // 人脸验证接口限制
  faceVerify: {
    windowMs: 60 * 60 * 1000, // 1小时
    maxRequests: 20, // 最多20次
    message: '人脸验证次数过多，请1小时后重试'
  },
  // 通用API限制
  api: {
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 100, // 最多100次
    message: '请求过于频繁，请稍后再试'
  },
  // 严格限制（用于敏感操作）
  strict: {
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 10, // 最多10次
    message: '操作过于频繁，请稍后再试'
  }
}

/**
 * 创建限流中间件
 * @param {string} type 限流类型
 * @param {Function} keyGenerator 自定义键生成函数
 */
export function rateLimit(type = 'api', keyGenerator = null) {
  const config = RATE_LIMIT_CONFIG[type] || RATE_LIMIT_CONFIG.api

  return async (req, res, next) => {
    // 生成限流键
    const key = keyGenerator 
      ? keyGenerator(req)
      : `ratelimit:${type}:${req.ip}:${req.path}`

    try {
      // 获取当前计数
      const now = Date.now()
      const windowStart = now - config.windowMs
      
      // 获取或初始化请求记录
      let requests = cache.get(key) || []
      
      // 清理过期记录
      requests = requests.filter(time => time > windowStart)
      
      // 检查是否超过限制
      if (requests.length >= config.maxRequests) {
        const oldestRequest = requests[0]
        const resetTime = Math.ceil((oldestRequest + config.windowMs - now) / 1000)
        
        res.setHeader('Retry-After', resetTime)
        return res.status(429).json({
          message: config.message,
          retryAfter: resetTime,
          limit: config.maxRequests,
          window: config.windowMs / 1000
        })
      }

      // 记录本次请求
      requests.push(now)
      cache.set(key, requests, Math.ceil(config.windowMs / 1000))

      // 设置限流响应头
      res.setHeader('X-RateLimit-Limit', config.maxRequests)
      res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - requests.length))
      res.setHeader('X-RateLimit-Window', config.windowMs / 1000)

      next()
    } catch (error) {
      console.error('[限流中间件] 错误:', error)
      next()
    }
  }
}

/**
 * 登录限流中间件
 */
export function loginRateLimit(req, res, next) {
  return rateLimit('login', (req) => {
    // 使用用户名+IP组合限流
    const username = req.body?.username || 'unknown'
    return `ratelimit:login:${req.ip}:${username}`
  })(req, res, next)
}

/**
 * 人脸验证限流中间件
 */
export function faceVerifyRateLimit(req, res, next) {
  return rateLimit('faceVerify', (req) => {
    // 使用人员ID+IP组合限流
    const personId = req.body?.person_id || req.user?.workerId || 'unknown'
    return `ratelimit:face:${req.ip}:${personId}`
  })(req, res, next)
}

/**
 * 通用API限流中间件
 */
export function apiRateLimit(req, res, next) {
  return rateLimit('api')(req, res, next)
}

/**
 * 严格限流中间件（用于敏感操作）
 */
export function strictRateLimit(req, res, next) {
  return rateLimit('strict')(req, res, next)
}

/**
 * 获取限流状态
 */
export function getRateLimitStatus(req, type = 'api') {
  const config = RATE_LIMIT_CONFIG[type] || RATE_LIMIT_CONFIG.api
  const key = `ratelimit:${type}:${req.ip}:*`
  
  // 获取所有匹配的限流键
  const keys = cache.getStats().keys.filter(k => k.startsWith(key.replace('*', '')))
  
  let totalRequests = 0
  keys.forEach(k => {
    const requests = cache.get(k) || []
    totalRequests += requests.length
  })

  return {
    limit: config.maxRequests,
    window: config.windowMs / 1000,
    current: totalRequests,
    remaining: Math.max(0, config.maxRequests - totalRequests)
  }
}
