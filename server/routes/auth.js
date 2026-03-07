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

export default router
