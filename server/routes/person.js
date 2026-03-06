/**
 * 人员档案与状态接口（非开发可读：工人名单的增删改查、按状态/组织筛选、批量改状态）
 */
import { Router } from 'express'
import { db } from '../db/index.js'
import { PERSON_STATUS_LIST } from '../lib/constants.js'
import { parsePagination } from '../lib/validate.js'

const router = Router()

router.get('/archive', (req, res) => {
  const { status, org_id, on_site, filled } = req.query
  const { limit, offset, page, pageSize } = parsePagination(req.query)
  const where = []
  const params = []
  if (status) { where.push('p.status = ?'); params.push(status) }
  if (org_id) { where.push('p.org_id = ?'); params.push(org_id) }
  if (on_site === '1') { where.push('p.on_site = 1'); }
  if (filled === '1') { where.push("TRIM(COALESCE(p.id_card,'')) != '' AND TRIM(COALESCE(p.mobile,'')) != ''"); }
  if (filled === '0') { where.push("(TRIM(COALESCE(p.id_card,'')) = '' OR TRIM(COALESCE(p.mobile,'')) = '')"); }
  const whereStr = where.length ? ' AND ' + where.join(' AND ') : ''
  const total = db.prepare('SELECT COUNT(*) as n FROM person p WHERE 1=1' + whereStr).get(...params).n
  const list = db.prepare('SELECT p.*, o.name as org_name FROM person p LEFT JOIN org o ON p.org_id = o.id WHERE 1=1' + whereStr + ' ORDER BY p.id DESC LIMIT ? OFFSET ?').all(...params, limit, offset)
  res.json({ list, total, page, pageSize })
})

router.get('/archive/:id', (req, res) => {
  const row = db.prepare('SELECT p.*, o.name as org_name FROM person p LEFT JOIN org o ON p.org_id = o.id WHERE p.id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ message: '不存在' })
  res.json(row)
})

router.post('/archive', (req, res) => {
  const { org_id, work_no, name, id_card, mobile, status = '预注册' } = req.body || {}
  if (!name) return res.status(400).json({ message: '姓名必填' })
  const r = db.prepare(`
    INSERT INTO person (org_id, work_no, name, id_card, mobile, status) VALUES (?, ?, ?, ?, ?, ?)
  `).run(org_id ?? null, work_no ?? null, name, id_card ?? null, mobile ?? null, status)
  res.json({ id: r.lastInsertRowid })
})

router.put('/archive/:id', (req, res) => {
  const { id } = req.params
  const exists = db.prepare('SELECT 1 FROM person WHERE id = ?').get(id)
  if (!exists) return res.status(404).json({ message: '人员不存在' })
  const { org_id, work_no, name, id_card, mobile, status } = req.body || {}
  const updates = ['updated_at = datetime(\'now\')']
  const values = []
  if (org_id !== undefined) { updates.push('org_id = ?'); values.push(org_id) }
  if (work_no !== undefined) { updates.push('work_no = ?'); values.push(work_no) }
  if (name !== undefined) { updates.push('name = ?'); values.push(name) }
  if (id_card !== undefined) { updates.push('id_card = ?'); values.push(id_card) }
  if (mobile !== undefined) { updates.push('mobile = ?'); values.push(mobile) }
  if (status !== undefined) { updates.push('status = ?'); values.push(status) }
  if (values.length === 0) return res.status(400).json({ message: '无有效字段' })
  values.push(id)
  db.prepare(`UPDATE person SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  res.json({ ok: true })
})

router.delete('/archive/:id', (req, res) => {
  const id = req.params.id
  const exists = db.prepare('SELECT 1 FROM person WHERE id = ?').get(id)
  if (!exists) return res.status(404).json({ message: '人员不存在' })
  db.prepare('DELETE FROM person WHERE id = ?').run(id)
  res.json({ ok: true })
})

router.get('/status', (_, res) => {
  const list = db.prepare('SELECT status, COUNT(*) as count FROM person GROUP BY status').all()
  const map = {}
  PERSON_STATUS_LIST.forEach(s => { map[s] = 0 })
  list.forEach(r => { map[r.status] = r.count })
  res.json({ list: PERSON_STATUS_LIST.map(s => ({ status: s, count: map[s] ?? 0 })) })
})

router.post('/status/batch', (req, res) => {
  const { ids, status } = req.body || {}
  if (!Array.isArray(ids) || ids.length === 0 || !status) return res.status(400).json({ message: 'ids 数组和 status 必填' })
  const placeholders = ids.map(() => '?').join(',')
  db.prepare(`UPDATE person SET status = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`).run(status, ...ids)
  const onSite = status === '已进场' ? 1 : status === '已离场' ? 0 : null
  if (onSite !== null) db.prepare(`UPDATE person SET on_site = ? WHERE id IN (${placeholders})`).run(onSite, ...ids)
  res.json({ ok: true })
})

router.get('/auth', (_, res) => res.json({ list: [] }))
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM person WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ message: '不存在' })
  res.json(row)
})

export default router
