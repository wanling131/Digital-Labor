/**
 * 数据库表结构定义（非开发可读：本文件描述系统要存哪些数据）
 * 使用 SQLite，数据文件在 server/data/labor.db
 */
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbDir = path.join(__dirname, '..', 'data')
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
const dbPath = path.join(dbDir, 'labor.db')

export const db = new Database(dbPath)

// 组织架构：公司 → 项目部 → 标段 → 班组（树形）
db.exec(`
  CREATE TABLE IF NOT EXISTS org (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER DEFAULT 0,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    sort INTEGER DEFAULT 0,
    manager TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`)
;(function addManagerColumn() {
  const cols = db.prepare("PRAGMA table_info(org)").all()
  if (cols.some((c) => c.name === 'manager')) return
  db.exec("ALTER TABLE org ADD COLUMN manager TEXT")
})()

// 管理端登录账号（管理员、业务员等）
db.exec(`
  CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    org_id INTEGER,
    role TEXT DEFAULT 'admin',
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )
`)

// 工人档案：状态流转 预注册→已实名→已签约→已进场→已离场；contract_signed=是否已签合同，on_site=是否在岗；auth_review_status=人工审核状态
db.exec(`
  CREATE TABLE IF NOT EXISTS person (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id INTEGER,
    work_no TEXT,
    name TEXT NOT NULL,
    id_card TEXT,
    mobile TEXT,
    status TEXT DEFAULT '预注册',
    contract_signed INTEGER DEFAULT 0,
    on_site INTEGER DEFAULT 0,
    auth_review_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`)
;(function addAuthReviewColumn() {
  const cols = db.prepare("PRAGMA table_info(person)").all()
  if (cols.some((c) => c.name === 'auth_review_status')) return
  db.exec("ALTER TABLE person ADD COLUMN auth_review_status TEXT DEFAULT 'pending'")
})()

// 添加人脸验证相关字段
;(function addFaceVerifyColumns() {
  const cols = db.prepare("PRAGMA table_info(person)").all()
  
  // 添加 face_verified 字段
  if (!cols.some((c) => c.name === 'face_verified')) {
    db.exec("ALTER TABLE person ADD COLUMN face_verified INTEGER DEFAULT 0")
  }
  
  // 添加 face_verified_at 字段
  if (!cols.some((c) => c.name === 'face_verified_at')) {
    db.exec("ALTER TABLE person ADD COLUMN face_verified_at TEXT")
  }
  
  // 添加 face_image_url 字段（存储人脸图片URL）
  if (!cols.some((c) => c.name === 'face_image_url')) {
    db.exec("ALTER TABLE person ADD COLUMN face_image_url TEXT")
  }
})()

// 添加银行卡字段
;(function addBankCardColumn() {
  const cols = db.prepare("PRAGMA table_info(person)").all()
  if (!cols.some((c) => c.name === 'bank_card')) {
    db.exec("ALTER TABLE person ADD COLUMN bank_card TEXT")
  }
})()

// 工种（如：木工、钢筋工）、工作地址（首页展示用）
;(function addJobTitleAndWorkAddress() {
  const cols = db.prepare("PRAGMA table_info(person)").all()
  if (!cols.some((c) => c.name === 'job_title')) {
    db.exec("ALTER TABLE person ADD COLUMN job_title TEXT")
  }
  if (!cols.some((c) => c.name === 'work_address')) {
    db.exec("ALTER TABLE person ADD COLUMN work_address TEXT")
  }
})()

// 考勤记录：人员、日期、上班/下班、工时、项目/班组
db.exec(`
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    org_id INTEGER,
    work_date TEXT NOT NULL,
    clock_in TEXT,
    clock_out TEXT,
    hours REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(person_id, work_date)
  )
`)

// 合同模板
db.exec(`
  CREATE TABLE IF NOT EXISTS contract_template (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    file_path TEXT,
    version INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )
`)

// 合同实例：模板、发起方、签署方、状态、截止时间
db.exec(`
  CREATE TABLE IF NOT EXISTS contract_instance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER,
    title TEXT NOT NULL,
    person_id INTEGER NOT NULL,
    status TEXT DEFAULT '待签署',
    deadline TEXT,
    signed_at TEXT,
    pdf_path TEXT,
    flow_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`)

// 添加flow_id字段（如果还不存在）
;(function addFlowIdColumn() {
  const cols = db.prepare("PRAGMA table_info(contract_instance)").all()
  if (!cols.some((c) => c.name === 'flow_id')) {
    db.exec("ALTER TABLE contract_instance ADD COLUMN flow_id TEXT")
  }
})()

// 结算单：人员、周期、工时汇总、应发、已发、状态
db.exec(`
  CREATE TABLE IF NOT EXISTS settlement (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    total_hours REAL DEFAULT 0,
    amount_due REAL DEFAULT 0,
    amount_paid REAL DEFAULT 0,
    status TEXT DEFAULT '待确认',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(person_id, period_start)
  )
`)

// 站内通知（工人端：person_id；类型：合同待签、结算待确认、工资发放等）
db.exec(`
  CREATE TABLE IF NOT EXISTS notification (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    read_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`)

// 人员证书（特种作业证、安全证等，H5 我的证书用）
db.exec(`
  CREATE TABLE IF NOT EXISTS person_certificate (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    certificate_no TEXT,
    issue_date TEXT,
    expiry_date TEXT,
    status TEXT DEFAULT 'valid',
    created_at TEXT DEFAULT (datetime('now'))
  )
`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_person_certificate_person_id ON person_certificate(person_id)`)

// 角色-菜单（可配置：某角色可见的菜单 path 列表，与前端 /pc 路由一致）
db.exec(`
  CREATE TABLE IF NOT EXISTS role_menu (
    role_code TEXT NOT NULL,
    menu_path TEXT NOT NULL,
    PRIMARY KEY (role_code, menu_path)
  )
`)

// 操作日志
db.exec(`
  CREATE TABLE IF NOT EXISTS op_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    module TEXT,
    action TEXT,
    detail TEXT,
    result TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`)

// 常用查询索引（优化列表/筛选性能）
db.exec(`CREATE INDEX IF NOT EXISTS idx_person_org_id ON person(org_id)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_person_status ON person(status)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_person_on_site ON person(on_site)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_attendance_work_date ON attendance(work_date)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_attendance_person_id ON attendance(person_id)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_attendance_person_work_date ON attendance(person_id, work_date)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_contract_instance_status ON contract_instance(status)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_contract_instance_person ON contract_instance(person_id)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_contract_instance_flow_id ON contract_instance(flow_id)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_settlement_person_status ON settlement(person_id, status)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_settlement_period ON settlement(period_start, period_end)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_notification_person_id ON notification(person_id)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_notification_created_at ON notification(created_at)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_person_work_no ON person(work_no)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_person_face_verified ON person(face_verified)`)

// 默认管理员（密码 123456，与登录页演示账号一致；实际生产建议改为 bcrypt）
const defaultHash = '123456'
try {
  db.prepare("INSERT INTO user (username, password_hash, name, role) VALUES (?, ?, ?, ?)").run('admin', defaultHash, '管理员', 'admin')
} catch (e) {
  if (!e.message.includes('UNIQUE')) throw e
}
// 保证已有库中 admin 密码与演示一致（便于首次体验）
db.prepare("UPDATE user SET password_hash = ? WHERE username = 'admin'").run(defaultHash)

export function initDb() {
  return db
}
