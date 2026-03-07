/**
 * 监控接口路由
 * 提供性能指标、健康检查、系统状态等接口
 */

import { Router } from 'express'
import { 
  getPerformanceStats, 
  getSlowestEndpoints, 
  healthCheck 
} from '../lib/performance.js'
import { db } from '../db/index.js'

const router = Router()

/**
 * 健康检查接口
 * 公开接口，用于负载均衡检测
 */
router.get('/health', (req, res) => {
  const health = healthCheck()
  const statusCode = health.status === 'healthy' ? 200 : 503
  res.status(statusCode).json(health)
})

/**
 * 性能统计接口
 * 需要管理员权限
 */
router.get('/performance', (req, res) => {
  // 简单的权限检查（生产环境应使用更严格的认证）
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: '需要管理员权限' })
  }

  try {
    const stats = getPerformanceStats()
    res.json({
      ok: true,
      data: stats
    })
  } catch (error) {
    console.error('获取性能统计失败:', error)
    res.status(500).json({ message: '获取性能统计失败' })
  }
})

/**
 * 慢接口排行榜
 * 需要管理员权限
 */
router.get('/slow-endpoints', (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: '需要管理员权限' })
  }

  try {
    const limit = parseInt(req.query.limit) || 10
    const endpoints = getSlowestEndpoints(limit)
    res.json({
      ok: true,
      data: endpoints
    })
  } catch (error) {
    console.error('获取慢接口排行失败:', error)
    res.status(500).json({ message: '获取慢接口排行失败' })
  }
})

/**
 * 数据库状态接口
 * 需要管理员权限
 */
router.get('/database', (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: '需要管理员权限' })
  }

  try {
    // 获取数据库文件大小
    const fs = require('fs')
    const path = require('path')
    const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'app.db')
    
    let fileSize = 0
    try {
      const stats = fs.statSync(dbPath)
      fileSize = stats.size
    } catch (e) {
      // 文件可能不存在
    }

    // 获取表统计信息
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all()

    const tableStats = tables.map(t => {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${t.name}`).get()
      return {
        name: t.name,
        rowCount: count.count
      }
    })

    // 获取索引信息
    const indexes = db.prepare(`
      SELECT name, tbl_name FROM sqlite_master 
      WHERE type='index' AND name LIKE 'idx_%'
    `).all()

    res.json({
      ok: true,
      data: {
        fileSize: Math.round(fileSize / 1024) + 'KB',
        tables: tableStats,
        indexCount: indexes.length,
        indexes: indexes.map(i => i.name)
      }
    })
  } catch (error) {
    console.error('获取数据库状态失败:', error)
    res.status(500).json({ message: '获取数据库状态失败' })
  }
})

/**
 * 系统资源接口
 * 需要管理员权限
 */
router.get('/system', (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: '需要管理员权限' })
  }

  try {
    const os = require('os')

    res.json({
      ok: true,
      data: {
        // CPU信息
        cpus: os.cpus().length,
        loadavg: os.loadavg(),
        
        // 内存信息
        totalMemory: Math.round(os.totalmem() / 1024 / 1024) + 'MB',
        freeMemory: Math.round(os.freemem() / 1024 / 1024) + 'MB',
        
        // 系统信息
        platform: os.platform(),
        release: os.release(),
        uptime: Math.round(os.uptime() / 3600) + 'h',
        
        // Node.js信息
        nodeVersion: process.version,
        nodeUptime: Math.round(process.uptime() / 60) + 'min'
      }
    })
  } catch (error) {
    console.error('获取系统资源失败:', error)
    res.status(500).json({ message: '获取系统资源失败' })
  }
})

export default router
