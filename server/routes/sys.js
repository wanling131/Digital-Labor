/**
 * 系统管理接口（非开发可读：组织树、用户、操作日志）
 */
import { Router } from 'express'
import multer from 'multer'
import * as XLSX from 'xlsx'
import { db } from '../db/index.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

function buildOrgTree(rows, parentId = 0) {
  return rows.filter(r => r.parent_id === parentId).map(r => ({
    ...r,
    children: buildOrgTree(rows, r.id),
  }))
}

router.get('/org', (_, res) => {
  const rows = db.prepare('SELECT id, parent_id, name, type, sort, created_at FROM org ORDER BY sort, id').all()
  const tree = buildOrgTree(rows)
  res.json({ tree })
})

router.post('/org', (req, res) => {
  const { parent_id = 0, name, type = 'company', sort = 0 } = req.body || {}
  if (!name) return res.status(400).json({ message: 'name 必填' })
  const r = db.prepare('INSERT INTO org (parent_id, name, type, sort) VALUES (?, ?, ?, ?)').run(parent_id, name, type, sort)
  res.json({ id: r.lastInsertRowid })
})

router.put('/org/:id', (req, res) => {
  const { id } = req.params
  const { name, type, sort } = req.body || {}
  const updates = []
  const values = []
  if (name !== undefined) { updates.push('name = ?'); values.push(name) }
  if (type !== undefined) { updates.push('type = ?'); values.push(type) }
  if (sort !== undefined) { updates.push('sort = ?'); values.push(sort) }
  if (updates.length === 0) return res.status(400).json({ message: '无有效字段' })
  values.push(id)
  db.prepare(`UPDATE org SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  res.json({ ok: true })
})

router.delete('/org/:id', (req, res) => {
  const hasChild = db.prepare('SELECT 1 FROM org WHERE parent_id = ?').get(req.params.id)
  if (hasChild) return res.status(400).json({ message: '请先删除子节点' })
  db.prepare('DELETE FROM org WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

router.get('/user', (_, res) => {
  const list = db.prepare(`
    SELECT u.id, u.username, u.name, u.org_id, u.role, u.enabled, u.created_at, o.name as org_name
    FROM user u LEFT JOIN org o ON u.org_id = o.id
    ORDER BY u.id
  `).all()
  res.json({ list })
})

router.post('/user', (req, res) => {
  const { username, password, name, org_id, role = 'admin' } = req.body || {}
  if (!username || !password) return res.status(400).json({ message: '用户名和密码必填' })
  try {
    const r = db.prepare('INSERT INTO user (username, password_hash, name, org_id, role) VALUES (?, ?, ?, ?, ?)').run(username, password, name ?? null, org_id ?? null, role)
    res.json({ id: r.lastInsertRowid })
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ message: '用户名已存在' })
    throw e
  }
})

router.post('/user/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: '请上传 Excel 文件' })
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
    if (!rows.length) return res.json({ ok: true, count: 0, errors: [] })
    const header = rows[0].map(h => String(h || '').trim())
    const usernameIdx = header.findIndex(h => /用户名|username|账号/i.test(h))
    const passwordIdx = header.findIndex(h => /密码|password/i.test(h))
    const nameIdx = header.findIndex(h => /姓名|name/i.test(h))
    const orgIdx = header.findIndex(h => /组织|org|组织ID/i.test(h))
    const roleIdx = header.findIndex(h => /角色|role/i.test(h))
    if (usernameIdx < 0 || passwordIdx < 0) return res.status(400).json({ message: 'Excel 需包含「用户名」列和「密码」列' })
    const insert = db.prepare('INSERT INTO user (username, password_hash, name, org_id, role) VALUES (?, ?, ?, ?, ?)')
    let count = 0
    const errors = []
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const username = row[usernameIdx] != null ? String(row[usernameIdx]).trim() : ''
      const password = row[passwordIdx] != null ? String(row[passwordIdx]).trim() : ''
      if (!username || !password) { errors.push(`第 ${i + 1} 行：用户名或密码为空`); continue }
      const name = nameIdx >= 0 && row[nameIdx] != null ? String(row[nameIdx]).trim() : null
      let org_id = orgIdx >= 0 && row[orgIdx] != null ? parseInt(row[orgIdx], 10) : null
      if (Number.isNaN(org_id)) org_id = null
      const role = roleIdx >= 0 && row[roleIdx] != null ? String(row[roleIdx]).trim() : 'admin'
      const roleVal = /admin|管理员/i.test(role) ? 'admin' : 'user'
      try {
        insert.run(username, password, name, org_id, roleVal)
        count++
      } catch (e) {
        if (e.message.includes('UNIQUE')) errors.push(`第 ${i + 1} 行：用户名 ${username} 已存在`)
        else errors.push(`第 ${i + 1} 行：${e.message}`)
      }
    }
    res.json({ ok: true, count, errors })
  } catch (e) {
    res.status(500).json({ message: e.message || '解析失败' })
  }
})

router.put('/user/:id', (req, res) => {
  const { id } = req.params
  const { name, org_id, role, enabled, password } = req.body || {}
  const updates = []
  const values = []
  if (name !== undefined) { updates.push('name = ?'); values.push(name) }
  if (org_id !== undefined) { updates.push('org_id = ?'); values.push(org_id) }
  if (role !== undefined) { updates.push('role = ?'); values.push(role) }
  if (enabled !== undefined) { updates.push('enabled = ?'); values.push(enabled ? 1 : 0) }
  if (password !== undefined && password) { updates.push('password_hash = ?'); values.push(password) }
  if (updates.length === 0) return res.status(400).json({ message: '无有效字段' })
  values.push(id)
  db.prepare(`UPDATE user SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  res.json({ ok: true })
})

// 全量菜单定义（与前端 AdminLayout 一致，用于按角色过滤）
const FULL_MENUS = [
  { path: '/admin', label: '工作台' },
  { path: '/admin/person', label: '人员档案及实名中心', children: [
    { path: '/admin/person/archive', label: '人员档案' },
    { path: '/admin/person/auth', label: '认证管理' },
    { path: '/admin/person/status', label: '状态管理' },
  ]},
  { path: '/admin/contract', label: '电子合同及签约中心', children: [
    { path: '/admin/contract/template', label: '合同模板' },
    { path: '/admin/contract/launch', label: '合同发起' },
    { path: '/admin/contract/status', label: '签约状态' },
    { path: '/admin/contract/archive', label: '合同归档' },
  ]},
  { path: '/admin/attendance', label: '考勤与工时管理', children: [
    { path: '/admin/attendance/import', label: '考勤数据接入' },
    { path: '/admin/attendance/report', label: '工时报表' },
  ]},
  { path: '/admin/settlement', label: '智能结算中心', children: [
    { path: '/admin/settlement/confirm', label: '结算单确认' },
    { path: '/admin/settlement/salary', label: '薪资报表' },
  ]},
  { path: '/admin/site', label: '项目现场管理', children: [
    { path: '/admin/site/leave', label: '离场登记' },
    { path: '/admin/site/board', label: '在岗看板' },
  ]},
  { path: '/admin/data/board', label: '综合数据看板' },
  { path: '/admin/sys', label: '系统管理', children: [
    { path: '/admin/sys/user', label: '用户管理' },
    { path: '/admin/sys/org', label: '组织管理' },
    { path: '/admin/sys/role', label: '权限分配' },
    { path: '/admin/sys/log', label: '操作日志' },
  ]},
]

// user 角色不可见的菜单 path（仅系统管理下部分）
const USER_HIDDEN_PATHS = ['/admin/sys/user', '/admin/sys/role', '/admin/sys/log']

function filterMenusByRole(menus, role) {
  if (role === 'admin') return menus
  return menus.map(m => {
    if (m.children) {
      const children = m.children.filter(c => !USER_HIDDEN_PATHS.includes(c.path))
      if (children.length === 0) return null
      return { ...m, children }
    }
    return USER_HIDDEN_PATHS.includes(m.path) ? null : m
  }).filter(Boolean)
}

router.get('/my-menu', (req, res) => {
  const userId = req.user?.userId
  if (!userId) return res.status(401).json({ message: '未登录' })
  const row = db.prepare('SELECT role FROM user WHERE id = ? AND enabled = 1').get(userId)
  const role = row?.role || 'user'
  const menus = filterMenusByRole(FULL_MENUS, role)
  res.json({ menus })
})

router.get('/role', (_, res) => {
  const list = [
    { code: 'admin', name: '管理员', desc: '拥有全部菜单与功能' },
    { code: 'user', name: '业务员', desc: '不含用户管理、权限分配、操作日志' },
  ]
  res.json({ list })
})

router.get('/log', (req, res) => {
  const { page = 1, pageSize = 50 } = req.query
  const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(100, Math.max(1, parseInt(pageSize)))
  const limit = Math.min(100, Math.max(1, parseInt(pageSize)))
  const list = db.prepare('SELECT * FROM op_log ORDER BY id DESC LIMIT ? OFFSET ?').all(limit, offset)
  const total = db.prepare('SELECT COUNT(*) as n FROM op_log').get().n
  res.json({ list, total })
})

export default router
