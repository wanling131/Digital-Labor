from __future__ import annotations

import argparse
import os
from pathlib import Path

from sqlalchemy import text

try:
    # 以包方式运行：python -m database.init_and_import
    from .common import get_database_url, get_engine
    from .import_attendance import import_attendance_from_file
    from .import_person import import_persons
    from .seed_data import seed_minimal
except ImportError:
    # 以脚本方式运行：cd database && python init_and_import.py
    from common import get_database_url, get_engine
    from import_attendance import import_attendance_from_file
    from import_person import import_persons
    from seed_data import seed_minimal


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DOCS_DIR = ROOT / "docs"
POSTGRES_SCHEMA_PATH = ROOT / "backend_dtcloud" / "scripts" / "postgres_schema.sql"
SQLITE_SCHEMA_PATH = ROOT / "database" / "sqlite_schema.sql"


def _is_sqlite_url(url: str) -> bool:
    return url.strip().lower().startswith("sqlite:")


def _apply_postgres_schema(database_url: str) -> None:
    if not POSTGRES_SCHEMA_PATH.is_file():
        raise SystemExit(f"postgres_schema.sql 不存在：{POSTGRES_SCHEMA_PATH}")

    sql = POSTGRES_SCHEMA_PATH.read_text(encoding="utf-8")
    engine = get_engine(database_url)
    raw = engine.raw_connection()
    try:
        cur = raw.cursor()
        cur.execute(sql)
        raw.commit()
    finally:
        raw.close()


def _apply_sqlite_schema(database_url: str) -> None:
    if not SQLITE_SCHEMA_PATH.is_file():
        raise SystemExit(f"sqlite_schema.sql 不存在：{SQLITE_SCHEMA_PATH}")

    sql = SQLITE_SCHEMA_PATH.read_text(encoding="utf-8")
    engine = get_engine(database_url)
    raw = engine.raw_connection()
    try:
        cur = raw.cursor()
        cur.executescript(sql)
        raw.commit()
    finally:
        raw.close()


def _ensure_admin_user(database_url: str) -> None:
    engine = get_engine(database_url)
    with engine.begin() as conn:
        if _is_sqlite_url(database_url):
            conn.execute(
                text(
                    """
                    INSERT INTO "user" (username, password_hash, name, role, enabled)
                    VALUES ('admin', '123456', '管理员', 'admin', 1)
                    ON CONFLICT(username) DO NOTHING
                    """
                )
            )
        else:
            conn.execute(
                text(
                    """
                    INSERT INTO "user" (username, password_hash, name, role, enabled)
                    VALUES ('admin', '123456', '管理员', 'admin', 1)
                    ON CONFLICT (username) DO NOTHING
                    """
                )
            )


def main() -> None:
    parser = argparse.ArgumentParser(description="Init schema (PostgreSQL/SQLite) and import Excel data.")
    parser.add_argument(
        "--database-url",
        default="",
        help="Override DATABASE_URL (fallback to env or backend_dtcloud settings).",
    )
    parser.add_argument(
        "--docs-dir",
        default=str(DEFAULT_DOCS_DIR),
        help="Directory where Excel files are located (default: ../docs).",
    )
    parser.add_argument(
        "--with-seed",
        action="store_true",
        help="After import, seed minimal demo data if tables are nearly empty.",
    )
    args = parser.parse_args()

    url = get_database_url(args.database_url or None)

    print("[init] 使用 DATABASE_URL =", url)
    if _is_sqlite_url(url):
        print("[init] 1) 应用 SQLite 表结构 ...")
        _apply_sqlite_schema(url)
    else:
        print("[init] 1) 应用 PostgreSQL 表结构 ...")
        _apply_postgres_schema(url)
    print("[init] 2) 确保 admin 用户存在 ...")
    _ensure_admin_user(url)

    docs_dir = Path(args.docs_dir)
    engine = get_engine(url)

    # 3) 导入实名制人员
    person_excel = None
    for name in ("实名制信息数据.xlsx", "实名制信息数据.xls"):
        candidate = docs_dir / name
        if candidate.is_file():
            person_excel = candidate
            break

    if person_excel:
        print(f"[init] 3) 导入实名制人员：{person_excel}")
        import_persons(engine, str(person_excel))
    else:
        print("[init] 3) 未找到实名制 Excel（实名制信息数据.xlsx/.xls），跳过人员导入")

    # 4) 导入两份考勤表
    attendance_files = []
    for name in (
        "【2026年2月】工人考勤统计表--20260202154026.xlsx",
        "【2026年2月】工人考勤统计表--20260202154026.xls",
        "【2026年2月】工人考勤统计表--20260202154059.xlsx",
        "【2026年2月】工人考勤统计表--20260202154059.xls",
    ):
        p = docs_dir / name
        if p.is_file():
            attendance_files.append(p)

    if attendance_files:
        print("[init] 4) 导入考勤数据 ...")
        for p in attendance_files:
            print(f"       - {p}")
            import_attendance_from_file(engine, str(p))
    else:
        print("[init] 4) 未找到考勤 Excel，跳过考勤导入")

    # 5) 按需补充虚拟数据
    if args.with_seed:
        print("[init] 5) 补充最小虚拟数据 ...")
        seed_minimal(engine)
    else:
        print("[init] 5) 未指定 --with-seed，跳过虚拟数据步骤")

    print("[init] 完成")


if __name__ == "__main__":
    main()

