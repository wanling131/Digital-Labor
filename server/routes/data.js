/**
 * 数据看板接口（非开发可读：总人数、实名率、签约率、在岗率等 KPI）
 */
import { Router } from 'express'
import { db } from '../db/index.js'

const router = Router()

router.get('/board', (_, res) => {
  const r = db.prepare(`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN status != '预注册' THEN 1 ELSE 0 END) as realName,
      SUM(CASE WHEN contract_signed = 1 THEN 1 ELSE 0 END) as signed,
      SUM(CASE WHEN on_site = 1 THEN 1 ELSE 0 END) as onSite
    FROM person
  `).get()
  const total = r.total || 0
  res.json({
    total,
    realNameRate: total ? ((r.realName / total) * 100).toFixed(1) : 0,
    signRate: total ? ((r.signed / total) * 100).toFixed(1) : 0,
    onSiteRate: total ? ((r.onSite / total) * 100).toFixed(1) : 0,
  })
})

// 趋势数据：最近 N 天每日新增人员、每日签约数、每日考勤人次与工时
router.get('/board/trend', (req, res) => {
  const days = Math.min(90, Math.max(7, parseInt(req.query.days) || 30))
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - days)
  const startStr = start.toISOString().slice(0, 10)
  const endStr = end.toISOString().slice(0, 10)
  const dailyPerson = db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as count
    FROM person WHERE date(created_at) >= ? AND date(created_at) <= ?
    GROUP BY date(created_at) ORDER BY date
  `).all(startStr, endStr)
  const dailySigned = db.prepare(`
    SELECT date(signed_at) as date, COUNT(*) as count
    FROM contract_instance WHERE status = '已签署' AND signed_at IS NOT NULL
      AND date(signed_at) >= ? AND date(signed_at) <= ?
    GROUP BY date(signed_at) ORDER BY date
  `).all(startStr, endStr)
  const dailyAttendance = db.prepare(`
    SELECT work_date as date, COUNT(*) as count, SUM(hours) as total_hours
    FROM attendance
    WHERE work_date >= ? AND work_date <= ?
    GROUP BY work_date ORDER BY work_date
  `).all(startStr, endStr)
  const byDate = {}
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const ds = d.toISOString().slice(0, 10)
    byDate[ds] = { date: ds, personCount: 0, signedCount: 0, attendanceCount: 0, totalHours: 0 }
  }
  dailyPerson.forEach(r => { if (byDate[r.date]) byDate[r.date].personCount = r.count })
  dailySigned.forEach(r => { if (byDate[r.date]) byDate[r.date].signedCount = r.count })
  dailyAttendance.forEach(r => { if (byDate[r.date]) { byDate[r.date].attendanceCount = r.count; byDate[r.date].totalHours = r.total_hours || 0 } })
  const trend = Object.keys(byDate).sort().map(d => byDate[d])
  res.json({ trend, start: startStr, end: endStr })
})

export default router
