/**
 * 后端应用入口（供启动与测试使用）
 * 职责：初始化数据库、挂载中间件与路由、不监听端口
 */
import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import { db, initDb } from './db/index.js'

// 加载环境变量
config()
import { runSeed } from './scripts/seed.js'
import { authMiddleware } from './middleware/auth.js'
import { logMiddleware } from './middleware/log.js'
import { errorHandler } from './middleware/errorHandler.js'
import { performanceMiddleware } from './lib/performance.js'
import auth from './routes/auth.js'
import person from './routes/person.js'
import contract from './routes/contract.js'
import attendance from './routes/attendance.js'
import settlement from './routes/settlement.js'
import site from './routes/site.js'
import data from './routes/data.js'
import sys from './routes/sys.js'
import notify from './routes/notify.js'
import worker from './routes/worker.js'
import monitor from './routes/monitor.js'

initDb()
// 数据库为空时自动导入虚拟数据（后续若要取消可删除此段）
try {
  if (db.prepare('SELECT COUNT(*) as n FROM org').get().n === 0) {
    runSeed(false)
    console.log('已自动导入虚拟数据（首次启动）')
  }
} catch (e) {
  console.error('自动导入虚拟数据失败:', e.message)
}

const app = express()
app.use(cors())
app.use(express.json())

// 性能监控中间件（在所有路由之前）
app.use(performanceMiddleware)

app.get('/api/health', (_, res) => res.json({ ok: true }))
app.get('/api', (_, res) => res.json({ name: 'Digital Labor', api: 'v1', docs: '接口说明见 server/docs/API.md' }))
app.use('/api/auth', auth)

// 认证中间件（应用到所有需要认证的路由）
app.use('/api', (req, res, next) => {
  // 跳过认证路径
  if (req.path.startsWith('/auth')) return next()
  authMiddleware(req, res, next)
}, logMiddleware)

app.use('/api/person', person)
app.use('/api/contract', contract)
app.use('/api/attendance', attendance)
app.use('/api/settlement', settlement)
app.use('/api/site', site)
app.use('/api/data', data)
app.use('/api/sys', sys)
app.use('/api/notify', notify)
app.use('/api/worker', worker)
app.use('/api/monitor', monitor)

// 全局错误处理（捕获路由中未 catch 的异常）
app.use(errorHandler)

export default app
