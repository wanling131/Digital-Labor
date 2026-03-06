# 后端说明（非开发可读）

- **做什么**：提供管理端和工人端共用的接口（登录、人员、合同、考勤、结算、看板等），数据存本地 SQLite。
- **目录**：
  - `db/` 数据库表结构与常用查询索引
  - `middleware/` 登录校验、操作日志、全局错误处理、asyncHandler（异步路由包装）
  - `routes/` 按业务拆分的接口
  - `lib/` 统一响应（response）、常量（constants）、校验与分页（validate）
  - `docs/API.md` **完整接口文档**，供前端对接使用
- **启动**：在项目根目录执行 `npm run dev` 会同时起前端和后端；仅后端可进 `server` 后执行 `npm run dev`。
- **接口约定**：错误响应统一为 `{ code, message }`；分页列表为 `{ list, total }`；鉴权见 `docs/API.md`。
