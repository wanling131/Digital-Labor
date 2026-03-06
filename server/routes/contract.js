/**
 * 合同相关接口（非开发可读：模板、发起签约、查看进度、归档、工人端待签与签署）
 */
import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { db } from '../db/index.js'
import { err } from '../lib/response.js'
import { requireNonEmptyString, requirePositiveIntArray } from '../lib/validate.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const router = Router()
const uploadDir = path.join(__dirname, '..', 'uploads', 'templates')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, uploadDir),
    filename: (_, file, cb) => cb(null, Date.now() + '_' + (file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')),
  }),
})

router.get('/template', (_, res) => {
  const list = db.prepare('SELECT id, name, file_path, version, created_at FROM contract_template ORDER BY id DESC').all()
  res.json({ list })
})

router.post('/template', (req, res) => {
  const { name, file_path } = req.body || {}
  if (!name) return res.status(400).json({ message: 'name 必填' })
  const r = db.prepare('INSERT INTO contract_template (name, file_path) VALUES (?, ?)').run(name, file_path || null)
  res.json({ id: r.lastInsertRowid })
})

router.post('/template/upload', upload.single('file'), (req, res) => {
  const name = (req.body && req.body.name && String(req.body.name).trim()) || req.file?.originalname || '未命名模板'
  const file_path = req.file ? path.relative(path.join(__dirname, '..'), req.file.path) : null
  const r = db.prepare('INSERT INTO contract_template (name, file_path) VALUES (?, ?)').run(name, file_path)
  res.json({ id: r.lastInsertRowid })
})

router.get('/status', (req, res) => {
  const { page = 1, pageSize = 20, status } = req.query
  const where = status ? ' WHERE ci.status = ?' : ''
  const params = status ? [status] : []
  const total = db.prepare('SELECT COUNT(*) as n FROM contract_instance ci' + where).get(...params).n
  const limit = Math.min(100, Math.max(1, parseInt(pageSize) || 20))
  const offset = (Math.max(1, parseInt(page)) - 1) * limit
  const list = db.prepare(`
    SELECT ci.*, p.name as person_name, p.work_no
    FROM contract_instance ci
    JOIN person p ON ci.person_id = p.id
    ${where}
    ORDER BY ci.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset)
  res.json({ list, total })
})

router.post('/launch', (req, res) => {
  const { template_id, title, person_ids, deadline } = req.body || {}
  const t = requireNonEmptyString(title, 'title')
  if (!t.ok) return err(res, 400, t.message)
  const p = requirePositiveIntArray(person_ids, 'person_ids')
  if (!p.ok) return err(res, 400, p.message)
  const insert = db.prepare('INSERT INTO contract_instance (template_id, title, person_id, status, deadline) VALUES (?, ?, ?, \'待签署\', ?)')
  const notifInsert = db.prepare('INSERT INTO notification (person_id, type, title, body) VALUES (?, ?, ?, ?)')
  for (const pid of p.value) {
    insert.run(template_id ?? null, title, pid, deadline || null)
    notifInsert.run(pid, '合同待签', title, deadline ? `截止：${deadline}` : null)
  }
  res.json({ ok: true, count: p.value.length })
})

router.get('/archive', (req, res) => {
  const { page = 1, pageSize = 20, person_id, org_id, title, date_from, date_to } = req.query
  const where = ["ci.status = '已签署'"]
  const params = []
  if (person_id) { where.push('ci.person_id = ?'); params.push(person_id) }
  if (org_id) { where.push('p.org_id = ?'); params.push(org_id) }
  if (title) { where.push('ci.title LIKE ?'); params.push('%' + title + '%') }
  if (date_from) { where.push('date(ci.signed_at) >= ?'); params.push(date_from) }
  if (date_to) { where.push('date(ci.signed_at) <= ?'); params.push(date_to) }
  const whereStr = ' WHERE ' + where.join(' AND ')
  const total = db.prepare('SELECT COUNT(*) as n FROM contract_instance ci JOIN person p ON ci.person_id = p.id' + whereStr).get(...params).n
  const limit = Math.min(100, Math.max(1, parseInt(pageSize) || 20))
  const offset = (Math.max(1, parseInt(page)) - 1) * limit
  const list = db.prepare(`
    SELECT ci.*, p.name as person_name, p.work_no, p.org_id as person_org_id
    FROM contract_instance ci
    JOIN person p ON ci.person_id = p.id
    ${whereStr}
    ORDER BY ci.signed_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset)
  res.json({ list, total })
})

router.get('/my-pending', (req, res) => {
  const person_id = req.query.person_id || req.user?.workerId
  if (!person_id) return res.status(400).json({ message: 'person_id 必填或请登录' })
  const list = db.prepare(`
    SELECT ci.* FROM contract_instance ci
    WHERE ci.person_id = ? AND ci.status = '待签署'
    ORDER BY ci.id DESC
  `).all(person_id)
  res.json({ list })
})

router.get('/my-signed', (req, res) => {
  const person_id = req.query.person_id || req.user?.workerId
  if (!person_id) return res.status(400).json({ message: 'person_id 必填或请登录' })
  const list = db.prepare(`
    SELECT ci.id, ci.title, ci.signed_at, ci.status
    FROM contract_instance ci
    WHERE ci.person_id = ? AND ci.status = '已签署'
    ORDER BY ci.signed_at DESC
  `).all(person_id)
  res.json({ list })
})

router.post('/sign/:id', (req, res) => {
  const { id } = req.params
  const person_id = req.body?.person_id ?? req.user?.workerId
  const row = db.prepare('SELECT * FROM contract_instance WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ message: '合同不存在' })
  if (row.status !== '待签署') return res.status(400).json({ message: '合同已签署或已作废' })
  const pid = person_id != null ? parseInt(person_id, 10) : null
  if (pid != null && row.person_id !== pid) return res.status(403).json({ message: '无权签署' })
  db.prepare("UPDATE contract_instance SET status = '已签署', signed_at = datetime('now') WHERE id = ?").run(id)
  db.prepare('UPDATE person SET contract_signed = 1 WHERE id = ?').run(row.person_id)
  res.json({ ok: true })
})

router.put('/:id/invalidate', (req, res) => {
  const { id } = req.params
  const row = db.prepare('SELECT * FROM contract_instance WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ message: '合同不存在' })
  if (row.status !== '已签署') return res.status(400).json({ message: '仅已签署合同可作废' })
  db.prepare("UPDATE contract_instance SET status = '已作废' WHERE id = ?").run(id)
  res.json({ ok: true })
})

router.get('/:id/pdf', (req, res) => {
  const row = db.prepare('SELECT pdf_path FROM contract_instance WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ message: '合同不存在' })
  if (!row.pdf_path) return res.status(404).json({ message: '暂无 PDF 文件', noFile: true })
  const full = path.resolve(__dirname, '..', row.pdf_path)
  if (!fs.existsSync(full)) return res.status(404).json({ message: '文件不存在', noFile: true })
  res.sendFile(full)
})
router.get('/:id', (req, res) => {
  const row = db.prepare(`
    SELECT ci.*, p.name as person_name, p.work_no
    FROM contract_instance ci JOIN person p ON ci.person_id = p.id
    WHERE ci.id = ?
  `).get(req.params.id)
  if (!row) return res.status(404).json({ message: '不存在' })
  res.json(row)
})

export default router
