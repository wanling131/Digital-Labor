/**
 * 登录接口（非开发可读：管理端账号密码登录、工人端工号+姓名登录，返回 token）
 */
import { Router } from 'express'
import { db } from '../db/index.js'
import { signToken } from '../middleware/auth.js'
import { err } from '../lib/response.js'
import { loginRateLimit } from '../middleware/rateLimit.js'

const router = Router()

// 管理端：用户名 + 密码（应用登录限流）
router.post('/login', loginRateLimit, (req, res) => {
  const { username, password } = req.body || {}
  const u = (username != null && typeof username === 'string') ? username.trim() : ''
  const p = (password != null && typeof password === 'string') ? password : ''
  if (!u || !p) return err(res, 400, '用户名和密码必填')
  const row = db.prepare('SELECT id, username, name, role FROM user WHERE username = ? AND password_hash = ? AND enabled = 1').get(u, p)
  if (!row) return err(res, 401, '用户名或密码错误')
  const token = signToken({ userId: row.id, username: row.username, role: row.role })
  res.json({ token, user: { id: row.id, username: row.username, name: row.name, role: row.role } })
})

// 工人端简易登录：工号+姓名 / 手机号+密码 / person_id（mock，生产接微信等，应用登录限流）
const WORKER_DEMO_PASSWORD = '123456' // 演示用，人员表无密码字段时用此固定密码
router.post('/worker-login', loginRateLimit, (req, res) => {
  const { person_id, work_no, name, mobile, password } = req.body || {}
  let personId = person_id ? parseInt(person_id, 10) : null

  if (!personId && (mobile != null && String(mobile).trim())) {
    const row = db.prepare('SELECT id FROM person WHERE mobile = ? LIMIT 1').get(String(mobile).trim())
    if (row) {
      if (password != null && String(password).trim() !== '' && String(password).trim() !== WORKER_DEMO_PASSWORD)
        return err(res, 401, '手机号或密码错误')
      personId = row.id
    } else {
      return err(res, 401, '未找到该手机号对应人员')
    }
  }
  if (!personId && (work_no || name)) {
    const row = db.prepare('SELECT id FROM person WHERE work_no = ? OR name = ? LIMIT 1').get(work_no || name, name || work_no)
    if (row) personId = row.id
  }
  if (!personId) return err(res, 401, '未找到对应人员')
  const token = signToken({ workerId: personId })
  const person = db.prepare('SELECT id, work_no, name, mobile FROM person WHERE id = ?').get(personId)
  res.json({ token, person })
})

/**
 * 项目级统一二维码登录/激活
 *
 * 设计说明：
 * - 外部实名制平台或现场二维码仅需要包含一个 opaque 的 scene/token（例如 ?scene=projectA 或包含加密的人员信息）
 * - 本接口不强依赖具体加密算法，而是：
 *   - 将 scene 记录在登录记录表或直接作为响应返回给前端，前端后续在 /h5/activation 中可配合项目维度使用
 *   - 如果 scene 中已经包含 person_id/work_no/name，则可在这里直接解析并签发 worker token
 *
 * 目前实现：
 * - 支持两种简单模式，便于项目验收：
 *   1）scene 中直接传 person_id（如 q=person:123），则立即为该人员签发 token
 *   2）scene 仅为项目级标识（如 q=project:1），则仅回传 project_key，由前端继续走工号/姓名激活流程
 */
router.post('/worker-qrcode-login', loginRateLimit, (req, res) => {
  const { scene } = req.body || {}
  const raw = typeof scene === 'string' ? scene.trim() : ''
  if (!raw) return err(res, 400, 'scene 必填')

  // 简单协议：person:123 / project:abc
  let personId = null
  let projectKey = null

  if (raw.startsWith('person:')) {
    const idStr = raw.slice('person:'.length)
    const n = parseInt(idStr, 10)
    if (!Number.isNaN(n) && n > 0) {
      const exists = db.prepare('SELECT id FROM person WHERE id = ?').get(n)
      if (exists) personId = n
    }
    if (!personId) return err(res, 404, '二维码对应人员不存在')
  } else if (raw.startsWith('project:')) {
    projectKey = raw.slice('project:'.length) || null
  } else {
    // 其它场景统一按项目级 opaque key 处理，前端可存本地用于后续激活时上送
    projectKey = raw
  }

  if (personId) {
    const token = signToken({ workerId: personId })
    const person = db.prepare('SELECT id, work_no, name, mobile FROM person WHERE id = ?').get(personId)
    return res.json({ mode: 'person', token, person })
  }

  // 仅返回项目级 key，用于后续激活绑定项目
  return res.json({ mode: 'project', project_key: projectKey })
})

export default router
