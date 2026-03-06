/**
 * 站内通知（工人端：按 person_id 查列表、标已读）
 */
import { Router } from 'express'
import { db } from '../db/index.js'
import { requireWorker } from '../middleware/auth.js'

const router = Router()
router.use(requireWorker)

router.get('/list', (req, res) => {
  const person_id = req.user.workerId
  const { page = 1, pageSize = 20 } = req.query
  const limit = Math.min(100, Math.max(1, parseInt(pageSize) || 20))
  const offset = (Math.max(1, parseInt(page)) - 1) * limit
  const total = db.prepare('SELECT COUNT(*) as n FROM notification WHERE person_id = ?').get(person_id).n
  const list = db.prepare(`
    SELECT id, type, title, body, read_at, created_at
    FROM notification WHERE person_id = ?
    ORDER BY id DESC LIMIT ? OFFSET ?
  `).all(person_id, limit, offset)
  res.json({ list, total })
})

router.put('/:id/read', (req, res) => {
  const { id } = req.params
  const person_id = req.user.workerId
  const row = db.prepare('SELECT id FROM notification WHERE id = ? AND person_id = ?').get(id, person_id)
  if (!row) return res.status(404).json({ message: '不存在' })
  db.prepare("UPDATE notification SET read_at = datetime('now') WHERE id = ?").run(id)
  res.json({ ok: true })
})

export default router
