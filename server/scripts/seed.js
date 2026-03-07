/**
 * 虚拟数据种子脚本：导入组织、人员、合同、考勤、结算、通知等，使系统展示更真实健壮
 * - 命令行运行：cd server && node scripts/seed.js（清空后重新插入，可重复执行）
 * - 应用启动时若数据库为空会自动执行一次（见 app.js）
 */
import { db, initDb } from '../db/index.js'

// 辅助：格式化日期 YYYY-MM-DD
function dateStr(d) {
  return d.toISOString().slice(0, 10)
}
function dateTimeStr(d) {
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

// 清空业务数据（保留 admin 用户）
function clearSeedData() {
  db.exec(`DELETE FROM op_log`)
  db.exec(`DELETE FROM notification`)
  db.exec(`DELETE FROM settlement`)
  db.exec(`DELETE FROM attendance`)
  db.exec(`DELETE FROM contract_instance`)
  db.exec(`DELETE FROM contract_template`)
  db.exec(`DELETE FROM person`)
  db.exec(`DELETE FROM user WHERE username != 'admin'`)
  db.exec(`DELETE FROM org`)
}

// 1. 组织架构：公司 → 项目部 → 标段 → 班组
function seedOrg() {
  const ins = db.prepare('INSERT INTO org (parent_id, name, type, sort, manager) VALUES (?, ?, ?, ?, ?)')
  ins.run(0, '某某建设集团有限公司', 'company', 0, '张总')
  const companyId = db.prepare('SELECT last_insert_rowid()').get()['last_insert_rowid()']
  ins.run(companyId, '东区项目部', 'project', 0, '李明')
  const proj1 = db.prepare('SELECT last_insert_rowid()').get()['last_insert_rowid()']
  ins.run(companyId, '西区项目部', 'project', 1, '陈刚')
  const proj2 = db.prepare('SELECT last_insert_rowid()').get()['last_insert_rowid()']
  ins.run(proj1, 'A 标段', 'segment', 0, '王建')
  const seg1 = db.prepare('SELECT last_insert_rowid()').get()['last_insert_rowid()']
  ins.run(proj1, 'B 标段', 'segment', 1, null)
  const seg2 = db.prepare('SELECT last_insert_rowid()').get()['last_insert_rowid()']
  ins.run(proj2, 'C 标段', 'segment', 0, null)
  const seg3 = db.prepare('SELECT last_insert_rowid()').get()['last_insert_rowid()']
  ins.run(seg1, '钢筋班组', 'team', 0, '赵强')
  ins.run(seg1, '木工班组', 'team', 1, '钱进')
  ins.run(seg2, '混凝土班组', 'team', 0, null)
  ins.run(seg2, '架子工班组', 'team', 1, null)
  ins.run(seg3, '水电班组', 'team', 0, null)
  ins.run(seg3, '装修班组', 'team', 1, null)
  return { companyId, proj1, proj2, seg1, seg2, seg3 }
}

// 2. 额外管理用户
function seedUsers(orgIds) {
  const ins = db.prepare('INSERT INTO user (username, password_hash, name, org_id, role) VALUES (?, ?, ?, ?, ?)')
  try {
    ins.run('manager1', 'admin123', '东区项目经理', orgIds.proj1, 'admin')
    ins.run('manager2', 'admin123', '西区项目经理', orgIds.proj2, 'user')
  } catch (e) {
    if (!e.message.includes('UNIQUE')) throw e
  }
}

// 3. 工人档案：多种状态、工号、手机、身份证
const SURNAMES = ['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '周', '吴', '徐', '孙', '马', '朱', '胡', '郭', '何', '林', '高', '罗']
const GIVEN = ['伟', '强', '磊', '洋', '勇', '军', '杰', '涛', '明', '超', '秀英', '敏', '静', '丽', '强', '磊', '洋', '勇', '军', '杰']
function randomName() {
  return SURNAMES[Math.floor(Math.random() * SURNAMES.length)] + GIVEN[Math.floor(Math.random() * GIVEN.length)]
}
function randomIdCard() {
  const area = '110101'
  const birth = '19900101'
  const seq = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
  const rest = String(Math.floor(Math.random() * 10)) + String(Math.floor(Math.random() * 10))
  return area + birth + seq + rest
}
function randomMobile() {
  return '1' + ['38', '39', '50', '51', '52', '53', '56', '58', '59', '76', '78', '88'][Math.floor(Math.random() * 12)] + String(Math.floor(Math.random() * 1e9)).padStart(9, '0')
}

function seedPersons(orgIds) {
  const teamIds = db.prepare("SELECT id FROM org WHERE type = 'team' ORDER BY id").all().map(r => r.id)
  const ins = db.prepare(`
    INSERT INTO person (org_id, work_no, name, id_card, mobile, status, contract_signed, on_site)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const statuses = ['预注册', '已实名', '已签约', '已进场', '已进场', '已进场', '已离场', '已离场']
  const personIds = []
  const usedNames = new Set()
  for (let i = 1; i <= 48; i++) {
    let name = randomName()
    while (usedNames.has(name)) name = randomName()
    usedNames.add(name)
    const org_id = teamIds[(i - 1) % teamIds.length]
    const status = statuses[(i - 1) % statuses.length]
    const contract_signed = status === '已签约' || status === '已进场' || status === '已离场' ? 1 : 0
    const on_site = status === '已进场' ? 1 : 0
    ins.run(
      org_id,
      'W' + String(1000 + i),
      name,
      i <= 40 ? randomIdCard() : null,
      i <= 45 ? randomMobile() : null,
      status,
      contract_signed,
      on_site
    )
    personIds.push(db.prepare('SELECT last_insert_rowid()').get()['last_insert_rowid()'])
  }
  return personIds
}

// 4. 合同模板
function seedTemplates() {
  const ins = db.prepare('INSERT INTO contract_template (name, file_path, version) VALUES (?, ?, ?)')
  ins.run('劳务用工合同（标准版）', null, 1)
  const t1 = db.prepare('SELECT last_insert_rowid()').get()['last_insert_rowid()']
  ins.run('短期项目协议', null, 1)
  ins.run('安全责任书', null, 1)
  return [t1, t1 + 1, t1 + 2]
}

// 5. 合同实例：待签署 + 已签署
function seedContracts(personIds, templateIds) {
  const ins = db.prepare(`
    INSERT INTO contract_instance (template_id, title, person_id, status, deadline, signed_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const now = new Date()
  const future = new Date(now)
  future.setDate(future.getDate() + 30)
  // 已签署：部分人员
  for (let i = 0; i < 20; i++) {
    const p = personIds[i]
    const signedAt = new Date(now)
    signedAt.setDate(signedAt.getDate() - Math.floor(Math.random() * 60))
    ins.run(templateIds[i % 3], `2024年度劳务合同-${i + 1}`, p, '已签署', null, dateTimeStr(signedAt))
  }
  // 待签署
  for (let i = 20; i < 35; i++) {
    ins.run(templateIds[0], '新项目入场协议', personIds[i], '待签署', dateStr(future), null)
  }
  // 与人员档案同步：已签署合同的人员标记 contract_signed=1
  db.exec(`UPDATE person SET contract_signed = 1 WHERE id IN (SELECT DISTINCT person_id FROM contract_instance WHERE status = '已签署')`)
}

// 6. 考勤：最近 60 天，在岗人员有记录
function seedAttendance(personIds) {
  const onSiteIds = db.prepare('SELECT id FROM person WHERE on_site = 1').all().map(r => r.id)
  const ins = db.prepare(`
    INSERT OR REPLACE INTO attendance (person_id, org_id, work_date, clock_in, clock_out, hours)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 60)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay()
    if (day === 0 || day === 6) continue // 跳过周末
    const workDate = dateStr(d)
    const clockIn = '08:00'
    const clockOut = '17:30'
    const hours = 8.5 + (Math.random() * 1.5)
    for (const pid of onSiteIds) {
      if (Math.random() < 0.85) {
        const row = db.prepare('SELECT org_id FROM person WHERE id = ?').get(pid)
        ins.run(pid, row?.org_id ?? null, workDate, clockIn, clockOut, Math.round(hours * 10) / 10)
      }
    }
  }
}

// 7. 结算单：待确认 + 已发放
function seedSettlements(personIds) {
  const ins = db.prepare(`
    INSERT OR REPLACE INTO settlement (person_id, period_start, period_end, total_hours, amount_due, amount_paid, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const onSiteIds = db.prepare('SELECT id FROM person WHERE on_site = 1').all().map(r => r.id)
  const hourlyRate = 45
  for (let m = 1; m <= 3; m++) {
    const periodStart = `2025-${String(m).padStart(2, '0')}-01`
    const periodEnd = m === 3 ? '2025-03-31' : `2025-${String(m).padStart(2, '0')}-28`
    for (const pid of onSiteIds) {
      const hours = 160 + Math.floor(Math.random() * 40)
      const amount = Math.round(hours * hourlyRate)
      const status = m <= 2 ? '已发放' : (Math.random() < 0.6 ? '待确认' : '已发放')
      ins.run(pid, periodStart, periodEnd, hours, amount, status === '已发放' ? amount : 0, status)
    }
  }
}

// 8. 站内通知
function seedNotifications(personIds) {
  const ins = db.prepare('INSERT INTO notification (person_id, type, title, body, read_at) VALUES (?, ?, ?, ?, ?)')
  const types = [
    { type: '合同待签', title: '新项目入场协议待签署', body: '请尽快登录工人端完成签署。' },
    { type: '结算待确认', title: '2025年3月结算单待确认', body: '请核对工时与金额后确认。' },
    { type: '工资发放', title: '2月工资已发放', body: '已发放至登记银行卡，请注意查收。' },
  ]
  for (let i = 20; i < Math.min(35, personIds.length); i++) {
    ins.run(personIds[i], '合同待签', '新项目入场协议待签署', '截止：请于本月内完成签署', null)
  }
  const onSiteIds = db.prepare('SELECT id FROM person WHERE on_site = 1').all().map(r => r.id)
  for (const pid of onSiteIds.slice(0, 15)) {
    const t = types[Math.floor(Math.random() * types.length)]
    ins.run(pid, t.type, t.title, t.body, Math.random() < 0.5 ? dateTimeStr(new Date()) : null)
  }
}

// 9. 操作日志
function seedOpLog() {
  const userId = db.prepare("SELECT id FROM user WHERE username = 'admin'").get()?.id
  if (!userId) return
  const ins = db.prepare(`
    INSERT INTO op_log (user_id, username, module, action, detail, result) VALUES (?, ?, ?, ?, ?, ?)
  `)
  const actions = [
    { module: 'sys/org', action: 'GET', detail: '', result: 'success' },
    { module: 'person/archive', action: 'GET', detail: '', result: 'success' },
    { module: 'person/archive', action: 'POST', detail: '{"name":"张三","work_no":"W1001"}', result: 'success' },
    { module: 'contract/launch', action: 'POST', detail: '{"title":"劳务合同","person_ids":["1","2"]}', result: 'success' },
    { module: 'attendance/import', action: 'POST', detail: '', result: 'success' },
    { module: 'settlement/confirm', action: 'GET', detail: '', result: 'success' },
    { module: 'data/board', action: 'GET', detail: '', result: 'success' },
  ]
  const now = new Date()
  for (let i = 0; i < 30; i++) {
    const a = actions[i % actions.length]
    const d = new Date(now)
    d.setDate(d.getDate() - Math.floor(i / 2))
    db.prepare(`
      INSERT INTO op_log (user_id, username, module, action, detail, result, created_at)
      VALUES (?, 'admin', ?, ?, ?, ?, ?)
    `).run(userId, a.module, a.action, a.detail, a.result, dateTimeStr(d))
  }
}

/**
 * 执行种子：可选是否先清空业务数据（保留 admin）
 * @param {boolean} clearFirst - 为 true 时先清空再插入（命令行用）；为 false 时仅插入（启动时数据库为空用）
 */
export function runSeed(clearFirst = true) {
  if (clearFirst) clearSeedData()
  const orgIds = seedOrg()
  seedUsers(orgIds)
  const personIds = seedPersons(orgIds)
  const templateIds = seedTemplates()
  seedContracts(personIds, templateIds)
  seedAttendance(personIds)
  seedSettlements(personIds)
  seedNotifications(personIds)
  seedOpLog()
  return {
    org: db.prepare('SELECT COUNT(*) as n FROM org').get().n,
    user: db.prepare('SELECT COUNT(*) as n FROM user').get().n,
    person: db.prepare('SELECT COUNT(*) as n FROM person').get().n,
    contract_template: db.prepare('SELECT COUNT(*) as n FROM contract_template').get().n,
    contract_instance: db.prepare('SELECT COUNT(*) as n FROM contract_instance').get().n,
    attendance: db.prepare('SELECT COUNT(*) as n FROM attendance').get().n,
    settlement: db.prepare('SELECT COUNT(*) as n FROM settlement').get().n,
    notification: db.prepare('SELECT COUNT(*) as n FROM notification').get().n,
    op_log: db.prepare('SELECT COUNT(*) as n FROM op_log').get().n,
  }
}

// 命令行直接运行时：初始化 DB、清空后重插、打印数量
const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('seed.js')
if (isMain) {
  initDb()
  try {
    const counts = runSeed(true)
    console.log('虚拟数据导入完成，当前数据量：')
    console.log(counts)
  } catch (e) {
    console.error('seed 失败:', e)
    process.exit(1)
  }
}
