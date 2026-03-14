-- Digital-Labor SQLite schema (demo / no extra software)
-- 目标：在无需安装 PostgreSQL 的情况下，生成一个可演示的 SQLite 文件库；
-- 同时表名/字段尽量与 PostgreSQL schema 对齐，便于同一套后端代码复用。

BEGIN;

CREATE TABLE IF NOT EXISTS org (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER DEFAULT 0,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  sort INTEGER DEFAULT 0,
  manager TEXT,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS "user" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  org_id INTEGER,
  role TEXT DEFAULT 'admin',
  enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

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
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT DEFAULT (CURRENT_TIMESTAMP),
  face_verified INTEGER DEFAULT 0,
  face_verified_at TEXT,
  face_image_url TEXT,
  bank_card TEXT,
  job_title TEXT,
  work_address TEXT,
  signature_image TEXT,
  password_hash TEXT
);

CREATE TABLE IF NOT EXISTS worker_notification_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id INTEGER NOT NULL UNIQUE,
  push_enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL,
  org_id INTEGER,
  work_date TEXT NOT NULL,
  clock_in TEXT,
  clock_out TEXT,
  hours REAL DEFAULT 0,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
  UNIQUE(person_id, work_date)
);

CREATE TABLE IF NOT EXISTS contract_template (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  file_path TEXT,
  version INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
  content TEXT,
  variables TEXT,
  is_visual INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS template_variable (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  options TEXT,
  required INTEGER DEFAULT 0
);

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
  sign_image_snapshot TEXT,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS settlement (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  total_hours REAL DEFAULT 0,
  amount_due REAL DEFAULT 0,
  amount_paid REAL DEFAULT 0,
  status TEXT DEFAULT '待确认',
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT DEFAULT (CURRENT_TIMESTAMP),
  confirm_at TEXT,
  confirm_method TEXT,
  sign_image_snapshot TEXT,
  UNIQUE(person_id, period_start)
);

CREATE TABLE IF NOT EXISTS notification (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TEXT,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS person_certificate (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  certificate_no TEXT,
  issue_date TEXT,
  expiry_date TEXT,
  status TEXT DEFAULT 'valid',
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS role_menu (
  role_code TEXT NOT NULL,
  menu_path TEXT NOT NULL,
  PRIMARY KEY (role_code, menu_path)
);

CREATE TABLE IF NOT EXISTS role_permission (
  role_code TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  PRIMARY KEY (role_code, permission_key)
);

CREATE TABLE IF NOT EXISTS op_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT,
  module TEXT,
  action TEXT,
  detail TEXT,
  result TEXT,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS equipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER,
  name TEXT NOT NULL,
  code TEXT,
  status TEXT DEFAULT '正常',
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS site_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER,
  user_id INTEGER,
  log_type TEXT NOT NULL,
  content TEXT,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS clock_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL,
  punch_at TEXT NOT NULL,
  type TEXT NOT NULL,
  source TEXT,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

-- Indexes (best-effort, aligned with postgres_schema.sql)
CREATE INDEX IF NOT EXISTS idx_person_org_id ON person(org_id);
CREATE INDEX IF NOT EXISTS idx_person_status ON person(status);
CREATE INDEX IF NOT EXISTS idx_person_on_site ON person(on_site);
CREATE INDEX IF NOT EXISTS idx_person_updated_at ON person(updated_at);
CREATE INDEX IF NOT EXISTS idx_person_job_title ON person(job_title);
CREATE INDEX IF NOT EXISTS idx_attendance_work_date ON attendance(work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_person_id ON attendance(person_id);
CREATE INDEX IF NOT EXISTS idx_attendance_person_work_date ON attendance(person_id, work_date);
CREATE INDEX IF NOT EXISTS idx_contract_instance_status ON contract_instance(status);
CREATE INDEX IF NOT EXISTS idx_contract_instance_person ON contract_instance(person_id);
CREATE INDEX IF NOT EXISTS idx_contract_instance_flow_id ON contract_instance(flow_id);
CREATE INDEX IF NOT EXISTS idx_settlement_person_status ON settlement(person_id, status);
CREATE INDEX IF NOT EXISTS idx_settlement_period ON settlement(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_notification_person_id ON notification(person_id);
CREATE INDEX IF NOT EXISTS idx_notification_created_at ON notification(created_at);
CREATE INDEX IF NOT EXISTS idx_person_work_no ON person(work_no);
CREATE INDEX IF NOT EXISTS idx_person_face_verified ON person(face_verified);
CREATE INDEX IF NOT EXISTS idx_person_certificate_person_id ON person_certificate(person_id);
CREATE INDEX IF NOT EXISTS idx_equipment_org_id ON equipment(org_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_site_log_org_id ON site_log(org_id);
CREATE INDEX IF NOT EXISTS idx_site_log_created_at ON site_log(created_at);
CREATE INDEX IF NOT EXISTS idx_clock_log_person_id ON clock_log(person_id);
CREATE INDEX IF NOT EXISTS idx_clock_log_punch_at ON clock_log(punch_at);

COMMIT;

