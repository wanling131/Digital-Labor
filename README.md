# Digital Labor

Digital Labor 管理平台，**前后端分离**架构，便于独立开发、构建与部署。

---

## 项目结构

```
digital-labor/
├── web/                        # 前端（Next.js 16 App Router）
│   ├── app/                    # 页面与布局：/、/pc/*、/h5/*
│   ├── components/             # UI 与业务组件
│   ├── lib/                    # 工具与 API 封装
│   ├── next.config.mjs
│   └── package.json
│
├── backend_dtcloud/             # 后端（Python 3.8 + FastAPI 兼容层 + dtcloud 路由层 + PostgreSQL）
│   ├── digital_labor/           # 应用代码（controllers/services/settings/db 等）
│   ├── scripts/                 # 兼容检查等脚本
│   ├── requirements.txt         # 含 dtcloud 依赖
│   ├── requirements-fastapi.txt # 仅 FastAPI 依赖（dtcloud 安装失败时可用）
│   └── README.md
│
├── server/                     # 旧后端（Node/Express/SQLite，仅用于对照/归档）
│   ├── routes/
│   ├── db/
│   ├── middleware/
│   ├── lib/
│   ├── docs/                   # 接口文档 API.md
│   ├── app.js
│   ├── server.js
│   └── package.json
│
├── scripts/                    # 项目级脚本
│   ├── connectivity-test.mjs   # 前后端连通性测试
│   └── README.md
│
├── database/                   # PostgreSQL 临时建表/Excel 导入/种子数据脚本
│
├── docs/                       # 项目级文档
│   ├── 部署说明.md
│   ├── 开发规范.md
│   └── 环境变量示例.md
│
├── 功能点/                     # 需求与报价相关
├── 项目说明与架构.md           # 架构与功能总览
├── package.json                # 根脚本：dev、build、test、test:all
└── README.md                   # 本文件
```

- **前端**：Next.js，开发端口 3001，生产构建后由 Nginx/OSS 等托管。
- **后端**：仅提供 REST API（`/api/*`），默认端口 3000；主线后端为 **Python 3.8 + PostgreSQL**（兼容旧接口），旧 Node 后端仅对照/归档。

---

## 快速开始

### 1. 安装依赖（根 + 前端 + 后端）

```bash
npm run install:all
```

会依次安装：根目录、server（旧后端）、web（前端）、**backend_dtcloud（Python 后端）** 的依赖。

如需使用虚拟环境隔离 Python 依赖，可手动创建：

```bash
cd backend_dtcloud
python -m venv .venv
# Windows: .\.venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements-fastapi.txt
```

### 2. 启动开发环境

```bash
# 同时启动后端 + 前端
npm run dev
```

- 仅后端：`npm run dev:api` → API: http://localhost:3000  
- 仅前端：`npm run dev:web` → 前端: http://localhost:3001  
- 旧后端（对照）：`npm run dev:server:legacy`

### 3. 默认账号

- 管理端：**admin / 123456**（登录后进 `/pc/dashboard`）。历史版本曾使用 `admin123`，已做兼容（可用 `admin123` 或 `123456` 登录）。  
- 工人端：用工号 + 姓名登录（需先在管理端「人员档案」中录入）

---

## 常用脚本（根目录）

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动后端与前端（开发） |
| `npm run dev:api` | 仅启动后端 API（Python，3000） |
| `npm run dev:web` | 仅启动前端（3001） |
| `npm run build` / `npm run build:web` | 构建前端（Next.js 产出在 web/.next） |
| `npm run start` / `npm run start:api` | 生产模式启动后端（Python） |
| `npm run test` / `npm run test:server` | 新后端兼容检查（需先启动后端） |
| `npm run test:web` | 前端构建校验（next build） |
| `npm run test:connectivity` | 前后端连通性测试（需先启动后端，可选启动前端） |
| `npm run test:all` | 统一测试：先后端测试，再前端构建 |
| `npm run seed` | PostgreSQL 一键建表/导入 Excel/补种子数据（用于临时环境） |

旧后端脚本（对照/归档）：

- `npm run start:server:legacy`
- `npm run test:server:legacy`
- `npm run seed:legacy`

---

## 文档

| 文档 | 说明 |
|------|------|
| [项目说明与架构.md](项目说明与架构.md) | 系统架构、技术栈、功能总览、主流程 |
| [docs/部署说明.md](docs/部署说明.md) | 前后端分离、构建、生产部署、Nginx 示例 |
| [docs/开发规范.md](docs/开发规范.md) | 目录约定、后端/前端规范、接口文档位置 |
| [docs/环境变量示例.md](docs/环境变量示例.md) | PORT、JWT_SECRET 等环境变量说明 |
| [server/docs/API.md](server/docs/API.md) | 后端接口清单，供前端对接 |

---

## 部署要点

- **后端**：在 `backend_dtcloud` 目录 `python -m digital_labor.run`，通过环境变量配置 `PORT`、`JWT_SECRET`、`DATABASE_URL` 等（见 docs/环境变量示例.md）。
- **前端**：Next.js 默认构建产物为 `web/.next`，需用 Node 进程运行 `next start` 并由 Nginx 反代；如需纯静态部署，可配置 `output: 'export'` 生成 `web/out/` 再用 Nginx 托管。若与 API 同域，在 Nginx 中配置 `/api` 反向代理到后端。
- 详见 **docs/部署说明.md**。

---

## 技术栈

- 前端：Next.js 16、React 19、TypeScript、Tailwind CSS（PC 管理端 + H5 工人端共用一套工程）  
- 后端（主线）：Python 3.8、FastAPI（兼容层）、dtcloud（路由层）、PostgreSQL、JWT  
- 后端（legacy）：Node.js 18+、Express、SQLite（better-sqlite3）、JWT  
- 功能范围与实现进度见 **功能点/需求与实现对比.md**。
