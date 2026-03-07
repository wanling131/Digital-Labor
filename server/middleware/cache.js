/**
 * 缓存中间件
 * 提供API响应缓存功能
 */

import { cache } from '../lib/cache.js'

/**
 * 响应缓存中间件
 * @param {number} ttl 缓存时间（秒）
 * @param {Function} keyGenerator 缓存键生成函数
 */
export function cacheMiddleware(ttl = 300, keyGenerator = null) {
  return async (req, res, next) => {
    // 非GET请求不缓存
    if (req.method !== 'GET') {
      return next()
    }

    // 生成缓存键
    const cacheKey = keyGenerator 
      ? keyGenerator(req)
      : `api:${req.path}:${JSON.stringify(req.query)}`

    try {
      // 尝试从缓存获取
      const cached = cache.get(cacheKey)
      if (cached !== undefined) {
        // 设置缓存命中标记
        res.setHeader('X-Cache', 'HIT')
        return res.json(cached)
      }

      // 缓存未命中，继续处理请求
      res.setHeader('X-Cache', 'MISS')
      
      // 重写res.json方法以缓存响应
      const originalJson = res.json.bind(res)
      res.json = function(data) {
        // 只缓存成功的响应
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cache.set(cacheKey, data, ttl)
        }
        return originalJson(data)
      }

      next()
    } catch (error) {
      console.error('[缓存中间件] 错误:', error)
      next()
    }
  }
}

/**
 * 清除缓存中间件
 * 用于POST/PUT/DELETE操作后清除相关缓存
 * @param {string|Array<string>} patterns 要清除的缓存模式
 */
export function clearCacheMiddleware(patterns) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res)
    
    res.json = function(data) {
      // 只在成功的响应后清除缓存
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const patternList = Array.isArray(patterns) ? patterns : [patterns]
        patternList.forEach(pattern => {
          const count = cache.delPattern(pattern)
          if (count > 0) {
            console.log(`[缓存] 清除匹配 '${pattern}' 的 ${count} 个缓存项`)
          }
        })
      }
      return originalJson(data)
    }

    next()
  }
}

/**
 * 用户相关缓存清除
 */
export function clearUserCache(req, res, next) {
  return clearCacheMiddleware('user:*')(req, res, next)
}

/**
 * 人员相关缓存清除
 */
export function clearPersonCache(req, res, next) {
  return clearCacheMiddleware(['person:*', 'list:person:*'])(req, res, next)
}

/**
 * 合同相关缓存清除
 */
export function clearContractCache(req, res, next) {
  return clearCacheMiddleware(['contract:*', 'list:contract:*'])(req, res, next)
}

/**
 * 考勤相关缓存清除
 */
export function clearAttendanceCache(req, res, next) {
  return clearCacheMiddleware(['attendance:*', 'list:attendance:*'])(req, res, next)
}

/**
 * 结算相关缓存清除
 */
export function clearSettlementCache(req, res, next) {
  return clearCacheMiddleware(['settlement:*', 'list:settlement:*'])(req, res, next)
}

/**
 * 统计相关缓存清除
 */
export function clearStatsCache(req, res, next) {
  return clearCacheMiddleware('stats:*')(req, res, next)
}
