/**
 * 考勤接口（非开发可读：Excel 导入考勤、按条件查工时报表、工人端我的考勤）
 */
import { Router } from 'express'
import multer from 'multer'
import * as XLSX from 'xlsx'
import { db } from '../db/index.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: '请上传文件' })
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
    if (!rows.length) return res.json({ ok: true, count: 0, message: '无数据' })
    const header = rows[0].map(h => String(h || '').trim())
    const personIdx = header.findIndex(h => /人员|姓名|person|name/i.test(h))
    const dateIdx = header.findIndex(h => /日期|date|工作日期/i.test(h))
    const inIdx = header.findIndex(h => /上班|签到|clock.?in|开始/i.test(h))
    const outIdx = header.findIndex(h => /下班|签退|clock.?out|结束/i.test(h))
    const hoursIdx = header.findIndex(h => /工时|hours|时长/i.test(h))
    const orgIdx = header.findIndex(h => /组织|班组|org|项目/i.test(h))
    if (personIdx < 0 || dateIdx < 0) return res.status(400).json({ message: '表格需包含人员(或姓名)列和日期列' })
    const insert = db.prepare(`
      INSERT OR REPLACE INTO attendance (person_id, org_id, work_date, clock_in, clock_out, hours)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    let count = 0
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const nameOrId = row[personIdx] != null ? String(row[personIdx]).trim() : ''
      const workDate = row[dateIdx] != null ? String(row[dateIdx]).trim().slice(0, 10).replace(/\//g, '-') : ''
      if (!nameOrId || !workDate) continue
      let personId = parseInt(nameOrId, 10)
      if (Number.isNaN(personId)) {
        const p = db.prepare('SELECT id FROM person WHERE name = ? OR work_no = ?').get(nameOrId, nameOrId)
        if (!p) continue
        personId = p.id
      }
      const clockIn = inIdx >= 0 && row[inIdx] != null ? String(row[inIdx]) : null
      const clockOut = outIdx >= 0 && row[outIdx] != null ? String(row[outIdx]) : null
      let hours = hoursIdx >= 0 && row[hoursIdx] != null ? parseFloat(row[hoursIdx]) : 0
      if (Number.isNaN(hours)) hours = 0
      const orgId = orgIdx >= 0 && row[orgIdx] != null ? parseInt(row[orgIdx], 10) : null
      insert.run(personId, Number.isNaN(orgId) ? null : orgId, workDate, clockIn, clockOut, hours)
      count++
    }
    res.json({ ok: true, count })
  } catch (e) {
    res.status(500).json({ message: e.message || '解析失败' })
  }
})

router.get('/report', (req, res) => {
  const { person_id, org_id, start, end, page = 1, pageSize = 50 } = req.query
  const where = []
  const params = []
  if (person_id) { where.push('a.person_id = ?'); params.push(person_id) }
  if (org_id) { where.push('(a.org_id = ? OR p.org_id = ?)'); params.push(org_id, org_id) }
  if (start) { where.push('a.work_date >= ?'); params.push(start) }
  if (end) { where.push('a.work_date <= ?'); params.push(end) }
  const whereStr = where.length ? ' WHERE ' + where.join(' AND ') : ''
  const total = db.prepare('SELECT COUNT(*) as n FROM attendance a JOIN person p ON a.person_id = p.id' + whereStr).get(...params).n
  const limit = Math.min(100, Math.max(1, parseInt(pageSize) || 50))
  const offset = (Math.max(1, parseInt(page)) - 1) * limit
  const list = db.prepare(`
    SELECT a.*, p.name as person_name, p.work_no, o.name as org_name
    FROM attendance a
    JOIN person p ON a.person_id = p.id
    LEFT JOIN org o ON a.org_id = o.id
    ${whereStr}
    ORDER BY a.work_date DESC, a.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset)
  res.json({ list, total })
})

router.get('/my', (req, res) => {
  const person_id = req.query.person_id || req.user?.workerId
  const { year, month } = req.query
  if (!person_id) return res.status(400).json({ message: 'person_id 必填或请登录' })
  let sql = 'SELECT a.* FROM attendance a WHERE a.person_id = ?'
  const params = [person_id]
  if (year && month) {
    const y = parseInt(year, 10)
    const m = parseInt(month, 10)
    if (!Number.isNaN(y) && !Number.isNaN(m) && m >= 1 && m <= 12) {
      const start = `${y}-${String(m).padStart(2, '0')}-01`
      const end = new Date(y, m, 0)
      const endStr = end.toISOString().slice(0, 10)
      sql += ' AND a.work_date >= ? AND a.work_date <= ?'
      params.push(start, endStr)
    }
  }
  sql += ' ORDER BY a.work_date DESC LIMIT 200'
  const list = db.prepare(sql).all(...params)
  res.json({ list })
})

export default router
