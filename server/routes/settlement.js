/**
 * 结算与薪资接口（非开发可读：按周期生成结算单、确认/驳回、薪资历史、工人端待确认与我的结算）
 */
import { Router } from 'express'
import { db } from '../db/index.js'
import { err } from '../lib/response.js'

const router = Router()

router.get('/my-pending', (req, res) => {
  const person_id = req.query.person_id || req.user?.workerId
  if (!person_id) return res.status(400).json({ message: 'person_id 必填或请登录' })
  const list = db.prepare(`SELECT s.* FROM settlement s WHERE s.person_id = ? AND s.status = '待确认' ORDER BY s.id DESC`).all(person_id)
  res.json({ list })
})

router.get('/my', (req, res) => {
  const person_id = req.query.person_id || req.user?.workerId
  if (!person_id) return res.status(400).json({ message: 'person_id 必填或请登录' })
  const list = db.prepare(`SELECT s.* FROM settlement s WHERE s.person_id = ? ORDER BY s.id DESC LIMIT 100`).all(person_id)
  res.json({ list })
})

router.get('/confirm', (req, res) => {
  const { status, page = 1, pageSize = 20 } = req.query
  const where = []
  const params = []
  if (status) { where.push('s.status = ?'); params.push(status) }
  const whereStr = where.length ? ' WHERE ' + where.join(' AND ') : ''
  const total = db.prepare('SELECT COUNT(*) as n FROM settlement s' + whereStr).get(...params).n
  const limit = Math.min(100, Math.max(1, parseInt(pageSize) || 20))
  const offset = (Math.max(1, parseInt(page)) - 1) * limit
  const list = db.prepare(`
    SELECT s.*, p.name as person_name, p.work_no, p.mobile
    FROM settlement s
    JOIN person p ON s.person_id = p.id
    ${whereStr}
    ORDER BY s.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset)
  res.json({ list, total })
})

router.post('/generate', (req, res) => {
  const { period_start, period_end } = req.body || {}
  if (!period_start || !period_end) return err(res, 400, 'period_start、period_end 必填')
  const rows = db.prepare(`
    SELECT person_id, SUM(hours) as total_hours
    FROM attendance
    WHERE work_date >= ? AND work_date <= ?
    GROUP BY person_id
  `).all(period_start, period_end)
  const insert = db.prepare(`
    INSERT INTO settlement (person_id, period_start, period_end, total_hours, amount_due, status)
    VALUES (?, ?, ?, ?, ?, '待确认')
  `)
  const notifInsert = db.prepare('INSERT INTO notification (person_id, type, title, body) VALUES (?, ?, ?, ?)')
  let count = 0
  for (const r of rows) {
    try {
      insert.run(r.person_id, period_start, period_end, r.total_hours, 0)
      notifInsert.run(r.person_id, '结算待确认', `${period_start}～${period_end} 结算单`, `工时：${r.total_hours}`)
      count++
    } catch (e) {
      if (!e.message.includes('UNIQUE')) throw e
    }
  }
  res.json({ ok: true, count })
})

router.post('/confirm/:id', (req, res) => {
  const { id } = req.params
  const { action, amount_due, amount_paid } = req.body || {}
  const st = db.prepare('SELECT status, person_id FROM settlement WHERE id = ?').get(id)
  if (!st) return res.status(404).json({ message: '不存在' })
  if (req.user?.workerId && st.person_id !== req.user.workerId) return res.status(403).json({ message: '无权操作' })
  const updates = ['updated_at = datetime(\'now\')']
  const values = []
  if (action === 'confirm') {
    const paid = amount_paid != null && parseFloat(amount_paid) > 0
    updates.push('status = ?')
    values.push(paid ? '已发放' : '已确认')
    updates.push('confirm_at = datetime(\'now\')')
    updates.push('confirm_method = ?')
    // 管理端确认 or H5 自助确认
    const method = req.user?.workerId ? 'worker_h5' : (req.user?.userId ? 'admin_pc' : 'unknown')
    values.push(method)
    if (amount_due != null) { updates.push('amount_due = ?'); values.push(parseFloat(amount_due)) }
    if (amount_paid != null) { updates.push('amount_paid = ?'); values.push(parseFloat(amount_paid)) }
    
    // 结算单确认后自动更新人员状态为已离场
    db.prepare('UPDATE person SET status = "已离场", on_site = 0, updated_at = datetime(\'now\') WHERE id = ?').run(st.person_id)
  } else if (action === 'reject') {
    updates.push('status = ?')
    values.push('已驳回')
  } else {
    if (amount_due != null) { updates.push('amount_due = ?'); values.push(parseFloat(amount_due)) }
    if (amount_paid != null) { updates.push('amount_paid = ?'); values.push(parseFloat(amount_paid)) }
  }
  values.push(id)
  db.prepare(`UPDATE settlement SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  if (action === 'confirm' && (amount_paid != null && parseFloat(amount_paid) > 0)) {
    const notifInsert = db.prepare('INSERT INTO notification (person_id, type, title, body) VALUES (?, ?, ?, ?)')
    notifInsert.run(st.person_id, '工资发放', '工资已发放', `已发放金额：${amount_paid}`)
  }
  res.json({ ok: true })
})

// 批量推送通知：对指定待确认结算单对应的工人再次写入站内通知（便于工人端及时看到）
router.post('/push-notify', (req, res) => {
  const { ids } = req.body || {}
  const where = ids && Array.isArray(ids) && ids.length > 0
    ? ` WHERE s.status = '待确认' AND s.id IN (${ids.map(() => '?').join(',')})`
    : " WHERE s.status = '待确认'"
  const params = ids && Array.isArray(ids) && ids.length > 0 ? ids : []
  const rows = db.prepare(`
    SELECT s.id, s.person_id, s.period_start, s.period_end, s.total_hours
    FROM settlement s ${where}
  `).all(...params)
  const notifInsert = db.prepare('INSERT INTO notification (person_id, type, title, body) VALUES (?, ?, ?, ?)')
  for (const r of rows) {
    notifInsert.run(r.person_id, '结算待确认', `${r.period_start}～${r.period_end} 结算单待确认`, `工时：${r.total_hours}，请到「我的薪资」确认。`)
  }
  res.json({ ok: true, count: rows.length })
})

// 电子工资条：返回 HTML 供下载或打印
router.get('/:id/slip', (req, res) => {
  const { id } = req.params
  const s = db.prepare('SELECT s.*, p.name as person_name, p.work_no FROM settlement s JOIN person p ON s.person_id = p.id WHERE s.id = ?').get(id)
  if (!s) return res.status(404).json({ message: '结算单不存在' })
  const isWorker = req.user?.workerId && s.person_id === req.user.workerId
  if (req.user?.workerId && !isWorker) return res.status(403).json({ message: '无权查看他人工资条' })
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>工资条-${s.period_start}</title><style>
    body{font-family:sans-serif;max-width:400px;margin:24px auto;padding:16px;border:1px solid #eee;border-radius:8px;}
    h3{margin:0 0 16px;border-bottom:1px solid #eee;padding-bottom:8px;}
    table{width:100%;border-collapse:collapse;}
    th,td{text-align:left;padding:8px 0;border-bottom:1px solid #f0f0f0;}
    .foot{margin-top:16px;font-size:12px;color:#666;}
  </style></head><body>
    <h3>电子工资条</h3>
    <p><strong>${s.person_name || ''}</strong> ${s.work_no ? `工号：${s.work_no}` : ''}</p>
    <table>
      <tr><th>结算周期</th><td>${s.period_start} 至 ${s.period_end}</td></tr>
      <tr><th>工时</th><td>${s.total_hours ?? 0}</td></tr>
      <tr><th>应发金额</th><td>${s.amount_due ?? 0}</td></tr>
      <tr><th>已发金额</th><td>${s.amount_paid ?? 0}</td></tr>
      <tr><th>状态</th><td>${s.status || ''}</td></tr>
    </table>
    <div class="foot">Digital Labor · ${new Date().toLocaleDateString()}</div>
  </body></html>`
  const filename = `工资条_${s.period_start}_${s.person_name || s.id}.html`
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
  res.send(html)
})

router.get('/salary', (req, res) => {
  const { person_id, org_id, month, page = 1, pageSize = 50 } = req.query
  const where = []
  const params = []
  if (person_id) { where.push('s.person_id = ?'); params.push(person_id) }
  if (org_id) { where.push('p.org_id = ?'); params.push(org_id) }
  if (month) { where.push('s.period_start LIKE ?'); params.push(month + '%') }
  const whereStr = where.length ? ' WHERE ' + where.join(' AND ') : ''
  const total = db.prepare('SELECT COUNT(*) as n FROM settlement s JOIN person p ON s.person_id = p.id' + whereStr).get(...params).n
  const limit = Math.min(100, Math.max(1, parseInt(pageSize) || 50))
  const offset = (Math.max(1, parseInt(page)) - 1) * limit
  const list = db.prepare(`
    SELECT s.*, p.name as person_name, p.work_no
    FROM settlement s JOIN person p ON s.person_id = p.id
    ${whereStr}
    ORDER BY s.period_start DESC, s.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset)
  res.json({ list, total })
})

export default router
