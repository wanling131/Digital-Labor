# Digital Labor · 后端 API 接口说明

> 供前端开发对接使用。基础路径：`/api`。除登录与健康检查外，需在 Header 中携带 `Authorization: Bearer <token>`。

---

## 一、通用约定

### 1.1 认证

| 终端 | Token 来源 | Header |
|------|------------|--------|
| 管理端 | `POST /api/auth/login` 返回 `token` | `Authorization: Bearer <token>`，存为 `labor_token` |
| 工人端 | `POST /api/auth/worker-login` 返回 `token` | `Authorization: Bearer <token>`，存为 `labor_worker_token` |

- 未带 token 或 token 无效：`401`，body `{ code, message }`。
- 管理端 JWT payload：`{ userId, username }`；工人端：`{ workerId }`。

### 1.2 响应格式

- **成功**：HTTP 200（或 201），body 为业务数据（如 `{ list, total }`、`{ id }`、`{ ok: true }` 等）。
- **错误**：HTTP 4xx/5xx，body 统一为 `{ code?, message [, details? ] }`。
  - 常见 code：`UNAUTHORIZED`(401)、`FORBIDDEN`(403)、`NOT_FOUND`(404)、`BAD_REQUEST`(400)、`INTERNAL_ERROR`(500)。

### 1.3 分页

- 列表类接口通常支持 query：`page`（从 1）、`pageSize`（默认 20，最大一般 100）。
- 响应：`{ list: [], total: number [, page, pageSize ] }`。

---

## 二、接口清单

### 2.1 健康与元信息

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|:----:|------|
| GET | /api/health | 否 | 健康检查，返回 `{ ok: true }` |
| GET | /api | 否 | 接口元信息，返回 `{ name, api, docs }` |
| GET | /api/sys/feature-status | 否 | 能力开关：`{ faceVerify: "aliyun" 或 "mock" }`，供前端展示是否已接入真人脸 |

---

### 2.2 认证（/api/auth）

| 方法 | 路径 | 鉴权 | 请求体 | 响应 |
|------|------|:----:|--------|------|
| POST | /api/auth/login | 否 | `{ username, password }` | `{ token, user: { id, username, name, role } }` |
| POST | /api/auth/worker-login | 否 | `{ work_no, name }`、`{ mobile, password }`（演示密码 123456）或 `{ person_id }` | `{ token, person: { id, work_no, name, mobile } }` |

- 登录失败：401/400，body `{ code, message }`（如 `UNAUTHORIZED`、`BAD_REQUEST`）。

---

### 2.3 组织（/api/sys，管理端）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|:----:|------|
| GET | /api/sys/org | 管理端 | 组织树，返回 `{ tree }` |
| POST | /api/sys/org | 管理端 | body `{ parent_id?, name, type?, sort? }`，返回 `{ id }` |
| PUT | /api/sys/org/:id | 管理端 | body `{ name?, type?, sort? }` |
| DELETE | /api/sys/org/:id | 管理端 | 有子节点时 400 |

---

### 2.4 用户（/api/sys，管理端）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|:----:|------|
| GET | /api/sys/user | 管理端 | 用户列表 `{ list }`，含 org_name |
| POST | /api/sys/user | 管理端 | body `{ username, password, name?, org_id?, role? }`，返回 `{ id }` |
| PUT | /api/sys/user/:id | 管理端 | body `{ name?, org_id?, role?, enabled?, password? }` |
| POST | /api/sys/user/import | 管理端 | multipart 上传 Excel，列：用户名、密码、姓名、组织、角色；返回 `{ ok, count, errors[] }` |

---

### 2.5 权限与菜单（/api/sys，管理端）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|:----:|------|
| GET | /api/sys/my-menu | 管理端 | 当前用户可见菜单，返回 `{ menus }`（树形 path/label/children，与前端 /pc 路由一致） |
| GET | /api/sys/all-menus | 管理端 | 全量菜单树，供权限配置页使用 `{ menus }` |
| GET | /api/sys/role | 管理端 | 预定义角色列表 `{ list: [{ code, name, desc }] }` |
| GET | /api/sys/role/:code/menus | 管理端 | 某角色的菜单 path 列表 `{ paths: string[] }` |
| PUT | /api/sys/role/:code/menus | 管理端 | body `{ paths: string[] }`，保存该角色可见菜单 |

---

### 2.6 操作日志（/api/sys，管理端）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|:----:|------|
| GET | /api/sys/log | 管理端 | query `page`, `pageSize`，返回 `{ list, total }` |

---

### 2.7 人员档案（/api/person，管理端）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|:----:|------|
| GET | /api/person/archive | 管理端 | query: `status`, `org_id`, `on_site`(1), `filled`(1\|0), `page`, `pageSize`；返回 `{ list, total }` |
| GET | /api/person/archive/:id | 管理端 | 单条，含 org_name |
| POST | /api/person/archive | 管理端 | body `{ org_id?, work_no?, name, id_card?, mobile?, status? }`，返回 `{ id }` |
| PUT | /api/person/archive/:id | 管理端 | body 同 POST 字段（部分更新） |
| DELETE | /api/person/archive/:id | 管理端 | 删除人员 |
| GET | /api/person/status | 管理端 | 各状态人数 `{ list: [{ status, count }] }` |
| POST | /api/person/status/batch | 管理端 | body `{ ids: number[], status }`，批量改状态（含进场/离场时联动 on_site） |
| GET | /api/person/auth | 管理端 | 认证相关占位，当前返回 `{ list: [] }` |
| POST | /api/person/face-verify | 管理端/工人端 | 人脸核验。配置 `ALIYUN_ACCESS_KEY_*` 后走阿里云；否则 mock。body：`mode`（living/compare/full）、`image`（base64，living/compare 必填）、`person_id`（可选，通过后写 face_verified）；compare 需 `target_image`；full 需 `cert_name`、`cert_no`、`meta_info`。返回 `{ ok, passed, message }`。 |
| GET | /api/person/:id | 管理端 | 单条人员（简略） |

---

### 2.8 合同（/api/contract）

**管理端：**

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|:----:|------|
| GET | /api/contract/template | 管理端 | 模板列表 `{ list }` |
| POST | /api/contract/template | 管理端 | body `{ name, file_path? }`，返回 `{ id }` |
| POST | /api/contract/template/upload | 管理端 | multipart file + name，返回 `{ id }` |
| GET | /api/contract/status | 管理端 | query `status`, `page`, `pageSize`；返回 `{ list, total }`（含 person_name, work_no, deadline） |
| POST | /api/contract/launch | 管理端 | body `{ template_id?, title, person_ids: number[], deadline? }`，返回 `{ ok, count }` |
| GET | /api/contract/archive | 管理端 | query `person_id`, `org_id`, `title`, `date_from`, `date_to`, `page`, `pageSize`；仅已签署；返回 `{ list, total }` |
| PUT | /api/contract/:id/invalidate | 管理端 | 作废已签署合同 |
| GET | /api/contract/:id | 管理端 | 单条实例详情 |
| GET | /api/contract/:id/pdf | 管理端/工人 | 下载 PDF（无文件时 404，noFile: true） |

**工人端：**

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|:----:|------|
| GET | /api/contract/my-pending | 工人端 | 待签列表 `{ list }`，可带 query person_id |
| GET | /api/contract/my-signed | 工人端 | 已签列表 `{ list }` |
| POST | /api/contract/sign/:id | 工人端 | body 可选 `person_id`，默认当前 workerId；签署后状态已签署 |

---

### 2.9 考勤（/api/attendance）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|:----:|------|
| POST | /api/attendance/import | 管理端 | multipart Excel；表头需含人员/姓名、日期；可选上班、下班、工时、组织；返回 `{ ok, count }` |
| GET | /api/attendance/report | 管理端 | query `person_id`, `org_id`, `start`, `end`, `page`, `pageSize`；返回 `{ list, total }` |
| GET | /api/attendance/my | 工人端 | query `person_id`(或登录), `year`, `month`；返回 `{ list }` |
| POST | /api/attendance/clock | 工人端 | body `{ type: 'in' \| 'out' }`，记录当日上班/下班时间；与首页、考勤页共用 GET /my 数据 |

---

### 2.10 结算与薪资（/api/settlement）

**管理端：**

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|:----:|------|
| GET | /api/settlement/confirm | 管理端 | query `status`, `page`, `pageSize`；返回 `{ list, total }` |
| POST | /api/settlement/generate | 管理端 | body `{ period_start, period_end }`，按考勤汇总生成待确认结算单；返回 `{ ok, count }` |
| POST | /api/settlement/confirm/:id | 管理端 | body `{ action: 'confirm'|'reject', amount_due?, amount_paid? }`；确认可填金额 |
| POST | /api/settlement/push-notify | 管理端 | body `{ ids?: number[] }`，对指定或全部待确认单推送站内通知；返回 `{ ok, count }` |
| GET | /api/settlement/salary | 管理端 | query `person_id`, `org_id`, `month`, `page`, `pageSize`；返回 `{ list, total }` |
| GET | /api/settlement/:id/slip | 管理端/工人 | 电子工资条 HTML，Content-Disposition 下载；工人仅能查本人 |

**工人端：**

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|:----:|------|
| GET | /api/settlement/my-pending | 工人端 | 待确认结算单 `{ list }` |
| GET | /api/settlement/my | 工人端 | 我的结算历史 `{ list }` |
| POST | /api/settlement/confirm/:id | 工人端 | 同上，仅能操作本人；action confirm/reject |

---

### 2.11 现场（/api/site，管理端）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|:----:|------|
| POST | /api/site/leave | 管理端 | body `{ person_id }`，离场登记（on_site=0） |
| GET | /api/site/board | 管理端 | 在岗按组织汇总：`{ projects: [{ org_id, org_name, expected, count }], total, total_expected }`。expected=应在岗(已进场人数)，count=当前在岗(on_site=1)，缺勤=expected−count |

---

### 2.12 数据看板（/api/data，管理端）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|:----:|------|
| GET | /api/data/board | 管理端 | KPI：`{ total, realNameRate, signRate, onSiteRate, totalChangePercent, *RateChange, pendingRealName, contractExpiring, blacklistMatch, teamRank, recentActivities, todos }` |
| GET | /api/data/board/trend | 管理端 | query `days`(7~90)，返回 `{ trend: [{ date, personCount, signedCount, attendanceCount, totalHours }], start, end }` |

---

### 2.13 通知（/api/notify，工人端）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|:----:|------|
| GET | /api/notify/list | 工人端 | query `page`, `pageSize`；返回 `{ list, total }` |
| PUT | /api/notify/:id/read | 工人端 | 标已读 |

---

### 2.14 工人个人（/api/worker，工人端）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|:----:|------|
| GET | /api/worker/me | 工人端 | 当前人员档案（含 org_name、job_title、work_address；敏感字段脱敏） |
| PUT | /api/worker/me | 工人端 | body `{ mobile?, id_card? }`，信息补全/修改 |
| GET | /api/worker/certificates | 工人端 | 当前人员证书列表 `{ list: [{ id, name, certificate_no, issue_date, expiry_date, status }] }` |

---

## 三、路由挂载与鉴权说明

- `/api/auth/*` 不经过统一鉴权中间件。
- 其余 `/api/*` 均经过 `authMiddleware`（校验 JWT，写入 `req.user`）；未登录 401。
- `/api/notify/*`、`/api/worker/*` 在鉴权后额外要求 `req.user.workerId` 存在（工人端 token）。
- 管理端与工人端共用同一 baseURL；前端通过携带的 token 区分身份。

---

## 四、数据库与表（参考）

- 数据文件：`server/data/labor.db`（SQLite）。
- 表：org, user, person（含 job_title、work_address）, person_certificate, attendance, contract_template, contract_instance, settlement, notification, op_log。
- 详见 `server/db/schema.js`。

---

**文档版本**：与当前后端实现一致，前端可据此开发；若有新增接口以代码为准并同步更新本文档。
