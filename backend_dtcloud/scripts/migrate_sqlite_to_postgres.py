from __future__ import annotations

import argparse
import datetime as dt
import os
import sqlite3
from pathlib import Path
from typing import Any, Dict, Iterable, List

from sqlalchemy import create_engine, text


def _parse_date(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (dt.date, dt.datetime)):
        return value
    s = str(value).strip()
    if not s:
        return None
    # 兼容：YYYY-MM-DD 或 YYYY/MM/DD
    s2 = s.replace("/", "-")
    try:
        return dt.date.fromisoformat(s2[:10])
    except Exception:  # noqa: BLE001
        return s


def _parse_ts(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, dt.datetime):
        return value
    s = str(value).strip()
    if not s:
        return None
    s2 = s.replace("/", "-").replace("T", " ")
    # SQLite datetime('now') 形如：YYYY-MM-DD HH:MM:SS
    try:
        return dt.datetime.fromisoformat(s2)
    except Exception:  # noqa: BLE001
        try:
            return dt.datetime.fromisoformat(s2[:19])
        except Exception:  # noqa: BLE001
            return s


def _coerce_row(table: str, row: Dict[str, Any]) -> Dict[str, Any]:
    r = dict(row)

    # 只在“类型更严格”的 PG 字段上做轻量转换；其余保持原值，避免破坏兼容性。
    if table in {"attendance"}:
        r["work_date"] = _parse_date(r.get("work_date"))
        r["created_at"] = _parse_ts(r.get("created_at"))
    elif table in {"contract_instance"}:
        r["deadline"] = _parse_date(r.get("deadline"))
        r["signed_at"] = _parse_ts(r.get("signed_at"))
        r["created_at"] = _parse_ts(r.get("created_at"))
    elif table in {"settlement"}:
        r["period_start"] = _parse_date(r.get("period_start"))
        r["period_end"] = _parse_date(r.get("period_end"))
        r["created_at"] = _parse_ts(r.get("created_at"))
        r["updated_at"] = _parse_ts(r.get("updated_at"))
        r["confirm_at"] = _parse_ts(r.get("confirm_at"))
    elif table in {"notification"}:
        r["read_at"] = _parse_ts(r.get("read_at"))
        r["created_at"] = _parse_ts(r.get("created_at"))
    elif table in {"person_certificate"}:
        r["issue_date"] = _parse_date(r.get("issue_date"))
        r["expiry_date"] = _parse_date(r.get("expiry_date"))
        r["created_at"] = _parse_ts(r.get("created_at"))
    elif table in {"clock_log"}:
        r["punch_at"] = _parse_ts(r.get("punch_at"))
        r["created_at"] = _parse_ts(r.get("created_at"))
    elif table in {"person"}:
        r["created_at"] = _parse_ts(r.get("created_at"))
        r["updated_at"] = _parse_ts(r.get("updated_at"))
        r["face_verified_at"] = _parse_ts(r.get("face_verified_at"))
    elif table in {"org", "op_log", "equipment", "site_log", "contract_template", "template_variable", "role_menu"}:
        # created/updated_at 兼容转换（存在才转）
        if "created_at" in r:
            r["created_at"] = _parse_ts(r.get("created_at"))
        if "updated_at" in r:
            r["updated_at"] = _parse_ts(r.get("updated_at"))

    return r


def _chunked(items: List[Dict[str, Any]], chunk_size: int) -> Iterable[List[Dict[str, Any]]]:
    for i in range(0, len(items), chunk_size):
        yield items[i : i + chunk_size]


def apply_schema(pg_engine, schema_sql_path: Path) -> None:
    sql = schema_sql_path.read_text(encoding="utf-8")
    with pg_engine.begin() as conn:
        conn.execute(text(sql))


def truncate_tables(pg_engine, tables: List[str]) -> None:
    # 迁移是“全量覆盖”场景时使用，避免重复插入。
    # 依赖关系由调用方保证（从子表到父表或使用 CASCADE）。
    quoted = []
    for t in tables:
        quoted.append('"user"' if t == "user" else f'"{t}"')
    with pg_engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE " + ", ".join(quoted) + " RESTART IDENTITY CASCADE"))


def migrate_table(sqlite_conn: sqlite3.Connection, pg_engine, table: str, *, chunk_size: int = 1000) -> None:
    sqlite_conn.row_factory = sqlite3.Row
    rows = sqlite_conn.execute(f"SELECT * FROM {table}").fetchall()
    data = [_coerce_row(table, dict(r)) for r in rows]

    if not data:
        return

    cols = list(data[0].keys())
    col_list = ", ".join([f"\"{c}\"" for c in cols])

    # user 为保留字：PostgreSQL 侧表名为 "user"
    pg_table = "\"user\"" if table == "user" else f"\"{table}\""
    placeholders = ", ".join([f":{c}" for c in cols])
    stmt = text(f"INSERT INTO {pg_table} ({col_list}) VALUES ({placeholders})")

    with pg_engine.begin() as conn:
        for chunk in _chunked(data, chunk_size):
            conn.execute(stmt, chunk)


def set_identity_sequences(pg_engine, table: str) -> None:
    if table in {"role_menu", "role_permission"}:
        return
    pg_table = "\"user\"" if table == "user" else f"\"{table}\""
    with pg_engine.begin() as conn:
        conn.execute(
            text(
                f"""
                SELECT setval(
                  pg_get_serial_sequence('{pg_table}', 'id'),
                  COALESCE((SELECT MAX(id) FROM {pg_table}), 1),
                  true
                )
                """
            )
        )


def count_rows_sqlite(sqlite_conn: sqlite3.Connection, table: str) -> int:
    return int(sqlite_conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0])


def count_rows_pg(pg_engine, table: str) -> int:
    pg_table = "\"user\"" if table == "user" else f"\"{table}\""
    with pg_engine.connect() as conn:
        return int(conn.execute(text(f"SELECT COUNT(*) FROM {pg_table}")).scalar_one())


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate Digital-Labor SQLite data to PostgreSQL.")
    parser.add_argument(
        "--sqlite",
        default=str(
            Path(__file__).resolve().parents[2] / "server" / "data" / "labor.db"
        ),
        help="Path to SQLite labor.db",
    )
    parser.add_argument(
        "--schema-sql",
        default=str(Path(__file__).with_name("postgres_schema.sql")),
        help="Path to postgres schema SQL file",
    )
    parser.add_argument(
        "--database-url",
        default=os.getenv("DATABASE_URL", ""),
        help="SQLAlchemy DATABASE_URL (e.g. postgresql+psycopg://user:pass@host:5432/db)",
    )
    parser.add_argument("--chunk-size", type=int, default=1000)
    parser.add_argument(
        "--truncate",
        action="store_true",
        help="Truncate destination tables before migrating (recommended for re-run).",
    )
    args = parser.parse_args()

    if not args.database_url:
        raise SystemExit("DATABASE_URL is required (env or --database-url).")

    sqlite_path = Path(args.sqlite).resolve()
    if not sqlite_path.exists():
        raise SystemExit(f"SQLite file not found: {sqlite_path}")

    schema_sql_path = Path(args.schema_sql).resolve()
    if not schema_sql_path.exists():
        raise SystemExit(f"Schema SQL not found: {schema_sql_path}")

    pg_engine = create_engine(args.database_url, future=True)

    # 1) schema
    apply_schema(pg_engine, schema_sql_path)

    # 2) migrate（按依赖顺序）
    tables_in_order = [
        "org",
        "user",
        "person",
        "person_certificate",
        "attendance",
        "clock_log",
        "contract_template",
        "template_variable",
        "contract_instance",
        "settlement",
        "notification",
        "role_menu",
        # role_permission：Node 端 SQLite 未创建，默认无数据；此处不从 SQLite 迁移
        "op_log",
        "equipment",
        "site_log",
    ]

    if args.truncate:
        # 先按依赖反向截断（避免 FK 约束问题），再开始迁移
        truncate_tables(pg_engine, list(reversed(tables_in_order)))

    sqlite_conn = sqlite3.connect(str(sqlite_path))
    try:
        for t in tables_in_order:
            migrate_table(sqlite_conn, pg_engine, t, chunk_size=args.chunk_size)
            set_identity_sequences(pg_engine, t)
    finally:
        sqlite_conn.close()

    # 3) validate
    sqlite_conn = sqlite3.connect(str(sqlite_path))
    try:
        bad = []
        for t in tables_in_order:
            s_cnt = count_rows_sqlite(sqlite_conn, t)
            p_cnt = count_rows_pg(pg_engine, t)
            if s_cnt != p_cnt:
                bad.append((t, s_cnt, p_cnt))
        if bad:
            lines = ["Row count mismatch:"]
            for t, s, p in bad:
                lines.append(f"- {t}: sqlite={s}, pg={p}")
            raise SystemExit("\n".join(lines))
        print("OK: migrated all tables and validated row counts.")
    finally:
        sqlite_conn.close()


if __name__ == "__main__":
    main()

