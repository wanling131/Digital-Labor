# Digital Labor - 开发规范与工作流

## 项目概述

Digital Labor 是一个数字劳务管理平台，采用前后端分离架构：
- **后端**: Python FastAPI + SQLAlchemy
- **前端**: Next.js 16 + React + TypeScript
- **数据库**: SQLite (演示) / PostgreSQL (生产)

---

## 第一阶段：Think & Plan（构思与规划）

### Brainstorming (头脑风暴)
**触发条件**: 当需求描述模糊时
**行为要求**:
- 扮演"苏格拉底式"提问者，探索需求边界
- 对比技术选型（如 JWT vs Session）
- 确认设计方向后再动手

### Writing-Plans (编写计划)
**触发条件**: 处理复杂任务时
**行为要求**:
- 将大任务拆解为原子级步骤
- 指定具体文件路径和变更内容
- 确保逻辑严密，无遗漏环节

### Plan-Eng-Review (架构审查)
**触发条件**: 进行架构决策时
**行为要求**:
- 检查循环依赖风险
- 分析 N+1 查询问题
- 评估边界情况处理

### Dispatching-Parallel-Agents (并行调度)
**触发条件**: 存在多个独立子任务时
**行为要求**:
- 利用并行 Agent 处理不同模块
- 前端与后端可并行开发
- 汇总结果后统一验证

---

## 第二阶段：Quality & Safety（质量与安全）

### Test-Driven-Development (TDD)
**触发条件**: 写任何业务代码前强制触发
**行为要求**:
1. **Red**: 先写失败的测试用例
2. **Green**: 写最少代码使测试通过
3. **Refactor**: 重构代码，确保测试仍通过

```
工作流:
1. 编写测试 → 2. 运行测试(失败) → 3. 编写代码 → 4. 运行测试(通过) → 5. 重构
```

### Investigate (根因分析)
**触发条件**: 遇到 Bug 或报错时
**行为要求** - 四阶段深度分析:
1. **复现**: 确认问题可稳定复现
2. **隔离**: 缩小问题范围（模块/函数/行）
3. **根因**: 分析根本原因，而非表面症状
4. **修复**: 针对性修复，防止"改A坏B"

```
禁止行为: 盲目试错、随机修改代码
必须行为: 先分析日志、堆栈跟踪、数据流
```

### Safety Guards (安全保护)
**危险操作拦截清单**:
- `rm -rf` / `DEL /S` 删除命令
- `git push --force` 强制推送
- `DROP TABLE` / `TRUNCATE` 数据库操作
- 生产环境配置修改
- 大批量数据删除

**行为要求**: 执行前必须确认，说明风险和影响范围

---

## 第三阶段：Verification（强制验证）

### Verification-Before-Completion (强制验证)
**地位**: 流程中的强制高亮项
**行为要求**: 在声称"任务完成"前，必须提供：
- [ ] 测试通过日志
- [ ] 代码编译/构建成功
- [ ] 关键功能验证截图或日志
- [ ] 修改文件清单

```
禁止行为: 凭空宣布完工
必须行为: 提供明确的验证证据
```

### Frontend-Code-Review (前端审查)
**触发条件**: 修改前端代码后
**检查项**:
- [ ] TypeScript 类型完整性
- [ ] 无 console.log 残留
- [ ] 组件可访问性 (a11y)
- [ ] 无不必要的重渲染
- [ ] ESLint 无错误

### Receiving-Code-Review (模拟评审)
**触发条件**: 完成功能开发后
**行为要求**:
- 列出本次修改的文件和影响范围
- 自我审查代码质量
- 标注潜在风险点
- 提供测试建议

---

## 第四阶段：Ship & Reflect（交付与复盘）

### Create-PR (强制)
**触发条件**: 功能开发完成后
**行为要求**:
- 生成规范的 PR 描述
- 检查提交信息格式
- 确保符合合并规范

### Document-Release (文档更新)
**触发条件**: 发布新版本后
**行为要求**:
- 更新 CHANGELOG.md
- 更新 README.md (如有必要)
- 记录 API 变更

### Retro (持续改进)
**触发条件**: 每周或重大功能完成后
**行为要求**:
- 分析提交记录
- 评估代码质量趋势
- 记录改进点

---

## 项目特定规范

### 后端规范
- 使用 `bindparam(expanding=True)` 处理 SQL IN 子句
- 密码使用 bcrypt 哈希
- 敏感字段加密存储 (id_card, mobile, bank_card)
- 所有列表接口支持 `actor_org_id` 数据范围过滤

### 前端规范
- 使用 TypeScript 严格模式
- 组件使用 named export
- API 调用统一走 `lib/api.ts`
- 表单使用 React Hook Form

### 数据库规范
- SQLite schema 位于 `database/sqlite_schema.sql`
- PostgreSQL schema 位于 `server/scripts/postgres_schema.sql`
- 两个 schema 必须保持同步

---

## 常用命令

```bash
# 后端测试
cd server && python -m pytest tests/ -v

# 前端测试
cd web && npm run test

# E2E 测试
npm run test:e2e

# 类型检查
cd web && npx tsc --noEmit

# Python 编译检查
cd server && python -m py_compile digital_labor/**/*.py
```
