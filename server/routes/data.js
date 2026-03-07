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
      SUM(CASE WHEN on_site = 1 THEN 1 ELSE 0 END) as onSite,
      SUM(CASE WHEN status = '预注册' THEN 1 ELSE 0 END) as pendingRealName
    FROM person
  `).get()
  const total = Number(r.total) || 0
  const pendingRealName = Number(r.pendingRealName) || 0
  const contractExpiringRow = db.prepare(`
    SELECT COUNT(*) as n FROM contract_instance
    WHERE status = '已签署' AND deadline IS NOT NULL
      AND date(deadline) >= date('now') AND date(deadline) <= date('now', '+30 days')
  `).get()
  const contractExpiring = Number(contractExpiringRow?.n) || 0

  const thisMonthStart = new Date()
  thisMonthStart.setDate(1)
  thisMonthStart.setHours(0, 0, 0, 0)
  const lastMonthStart = new Date(thisMonthStart)
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1)
  const lastMonthStartStr = lastMonthStart.toISOString().slice(0, 10)
  const thisMonthStartStr = thisMonthStart.toISOString().slice(0, 10)

  const lastR = db.prepare(`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN status != '预注册' THEN 1 ELSE 0 END) as realName,
      SUM(CASE WHEN contract_signed = 1 THEN 1 ELSE 0 END) as signed,
      SUM(CASE WHEN on_site = 1 THEN 1 ELSE 0 END) as onSite
    FROM person WHERE created_at < ?
  `).get(thisMonthStartStr)
  const lastTotal = Number(lastR?.total) || 0
  const totalChangePercent = lastTotal ? (((total - lastTotal) / lastTotal) * 100).toFixed(1) : '0'
  const realNameRateLast = lastTotal ? ((Number(lastR?.realName) || 0) / lastTotal) * 100 : 0
  const realNameRateNow = total ? ((r.realName / total) * 100) : 0
  const realNameRateChange = realNameRateLast ? ((realNameRateNow - realNameRateLast) / realNameRateLast * 100).toFixed(1) : '0'
  const signRateLast = lastTotal ? ((Number(lastR?.signed) || 0) / lastTotal) * 100 : 0
  const signRateNow = total ? ((r.signed / total) * 100) : 0
  const signRateChange = signRateLast ? ((signRateNow - signRateLast) / signRateLast * 100).toFixed(1) : '0'
  const onSiteRateLast = lastTotal ? ((Number(lastR?.onSite) || 0) / lastTotal) * 100 : 0
  const onSiteRateNow = total ? ((r.onSite / total) * 100) : 0
  const onSiteRateChange = onSiteRateLast ? ((onSiteRateNow - onSiteRateLast) / onSiteRateLast * 100).toFixed(1) : '0'

  const teamRank = db.prepare(`
    SELECT o.name, COUNT(*) as count
    FROM person p
    JOIN org o ON p.org_id = o.id
    WHERE o.type = 'team' AND p.on_site = 1
    GROUP BY o.id
    ORDER BY count DESC
    LIMIT 6
  `).all()

  const pendingContract = Number(db.prepare("SELECT COUNT(*) as n FROM contract_instance WHERE status = '待签署'").get()?.n) || 0
  const pendingSettlement = Number(db.prepare("SELECT COUNT(*) as n FROM settlement WHERE status = '待确认'").get()?.n) || 0

  const activitiesFromPerson = db.prepare(`
    SELECT p.name, o.name as org_name, p.created_at
    FROM person p LEFT JOIN org o ON p.org_id = o.id
    ORDER BY p.created_at DESC LIMIT 3
  `).all()
  const activitiesFromContract = db.prepare(`
    SELECT p.name, c.title, c.signed_at as created_at
    FROM contract_instance c JOIN person p ON c.person_id = p.id
    WHERE c.status = '已签署' AND c.signed_at IS NOT NULL
    ORDER BY c.signed_at DESC LIMIT 3
  `).all()
  const activities = [
    ...activitiesFromPerson.map((a) => ({ type: '入职', name: a.name, project: a.org_name || '—', created_at: a.created_at })),
    ...activitiesFromContract.map((a) => ({ type: '签约', name: a.name, project: a.title || '—', created_at: a.created_at })),
  ]
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 5)
    .map((a) => {
      const t = a.created_at ? new Date(a.created_at) : null
      let time = '—'
      if (t) {
        const min = Math.floor((Date.now() - t.getTime()) / 60000)
        if (min < 60) time = `${min}分钟前`
        else if (min < 1440) time = `${Math.floor(min / 60)}小时前`
        else time = `${Math.floor(min / 1440)}天前`
      }
      return { type: a.type, name: a.name, project: a.project, time }
    })

  res.json({
    total,
    realNameRate: total ? ((r.realName / total) * 100).toFixed(1) : 0,
    signRate: total ? ((r.signed / total) * 100).toFixed(1) : 0,
    onSiteRate: total ? ((r.onSite / total) * 100).toFixed(1) : 0,
    totalChangePercent: String(totalChangePercent),
    realNameRateChange: String(realNameRateChange),
    signRateChange: String(signRateChange),
    onSiteRateChange: String(onSiteRateChange),
    pendingRealName,
    contractExpiring,
    blacklistMatch: 0,
    teamRank,
    recentActivities: activities,
    todos: [
      { title: '待审批合同', count: pendingContract, urgent: true },
      { title: '待确认结算单', count: pendingSettlement, urgent: true },
      { title: '待认证人员', count: pendingRealName, urgent: false },
      { title: '即将到期合同', count: contractExpiring, urgent: false },
      { title: '考勤异常待处理', count: 0, urgent: true },
    ],
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
