/**
 * 工人端个人：当前档案、修改手机号等（需工人 token）
 */
import { Router } from 'express'
import { db } from '../db/index.js'
import { requireWorker } from '../middleware/auth.js'
import { decrypt, maskSensitiveData } from '../lib/crypto.js'

function safeDecryptThenMask(value, type) {
  if (!value) return value
  try {
    return maskSensitiveData(decrypt(value), type)
  } catch {
    return maskSensitiveData(String(value), type)
  }
}

const router = Router()
router.use(requireWorker)

router.get('/me', (req, res) => {
  const person_id = req.user.workerId
  const row = db.prepare('SELECT p.*, o.name as org_name FROM person p LEFT JOIN org o ON p.org_id = o.id WHERE p.id = ?').get(person_id)
  if (!row) return res.status(404).json({ message: '人员不存在' })
  const out = { ...row }
  if (row.id_card) out.id_card = safeDecryptThenMask(row.id_card, 'idCard')
  if (row.mobile) out.mobile = safeDecryptThenMask(row.mobile, 'mobile')
  if (row.bank_card) out.bank_card = safeDecryptThenMask(row.bank_card, 'bankCard')
  res.json(out)
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

router.get('/certificates', (req, res) => {
  const person_id = req.user.workerId
  const list = db.prepare(
    'SELECT id, name, certificate_no, issue_date, expiry_date, status FROM person_certificate WHERE person_id = ? ORDER BY expiry_date DESC'
  ).all(person_id)
  res.json({ list })
})

export default router
