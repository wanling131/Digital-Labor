/**
 * 现场接口（非开发可读：离场登记、在岗人数按组织汇总看板）
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

router.get('/board', (req, res) => {
  const rows = db.prepare(`
    SELECT p.org_id, o.name as org_name, COUNT(*) as count
    FROM person p
    LEFT JOIN org o ON p.org_id = o.id
    WHERE p.on_site = 1
    GROUP BY p.org_id
  `).all()
  const total = rows.reduce((s, r) => s + r.count, 0)
  res.json({ projects: rows, total })
})

export default router
