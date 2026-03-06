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
    created_at TEXT DEFAULT (datetime('now'))
  )
`)

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

// 工人档案：状态流转 预注册→已实名→已签约→已进场→已离场；contract_signed=是否已签合同，on_site=是否在岗
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
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`)

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
    created_at TEXT DEFAULT (datetime('now'))
  )
`)

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
db.exec(`CREATE INDEX IF NOT EXISTS idx_contract_instance_status ON contract_instance(status)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_contract_instance_person ON contract_instance(person_id)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_settlement_person_status ON settlement(person_id, status)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_notification_person_id ON notification(person_id)`)

// 默认管理员（密码 admin123，实际应 bcrypt，此处简化）
const defaultHash = 'admin123'
try {
  db.prepare("INSERT INTO user (username, password_hash, name, role) VALUES (?, ?, ?, ?)").run('admin', defaultHash, '管理员', 'admin')
} catch (e) {
  if (!e.message.includes('UNIQUE')) throw e
}

export function initDb() {
  return db
}
