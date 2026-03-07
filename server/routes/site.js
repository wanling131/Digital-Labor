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

export default router
