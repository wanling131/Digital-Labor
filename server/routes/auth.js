/**
 * 登录接口（非开发可读：管理端账号密码登录、工人端工号+姓名登录，返回 token）
 */
import { Router } from 'express'
import { db } from '../db/index.js'
import { signToken } from '../middleware/auth.js'
import { err } from '../lib/response.js'

const router = Router()

// 管理端：用户名 + 密码
router.post('/login', (req, res) => {
  const { username, password } = req.body || {}
  const u = (username != null && typeof username === 'string') ? username.trim() : ''
  const p = (password != null && typeof password === 'string') ? password : ''
  if (!u || !p) return err(res, 400, '用户名和密码必填')
  const row = db.prepare('SELECT id, username, name, role FROM user WHERE username = ? AND password_hash = ? AND enabled = 1').get(u, p)
  if (!row) return err(res, 401, '用户名或密码错误')
  const token = signToken({ userId: row.id, username: row.username })
  res.json({ token, user: { id: row.id, username: row.username, name: row.name, role: row.role } })
})

// 工人端简易登录：工号+姓名 或 person_id（mock，生产接微信等）
router.post('/worker-login', (req, res) => {
  const { person_id, work_no, name } = req.body || {}
  let personId = person_id ? parseInt(person_id, 10) : null
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
