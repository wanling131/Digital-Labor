/**
 * 工人端个人：当前档案、修改手机号等（需工人 token）
 */
import { Router } from 'express'
import { db } from '../db/index.js'
import { requireWorker } from '../middleware/auth.js'

const router = Router()
router.use(requireWorker)

router.get('/me', (req, res) => {
  const person_id = req.user.workerId
  const row = db.prepare('SELECT p.*, o.name as org_name FROM person p LEFT JOIN org o ON p.org_id = o.id WHERE p.id = ?').get(person_id)
  if (!row) return res.status(404).json({ message: '人员不存在' })
  res.json(row)
})

router.put('/me', (req, res) => {
  const person_id = req.user.workerId
  const { mobile, id_card } = req.body || {}
  const updates = ['updated_at = datetime(\'now\')']
  const values = []
  if (mobile !== undefined) { updates.push('mobile = ?'); values.push(mobile) }
  if (id_card !== undefined) { updates.push('id_card = ?'); values.push(id_card) }
  if (values.length === 0) return res.status(400).json({ message: '无有效字段' })
  values.push(person_id)
  db.prepare(`UPDATE person SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  res.json({ ok: true })
})

export default router
