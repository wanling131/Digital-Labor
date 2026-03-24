# Digital Labor - 开发规范与工作流

---

## 一、开发工作流

### 第一阶段：Think & Plan（构思与规划）

| 技能 | 触发条件 | 行为要求 |
|------|----------|----------|
| Brainstorming | 需求模糊时 | 探索需求边界、对比技术选型 |
| Writing-Plans | 复杂任务时 | 拆解为原子步骤、指定文件路径 |
| Plan-Eng-Review | 架构决策时 | 检查循环依赖、N+1 问题 |
| Parallel-Agents | 多个独立子任务 | 并行处理、汇总验证 |

### 第二阶段：Quality & Safety（质量与安全）

| 技能 | 触发条件 | 行为要求 |
|------|----------|----------|
| TDD | 写业务代码前 | Red → Green → Refactor |
| Investigate | 遇到 Bug 时 | 复现 → 隔离 → 根因 → 修复 |
| Safety Guards | 危险操作时 | 执行前确认风险 |

**危险操作清单**：`rm -rf`、`git push --force`、`DROP TABLE`、生产配置修改

### 第三阶段：Verification（强制验证）

任务完成前必须提供：
- [ ] 测试通过日志
- [ ] 代码编译/构建成功
- [ ] 修改文件清单

### 第四阶段：Ship & Reflect（交付与复盘）

| 技能 | 触发条件 | 行为要求 |
|------|----------|----------|
| Create-PR | 功能完成后 | 规范 PR 描述 |
| Document-Release | 发布后 | 更新 CHANGELOG |
| Retro | 每周 | 分析提交记录、改进点 |

---

## 二、代码规范

### 后端规范

| 规范 | 说明 |
|------|------|
| SQL IN 子句 | 使用 `bindparam(expanding=True)` |
| 密码存储 | bcrypt 哈希 |
| 敏感字段 | 加密存储（id_card, mobile, bank_card） |
| 数据范围 | 列表接口支持 `actor_org_id` 过滤 |
| 错误响应 | 统一 `{ code, message [, details] }` |
| 分页 | 使用 `page`、`pageSize`，上限 100 |

### 前端规范

| 规范 | 说明 |
|------|------|
| TypeScript | 严格模式 |
| 组件 | named export |
| API 调用 | 统一走 `lib/api.ts` |
| 表单 | React Hook Form |
| 样式 | Tailwind CSS，避免内联 |

### Git 提交规范

```
格式: [范围] 描述

示例:
- 后端: 合同发起增加校验
- 前端: 修复登录页面样式
- 文档: 更新部署说明
```

---

## 三、接口规范

### RESTful 设计

| 操作 | 方法 | 路径示例 |
|------|------|----------|
| 查询列表 | GET | `/api/person/archive` |
| 查询详情 | GET | `/api/person/archive/:id` |
| 创建 | POST | `/api/person/archive` |
| 更新 | PUT | `/api/person/archive/:id` |
| 删除 | DELETE | `/api/person/archive/:id` |

### 响应格式

```json
// 成功
{ "data": {} }
{ "list": [], "total": 100 }

// 失败
{ "code": "ERROR_CODE", "message": "错误描述" }
```

---

## 四、数据库规范

### 表命名
- 小写 + 下划线，如 `contract_instance`
- 复数形式，如 `users`、`contracts`

### 字段命名
- 小写 + 下划线
- 时间字段: `created_at`、`updated_at`

### Schema 文件
- SQLite: `database/sqlite_schema.sql`
- PostgreSQL: `server/scripts/postgres_schema.sql`
- **两个文件必须保持同步**

---

## 五、安全规范

| 类型 | 规范 |
|------|------|
| 认证 | JWT Token 设置过期时间，敏感操作二次验证 |
| 数据 | 密码加密存储，敏感信息脱敏展示 |
| SQL | 参数化查询，防止注入 |
| 文件 | 上传类型白名单，大小限制 |

---

## 六、常用命令

```bash
# 开发
npm run dev              # 启动开发环境
npm run dev:api          # 仅后端
npm run dev:web          # 仅前端

# 测试
npm run test             # 后端测试
npm run test:e2e         # E2E 测试
cd web && npx tsc --noEmit  # 类型检查

# 构建
npm run build            # 前端构建

# 数据库
npm run seed             # 初始化数据
```
