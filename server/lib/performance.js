/**
 * 性能监控中间件
 * 提供请求耗时统计、慢查询检测、内存监控等功能
 */

import { db } from '../db/index.js'

// 性能指标存储（简单内存存储，生产环境可接入Redis或时序数据库）
const metrics = {
  requests: [],
  slowQueries: [],
  errors: []
}

// 配置
const SLOW_QUERY_THRESHOLD = 500 // 慢查询阈值（毫秒）
const MAX_METRICS_SIZE = 1000 // 最大存储指标数量

/**
 * 请求性能监控中间件
 */
export function performanceMiddleware(req, res, next) {
  const startTime = Date.now()
  const startMemory = process.memoryUsage()

  // 记录响应结束
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const endMemory = process.memoryUsage()
    const memoryDelta = {
      rss: endMemory.rss - startMemory.rss,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed
    }

    const metric = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      memoryDelta,
      query: req.query,
      userAgent: req.get('user-agent'),
      ip: req.ip
    }

    // 存储指标
    metrics.requests.push(metric)
    if (metrics.requests.length > MAX_METRICS_SIZE) {
      metrics.requests.shift()
    }

    // 慢请求警告
    if (duration > SLOW_QUERY_THRESHOLD) {
      console.warn(`[慢请求] ${req.method} ${req.path} 耗时 ${duration}ms`)
      metrics.slowQueries.push({
        ...metric,
        threshold: SLOW_QUERY_THRESHOLD
      })
      if (metrics.slowQueries.length > 100) {
        metrics.slowQueries.shift()
      }
    }

    // 错误记录
    if (res.statusCode >= 400) {
      metrics.errors.push(metric)
      if (metrics.errors.length > 100) {
        metrics.errors.shift()
      }
    }
  })

  next()
}

/**
 * 数据库查询性能监控包装器
 */
export function monitorQuery(queryFn) {
  return async function(...args) {
    const startTime = Date.now()
    try {
      const result = await queryFn(...args)
      const duration = Date.now() - startTime

      if (duration > SLOW_QUERY_THRESHOLD) {
        console.warn(`[慢查询] 耗时 ${duration}ms`)
      }

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[查询错误] 耗时 ${duration}ms, 错误: ${error.message}`)
      throw error
    }
  }
}

/**
 * 获取性能统计信息
 */
export function getPerformanceStats() {
  const now = Date.now()
  const oneHourAgo = now - 60 * 60 * 1000

  const recentRequests = metrics.requests.filter(m => 
    new Date(m.timestamp).getTime() > oneHourAgo
  )

  const stats = {
    // 请求统计
    totalRequests: metrics.requests.length,
    recentRequests: recentRequests.length,
    averageResponseTime: recentRequests.length > 0 
      ? recentRequests.reduce((sum, m) => sum + m.duration, 0) / recentRequests.length 
      : 0,
    
    // 状态码分布
    statusCodes: recentRequests.reduce((acc, m) => {
      acc[m.statusCode] = (acc[m.statusCode] || 0) + 1
      return acc
    }, {}),

    // 慢查询统计
    slowQueriesCount: metrics.slowQueries.length,
    recentSlowQueries: metrics.slowQueries.slice(-10),

    // 错误统计
    errorCount: metrics.errors.length,
    recentErrors: metrics.errors.slice(-10),

    // 内存使用
    memory: process.memoryUsage(),

    // 系统信息
    uptime: process.uptime(),
    nodeVersion: process.version,
    platform: process.platform
  }

  return stats
}

/**
 * 获取API性能排行榜（最慢的接口）
 */
export function getSlowestEndpoints(limit = 10) {
  const endpointStats = {}

  metrics.requests.forEach(m => {
    const key = `${m.method} ${m.path}`
    if (!endpointStats[key]) {
      endpointStats[key] = { count: 0, totalTime: 0, maxTime: 0 }
    }
    endpointStats[key].count++
    endpointStats[key].totalTime += m.duration
    endpointStats[key].maxTime = Math.max(endpointStats[key].maxTime, m.duration)
  })

  return Object.entries(endpointStats)
    .map(([endpoint, stats]) => ({
      endpoint,
      count: stats.count,
      averageTime: Math.round(stats.totalTime / stats.count),
      maxTime: stats.maxTime
    }))
    .sort((a, b) => b.averageTime - a.averageTime)
    .slice(0, limit)
}

/**
 * 清理旧指标数据
 */
export function cleanupOldMetrics(maxAge = 24 * 60 * 60 * 1000) {
  const cutoff = Date.now() - maxAge
  
  metrics.requests = metrics.requests.filter(m => 
    new Date(m.timestamp).getTime() > cutoff
  )
  metrics.slowQueries = metrics.slowQueries.filter(m => 
    new Date(m.timestamp).getTime() > cutoff
  )
  metrics.errors = metrics.errors.filter(m => 
    new Date(m.timestamp).getTime() > cutoff
  )

  console.log(`[性能监控] 清理完成，剩余请求记录: ${metrics.requests.length}`)
}

/**
 * 健康检查
 */
export function healthCheck() {
  const memory = process.memoryUsage()
  const maxMemory = 1024 * 1024 * 1024 // 1GB

  return {
    status: memory.heapUsed < maxMemory ? 'healthy' : 'warning',
    memory: {
      used: Math.round(memory.heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(memory.heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(memory.rss / 1024 / 1024) + 'MB'
    },
    uptime: Math.round(process.uptime()) + 's',
    timestamp: new Date().toISOString()
  }
}

// 定时清理任务（每小时执行一次）
setInterval(() => {
  cleanupOldMetrics()
}, 60 * 60 * 1000)

export default {
  performanceMiddleware,
  monitorQuery,
  getPerformanceStats,
  getSlowestEndpoints,
  healthCheck
}
