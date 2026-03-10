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
├── server/                     # 后端（Express + SQLite）
│   ├── routes/                 # API 路由
│   ├── db/                     # 数据库与表结构
│   ├── middleware/             # 鉴权、日志、错误处理
│   ├── lib/                    # 响应、常量、校验
│   ├── docs/                   # 接口文档 API.md
│   ├── app.js
│   ├── server.js
│   └── package.json
│
├── scripts/                    # 项目级脚本
│   ├── connectivity-test.mjs   # 前后端连通性测试
│   └── README.md
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
- **后端**：仅提供 REST API（`/api/*`），默认端口 3000；数据存 SQLite。

---

## 快速开始

### 1. 安装依赖

```bash
npm run install:all
```

（会依次安装根目录、server、web 的依赖；若暂无 web 目录，可只执行 `cd server && npm install`。）

### 2. 启动开发环境

```bash
# 同时启动后端 + 前端
npm run dev
```

- 仅后端：`npm run dev:server` → API: http://localhost:3000  
- 仅前端：`npm run dev:web` → 前端: http://localhost:3001  

### 3. 默认账号

- 管理端：**admin / 123456**（登录后进 `/pc/dashboard`）。历史版本曾使用 `admin123`，已做兼容（可用 `admin123` 或 `123456` 登录）。  
- 工人端：用工号 + 姓名登录（需先在管理端「人员档案」中录入）

---

## 常用脚本（根目录）

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动后端与前端（开发） |
| `npm run dev:server` | 仅启动后端 API（3000） |
| `npm run dev:web` | 仅启动前端（3001） |
| `npm run build` / `npm run build:web` | 构建前端（Next.js 产出在 web/.next） |
| `npm run start` / `npm run start:server` | 生产模式启动后端 |
| `npm run test` | 运行后端 API 单元测试 |
| `npm run test:server` | 同上（后端测试） |
| `npm run test:web` | 前端构建校验（next build） |
| `npm run test:connectivity` | 前后端连通性测试（需先启动后端，可选启动前端） |
| `npm run test:all` | 统一测试：先后端测试，再前端构建 |
| `npm run seed` | 导入虚拟数据（会清空并重写业务数据） |

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

- **后端**：在 server 目录 `npm run start` 或 `node server.js`，通过环境变量配置 `PORT`、`JWT_SECRET` 等（见 docs/环境变量示例.md）。
- **前端**：执行 `npm run build:web` 后，将 `web/dist` 部署到 Nginx 或静态托管；若与 API 同域，在 Nginx 中配置 `/api` 反向代理到后端。
- 详见 **docs/部署说明.md**。

---

## 技术栈

- 前端：Next.js 16、React 19、TypeScript、Tailwind CSS（PC 管理端 + H5 工人端共用一套工程）  
- 后端：Node.js 18+、Express、SQLite（better-sqlite3）、JWT  
- 功能范围与实现进度见 **功能点/需求与实现对比.md**。
