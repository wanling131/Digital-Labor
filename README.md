# Digital Labor

数字劳务管理平台，**前后端分离**架构。

---

## 一、快速开始

### 1. 环境要求

| 组件 | 版本 | 必需 |
|------|------|:----:|
| Node.js | ≥ 18 | ✅ |
| Python | 3.8+ | ✅ |
| PostgreSQL | 12+ | ⭕ 生产推荐 |

### 2. 安装与启动

```bash
# 安装依赖
npm run install:all

# 启动开发环境
npm run dev
```

- 前端: http://localhost:3002
- 后端: http://localhost:3000

### 3. 默认账号

| 端 | 账号 | 密码 |
|----|------|------|
| 管理端 | admin | 123456 |
| 工人端 | 工号 + 姓名 | - |

---

## 二、系统架构

```
┌─────────────────────────────────────────────────────┐
│                    浏览器                            │
│    ┌─────────────┐       ┌─────────────┐            │
│    │  PC 管理端   │       │  H5 工人端   │            │
│    └──────┬──────┘       └──────┬──────┘            │
└───────────┼─────────────────────┼───────────────────┘
            │ labor_token          │ labor_worker_token
            ▼                      ▼
┌─────────────────────────────────────────────────────┐
│              后端 API (:3000)                        │
│    ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│    │ 认证鉴权  │  │ 业务路由  │  │ 数据库层  │         │
│    └──────────┘  └──────────┘  └──────────┘         │
└─────────────────────────┬───────────────────────────┘
                          ▼
              ┌───────────────────────┐
              │  PostgreSQL / SQLite  │
              └───────────────────────┘
```

---

## 三、技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 16 + React 19 + TypeScript + Tailwind CSS |
| 后端 | Python 3.8 + FastAPI + SQLAlchemy |
| 数据库 | PostgreSQL（生产）/ SQLite（开发） |
| 认证 | JWT + bcrypt |
| 第三方 | 阿里云人脸、e签宝（可选） |

---

## 四、目录结构

```
digital-labor/
├── web/                    # 前端（Next.js 16）
│   ├── app/                # 页面：/login、/pc/*、/h5/*
│   ├── components/         # UI 组件
│   └── lib/                # API 封装
│
├── server/                 # 后端（Python FastAPI）
│   ├── digital_labor/      # 应用代码
│   │   ├── controllers/    # API 控制器
│   │   ├── services/       # 业务逻辑
│   │   └── utils/          # 工具函数
│   ├── requirements-fastapi.txt
│   └── .env.example        # 环境变量模板
│
├── database/               # 数据库脚本
├── .claude/commands/       # 开发技能命令
└── docs/                   # 文档
```

---

## 五、常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发环境 |
| `npm run build` | 构建前端 |
| `npm run test` | 后端测试 |
| `npm run seed` | 初始化数据库 |

---

## 六、功能概览

### 管理端（PC）

| 模块 | 功能 |
|------|------|
| 人员档案 | 人员列表、新增、编辑、导入导出 |
| 状态管理 | 状态流转、批量变更 |
| 合同管理 | 模板、发起、签署、归档 |
| 考勤管理 | Excel 导入、工时报表 |
| 结算管理 | 生成、确认、薪资报表 |
| 系统管理 | 组织、用户、权限、日志 |

### 工人端（H5）

| 模块 | 功能 |
|------|------|
| 我的合同 | 待签列表、签署、已签查阅 |
| 我的考勤 | 日历视图、打卡 |
| 我的薪资 | 待确认、历史记录 |
| 个人中心 | 档案、证书、消息通知 |

---

## 七、环境变量

### 开发环境（最简配置）

```bash
# server/.env
DATABASE_URL=sqlite:///./database/demo.sqlite3
```

### 生产环境

```bash
# server/.env
ENV=production
DATABASE_URL=postgresql+psycopg://user:pass@host:5432/db
JWT_SECRET=<openssl rand -hex 32>
ENCRYPTION_KEY=<openssl rand -hex 32>
```

详见 [docs/部署指南.md](docs/部署指南.md)。

---

## 八、文档索引

| 文档 | 说明 |
|------|------|
| [CLAUDE.md](CLAUDE.md) | 开发规范与工作流 |
| [docs/部署指南.md](docs/部署指南.md) | 部署、环境变量、配置 |
| [docs/API.md](docs/API.md) | 接口文档 |
| [CHANGELOG.md](CHANGELOG.md) | 变更记录 |

---

## 九、最近更新

### 安全加固
- 密码 bcrypt 哈希存储
- 登录失败锁定（5次/5分钟）
- 敏感字段加密存储

### 性能优化
- 数据库索引优化（35+ SQLite, 39+ PostgreSQL）
- SQL IN 子句防注入

### 功能完善
- 权限数据范围过滤
- 操作审计增强
- 电子签接口预留
