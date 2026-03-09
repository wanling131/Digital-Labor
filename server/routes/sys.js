/**
 * 系统管理接口（非开发可读：组织树、用户、操作日志）
 */
import { Router } from 'express'
import multer from 'multer'
import * as XLSX from 'xlsx'
import { db } from '../db/index.js'
import { getFaceVerifyMode } from '../lib/faceVerify.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

const ALL_PERMISSION_KEYS = [
  'person:view', 'person:add', 'person:edit', 'person:delete', 'person:import', 'person:batch_status',
  'contract:view', 'contract:add', 'contract:edit',
  'settlement:view', 'settlement:generate', 'settlement:confirm',
  'attendance:view', 'attendance:import', 'attendance:log',
  'site:view', 'site:edit',
  'data:view',
  'system:user', 'system:org', 'system:permission', 'system:log'
]

/** 能力开关状态（人脸/活体是否为真实阿里云），可不带 Token 调用 */
router.get('/feature-status', (_, res) => {
  res.json({ faceVerify: getFaceVerifyMode() })
})

router.get('/org', (_, res) => {
  const rows = db.prepare('SELECT id, parent_id, name, type, sort, manager, created_at FROM org ORDER BY sort, id').all()
  const personCountByOrg = {}
  db.prepare('SELECT org_id, COUNT(*) as n FROM person WHERE org_id IS NOT NULL GROUP BY org_id').all().forEach(r => {
    personCountByOrg[r.org_id] = r.n
  })
  function getDescendantIds(id) {
    const ids = [id]
    rows.filter(r => r.parent_id === id).forEach(r => ids.push(...getDescendantIds(r.id)))
    return ids
  }
  function buildOrgTree(rows, parentId = 0) {
    return rows.filter(r => r.parent_id === parentId).map(r => {
      const descendantIds = getDescendantIds(r.id)
      const memberCount = descendantIds.reduce((sum, oid) => sum + (personCountByOrg[oid] || 0), 0)
      return {
        ...r,
        manager: r.manager || '',
        memberCount,
        children: buildOrgTree(rows, r.id),
      }
    })
  }
  const tree = buildOrgTree(rows)
  res.json({ tree })
})

router.post('/org', (req, res) => {
  const { parent_id = 0, name, type = 'company', sort = 0, manager } = req.body || {}
  if (!name) return res.status(400).json({ message: 'name 必填' })
  const r = db.prepare('INSERT INTO org (parent_id, name, type, sort, manager) VALUES (?, ?, ?, ?, ?)').run(parent_id, name, type, sort, manager ?? null)
  res.json({ id: r.lastInsertRowid })
})

router.put('/org/:id', (req, res) => {
  const { id } = req.params
  const { name, type, sort, manager } = req.body || {}
  const updates = []
  const values = []
  if (name !== undefined) { updates.push('name = ?'); values.push(name) }
  if (type !== undefined) { updates.push('type = ?'); values.push(type) }
  if (sort !== undefined) { updates.push('sort = ?'); values.push(sort) }
  if (manager !== undefined) { updates.push('manager = ?'); values.push(manager) }
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

// 全量菜单定义（与前端 /pc 路由一致，用于按角色过滤与权限配置）
const FULL_MENUS = [
  { path: '/pc/dashboard', label: '工作台' },
  { path: '/pc/personnel', label: '人员档案及实名中心', children: [
    { path: '/pc/personnel/archive', label: '人员档案' },
    { path: '/pc/personnel/certification', label: '认证管理' },
    { path: '/pc/personnel/status', label: '状态管理' },
  ]},
  { path: '/pc/contract', label: '电子合同及签约中心', children: [
    { path: '/pc/contract/template', label: '合同模板' },
    { path: '/pc/contract/initiate', label: '合同发起' },
    { path: '/pc/contract/status', label: '签约状态' },
    { path: '/pc/contract/archive', label: '合同归档' },
  ]},
  { path: '/pc/attendance', label: '考勤与工时管理', children: [
    { path: '/pc/attendance/import', label: '考勤数据接入' },
    { path: '/pc/attendance/report', label: '工时报表' },
  ]},
  { path: '/pc/settlement', label: '智能结算中心', children: [
    { path: '/pc/settlement/generate', label: '结算单生成与确认' },
    { path: '/pc/settlement/analysis', label: '薪资报表与成本分析' },
  ]},
  { path: '/pc/site', label: '项目现场管理', children: [
    { path: '/pc/site/departure', label: '离场登记' },
    { path: '/pc/site/realtime', label: '在岗人员实时看板' },
  ]},
  { path: '/pc/system', label: '系统管理', children: [
    { path: '/pc/system/users', label: '用户管理' },
    { path: '/pc/system/organization', label: '组织管理' },
    { path: '/pc/system/permissions', label: '权限分配' },
    { path: '/pc/system/logs', label: '操作日志' },
  ]},
]

// 从树中收集所有 path（含父节点 path，用于配置页勾选）
function collectPaths(menus, out = []) {
  for (const m of menus) {
    if (m.path && !out.includes(m.path)) out.push(m.path)
    if (m.children) collectPaths(m.children, out)
  }
  return out
}
const ALL_PATHS = collectPaths(FULL_MENUS)

// user 角色默认不可见的 path（无 role_menu 时的回退逻辑）
const USER_HIDDEN_PATHS = ['/pc/system/users', '/pc/system/permissions', '/pc/system/logs']

function filterMenusByAllowedPaths(menus, allowedSet) {
  return menus.map(m => {
    if (m.children) {
      const children = filterMenusByAllowedPaths(m.children, allowedSet)
      if (children.length === 0 && !allowedSet.has(m.path)) return null
      return { ...m, children }
    }
    return allowedSet.has(m.path) ? m : null
  }).filter(Boolean)
}

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

// 初始化 role_menu：若表为空则写入 admin 全量、user 为过滤后
function seedRoleMenuIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as n FROM role_menu').get().n
  if (count > 0) return
  for (const path of ALL_PATHS) {
    db.prepare('INSERT OR IGNORE INTO role_menu (role_code, menu_path) VALUES (?, ?)').run('admin', path)
  }
  const userAllowed = ALL_PATHS.filter(p => !USER_HIDDEN_PATHS.includes(p))
  for (const path of userAllowed) {
    db.prepare('INSERT OR IGNORE INTO role_menu (role_code, menu_path) VALUES (?, ?)').run('user', path)
  }
}

router.get('/my-menu', (req, res) => {
  const userId = req.user?.userId
  if (!userId) return res.status(401).json({ message: '未登录' })
  seedRoleMenuIfEmpty()
  const row = db.prepare('SELECT role FROM user WHERE id = ? AND enabled = 1').get(userId)
  const role = row?.role || 'user'
  const rows = db.prepare('SELECT menu_path FROM role_menu WHERE role_code = ?').all(role)
  const allowedSet = new Set(rows.map(r => r.menu_path))
  const menus = allowedSet.size > 0
    ? filterMenusByAllowedPaths(JSON.parse(JSON.stringify(FULL_MENUS)), allowedSet)
    : filterMenusByRole(JSON.parse(JSON.stringify(FULL_MENUS)), role)
  res.json({ menus })
})

// 全量菜单树（供权限配置页使用）
router.get('/all-menus', (_, res) => {
  seedRoleMenuIfEmpty()
  res.json({ menus: FULL_MENUS })
})

router.get('/role', (_, res) => {
  const roleCounts = {}
  db.prepare('SELECT role, COUNT(*) as n FROM user GROUP BY role').all().forEach(r => {
    roleCounts[r.role] = r.n
  })
  const list = [
    { code: 'admin', name: '管理员', desc: '拥有全部菜单与功能', userCount: roleCounts.admin ?? 0 },
    { code: 'user', name: '业务员', desc: '不含用户管理、权限分配、操作日志', userCount: roleCounts.user ?? 0 },
  ]
  res.json({ list })
})

// 获取某角色的菜单 path 列表
router.get('/role/:code/menus', (req, res) => {
  const { code } = req.params
  seedRoleMenuIfEmpty()
  const rows = db.prepare('SELECT menu_path FROM role_menu WHERE role_code = ?').all(code)
  res.json({ paths: rows.map(r => r.menu_path) })
})

// 保存某角色的菜单配置（body: { paths: string[] }）
router.put('/role/:code/menus', (req, res) => {
  const { code } = req.params
  const { paths } = req.body || {}
  if (!Array.isArray(paths)) return res.status(400).json({ message: 'paths 必须为数组' })
  const validSet = new Set(ALL_PATHS)
  const toInsert = paths.filter(p => validSet.has(p))
  db.prepare('DELETE FROM role_menu WHERE role_code = ?').run(code)
  const insert = db.prepare('INSERT INTO role_menu (role_code, menu_path) VALUES (?, ?)')
  for (const p of toInsert) insert.run(code, p)
  res.json({ ok: true, count: toInsert.length })
})

// 获取某角色的按钮权限列表
router.get('/role/:code/permissions', (req, res) => {
  const { code } = req.params
  if (code === 'admin') {
    return res.json({ keys: ALL_PERMISSION_KEYS })
  }
  const rows = db.prepare('SELECT permission_key FROM role_permission WHERE role_code = ?').all(code)
  res.json({ keys: rows.map(r => r.permission_key) })
})

// 保存某角色的按钮权限配置（body: { keys: string[] }）
router.put('/role/:code/permissions', (req, res) => {
  const { code } = req.params
  const { keys } = req.body || {}
  if (!Array.isArray(keys)) return res.status(400).json({ message: 'keys 必须为数组' })
  const validSet = new Set(ALL_PERMISSION_KEYS)
  const toInsert = keys.filter(k => validSet.has(k))
  db.prepare('DELETE FROM role_permission WHERE role_code = ?').run(code)
  const insert = db.prepare('INSERT INTO role_permission (role_code, permission_key) VALUES (?, ?)')
  for (const k of toInsert) insert.run(code, k)
  res.json({ ok: true, count: toInsert.length })
})

// 获取所有可用的按钮权限key列表（供前端展示分组）
router.get('/all-permissions', (_, res) => {
  const groups = [
    { name: '人员管理', keys: ['person:view', 'person:add', 'person:edit', 'person:delete', 'person:import', 'person:batch_status'] },
    { name: '合同管理', keys: ['contract:view', 'contract:add', 'contract:edit'] },
    { name: '结算管理', keys: ['settlement:view', 'settlement:generate', 'settlement:confirm'] },
    { name: '考勤管理', keys: ['attendance:view', 'attendance:import', 'attendance:log'] },
    { name: '现场管理', keys: ['site:view', 'site:edit'] },
    { name: '数据报表', keys: ['data:view'] },
    { name: '系统管理', keys: ['system:user', 'system:org', 'system:permission', 'system:log'] },
  ]
  res.json({ groups, allKeys: ALL_PERMISSION_KEYS })
})

router.get('/my-permissions', (req, res) => {
  const userId = req.user?.userId
  if (!userId) return res.status(401).json({ message: '未登录' })
  const row = db.prepare('SELECT role, org_id FROM user WHERE id = ? AND enabled = 1').get(userId)
  const role = row?.role || 'user'
  const org_id = row?.org_id || null
  if (role === 'admin') {
    return res.json({ permissions: ALL_PERMISSION_KEYS, org_id, role })
  }
  const permRows = db.prepare('SELECT permission_key FROM role_permission WHERE role_code = ?').all(role)
  const permissions = permRows.map(r => r.permission_key)
  res.json({ permissions, org_id, role })
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
