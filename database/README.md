## PostgreSQL 临时建表 + Excel 导入

本目录用于在 **PostgreSQL** 中快速建表、导入 Excel 数据，并按需补充虚拟数据，方便在没有主开发机的环境下临时准备一套可用数据库。

### 前置条件

- 已安装并启动 PostgreSQL，且已创建目标数据库（例如 `digital_labor`）。
- 已在仓库根目录或 `backend_dtcloud/` 下配置好 `.env`，其中包含：
  - `DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/digital_labor`
- （可选）将以下 Excel 放到 `docs/` 目录：
  - `docs/实名制信息数据.xls`（或 `.xlsx`）——实名制人员信息
  - `docs/【2026年2月】工人考勤统计表--20260202154026.xls`
  - `docs/【2026年2月】工人考勤统计表--20260202154059.xls`

目前脚本支持 `.xls` 与 `.xlsx`，依赖 `xlrd` 与 `openpyxl`。

### 一键建表 + 导入（可选补充虚拟数据）

在项目根目录执行：

```bash
cd database

# Windows PowerShell 示例（DATABASE_URL 也可以在 .env 中配置）
$env:DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/digital_labor"
python init_and_import.py --with-seed
```

脚本行为：

1. 执行 `backend_dtcloud/scripts/postgres_schema.sql`，在 PostgreSQL 中创建所有表与索引。
2. 确保存在默认 admin 用户：`username=admin, password_hash=123456`。
3. 若存在 `docs/实名制信息数据.xls`（或 `.xlsx`），解析并导入到 `person` 表。
4. 若存在两份工人考勤 Excel，则解析并导入到 `attendance` 表（按姓名/工号匹配 `person`）。
5. 若指定 `--with-seed`，或当前表数据量过少，则补充虚拟数据（组织、用户、人员、考勤等），方便前端联调演示。

### 参数说明

```bash
python init_and_import.py [--database-url URL] [--docs-dir PATH] [--with-seed]
```

- `--database-url`：覆盖 `DATABASE_URL` 环境变量/配置。
- `--docs-dir`：Excel 所在目录，默认 `../docs`。
- `--with-seed`：在导入完成后自动补充虚拟数据（如数据本身已经足够，可省略）。

