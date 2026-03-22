## Digital-Labor（dtcloud + PostgreSQL）后端

本目录用于把现有 `server/`（Node/Express/SQLite）后端迁移为 **dtcloud（Python）+ PostgreSQL**，并保持 `/api/*` 接口完全兼容。

### 目录结构

- `digital_labor/`：后端业务代码（配置、DB、鉴权、controller、services）
- `scripts/`：数据迁移/兼容检查脚本

### 本地启动（开发）

**1) 安装依赖**

若安装完整 `requirements.txt` 时 dtcloud 拉取失败，可直接用仅 FastAPI 依赖：

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements-fastapi.txt
```

或（含 dtcloud）：`pip install -r requirements.txt`

**2) 环境变量**

复制 `.env.example` 为 `.env`，按需修改：

- `PORT`：服务端口，默认 3000
- `DATABASE_URL`：PostgreSQL 连接串，例如 `postgresql+psycopg://postgres:postgres@localhost:5432/digital_labor`
- `JWT_SECRET`、`TOKEN_VERSION`、`ENCRYPTION_KEY`：与旧后端一致以便兼容

**3) 启动**

```bash
python -m digital_labor.run
```

默认监听 `0.0.0.0:PORT`。数据库不可达时，连接会在约 5 秒内超时并返回 503，不会长时间挂起。

### 接口兼容检查（仅新后端）

在新后端已启动的前提下（API 默认 `http://localhost:3000`）：

```bash
python scripts/compat_check.py --new http://localhost:3000 --new-only
```

通过则输出：`[OK] health`、`[OK] api_root`、`[OK] login_admin`、`[OK] feature_status`。若数据库未启动，`login_admin` 会得到 503 而非超时。

### 约定

- `/api/health`：返回 `{ ok: true }`
- `/api`：返回 `{ name, api, docs }`
- 统一错误体：`{ code, message, details? }`，503 对应 `SERVICE_UNAVAILABLE`
- JWT：`Authorization: Bearer <token>`，并兼容 `X-Token-Refresh`

