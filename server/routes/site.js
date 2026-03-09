/**
 * 现场接口（非开发可读：离场登记、在岗人数按组织汇总看板、机具状态、现场录入日志）
 */
import { Router } from 'express'
import { db } from '../db/index.js'

const router = Router()

router.post('/leave', (req, res) => {
  const { person_id } = req.body || {}
  if (!person_id) return res.status(400).json({ message: 'person_id 必填' })
  db.prepare('UPDATE person SET on_site = 0, updated_at = datetime(\'now\') WHERE id = ?').run(person_id)
  res.json({ ok: true })
})

// 应在岗 = 状态为「已进场」的人数；当前在岗 = on_site=1 的人数；缺勤 = 应在岗 - 当前在岗
router.get('/board', (req, res) => {
  const rows = db.prepare(`
    SELECT
      p.org_id,
      o.name as org_name,
      SUM(CASE WHEN p.status = '已进场' THEN 1 ELSE 0 END) as expected,
      SUM(CASE WHEN p.on_site = 1 THEN 1 ELSE 0 END) as count
    FROM person p
    LEFT JOIN org o ON p.org_id = o.id
    WHERE p.status = '已进场' OR p.on_site = 1
    GROUP BY p.org_id
  `).all()
  const total = rows.reduce((s, r) => s + (r.count || 0), 0)
  const total_expected = rows.reduce((s, r) => s + (r.expected || 0), 0)
  res.json({
    projects: rows.map((r) => ({
      org_id: r.org_id,
      org_name: r.org_name,
      expected: r.expected || 0,
      count: r.count || 0,
    })),
    total,
    total_expected,
  })
})

// ---------- 机具状态 ----------
router.get('/equipment', (req, res) => {
  const { org_id, status, page = 1, pageSize = 50 } = req.query
  const where = []
  const params = []
  if (org_id) { where.push('e.org_id = ?'); params.push(org_id) }
  if (status) { where.push('e.status = ?'); params.push(status) }
  const whereStr = where.length ? ' WHERE ' + where.join(' AND ') : ''
  const total = db.prepare('SELECT COUNT(*) as n FROM equipment e' + whereStr).get(...params).n
  const limit = Math.min(100, Math.max(1, parseInt(pageSize) || 50))
  const offset = (Math.max(1, parseInt(page)) - 1) * limit
  const list = db.prepare(`
    SELECT e.*, o.name as org_name FROM equipment e LEFT JOIN org o ON e.org_id = o.id
    ${whereStr}
    ORDER BY e.updated_at DESC, e.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset)
  res.json({ list, total: Number(total) })
})

router.post('/equipment', (req, res) => {
  const { org_id, name, code, status = '正常' } = req.body || {}
  if (!name || !String(name).trim()) return res.status(400).json({ message: 'name 必填' })
  const r = db.prepare(`
    INSERT INTO equipment (org_id, name, code, status) VALUES (?, ?, ?, ?)
  `).run(org_id ?? null, String(name).trim(), code ?? null, status)
  res.json({ id: r.lastInsertRowid })
})

router.put('/equipment/:id', (req, res) => {
  const { id } = req.params
  const { name, code, status } = req.body || {}
  const exists = db.prepare('SELECT id FROM equipment WHERE id = ?').get(id)
  if (!exists) return res.status(404).json({ message: '不存在' })
  const updates = ["updated_at = datetime('now')"]
  const values = []
  if (name !== undefined) { updates.push('name = ?'); values.push(name) }
  if (code !== undefined) { updates.push('code = ?'); values.push(code) }
  if (status !== undefined) { updates.push('status = ?'); values.push(status) }
  if (values.length === 0) return res.status(400).json({ message: '无有效字段' })
  values.push(id)
  db.prepare(`UPDATE equipment SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  res.json({ ok: true })
})

router.delete('/equipment/:id', (req, res) => {
  const { id } = req.params
  const exists = db.prepare('SELECT id FROM equipment WHERE id = ?').get(id)
  if (!exists) return res.status(404).json({ message: '不存在' })
  db.prepare('DELETE FROM equipment WHERE id = ?').run(id)
  res.json({ ok: true })
})

// ---------- 现场录入日志 ----------
router.get('/site-log', (req, res) => {
  const { org_id, log_type, page = 1, pageSize = 50 } = req.query
  const where = []
  const params = []
  if (org_id) { where.push('s.org_id = ?'); params.push(org_id) }
  if (log_type) { where.push('s.log_type = ?'); params.push(log_type) }
  const whereStr = where.length ? ' WHERE ' + where.join(' AND ') : ''
  const total = db.prepare('SELECT COUNT(*) as n FROM site_log s' + whereStr).get(...params).n
  const limit = Math.min(100, Math.max(1, parseInt(pageSize) || 50))
  const offset = (Math.max(1, parseInt(page)) - 1) * limit
  const list = db.prepare(`
    SELECT s.*, o.name as org_name, u.name as user_name
    FROM site_log s
    LEFT JOIN org o ON s.org_id = o.id
    LEFT JOIN user u ON s.user_id = u.id
    ${whereStr}
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset)
  res.json({ list, total: Number(total) })
})

router.post('/site-log', (req, res) => {
  const { org_id, log_type, content } = req.body || {}
  if (!log_type || !String(log_type).trim()) return res.status(400).json({ message: 'log_type 必填' })
  const user_id = req.user?.userId ?? null
  const r = db.prepare(`
    INSERT INTO site_log (org_id, user_id, log_type, content) VALUES (?, ?, ?, ?)
  `).run(org_id ?? null, user_id, String(log_type).trim(), content ?? null)
  res.json({ id: r.lastInsertRowid })
})

export default router
