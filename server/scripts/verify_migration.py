from __future__ import annotations

import argparse
import sqlite3
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from sqlalchemy import create_engine, text


@dataclass(frozen=True)
class TableCheck:
    table: str
    sqlite_count: int
    pg_count: int
    sqlite_min_id: Optional[int]
    sqlite_max_id: Optional[int]
    pg_min_id: Optional[int]
    pg_max_id: Optional[int]

    @property
    def ok(self) -> bool:
        return (
            self.sqlite_count == self.pg_count
            and self.sqlite_min_id == self.pg_min_id
            and self.sqlite_max_id == self.pg_max_id
        )


def _sqlite_scalar(conn: sqlite3.Connection, sql: str) -> Any:
    cur = conn.cursor()
    cur.execute(sql)
    row = cur.fetchone()
    return row[0] if row else None


def _pg_scalar(engine, sql: str) -> Any:  # noqa: ANN001
    with engine.connect() as conn:
        return conn.execute(text(sql)).scalar()


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify SQLite -> PostgreSQL migration completeness.")
    parser.add_argument("--sqlite", required=True, help="Path to SQLite db file, e.g. server/data/labor.db")
    parser.add_argument(
        "--postgres",
        required=True,
        help="SQLAlchemy URL, e.g. postgresql+psycopg://postgres:postgres@localhost:5432/digital_labor",
    )
    parser.add_argument(
        "--tables",
        default="",
        help="Comma-separated table names to check. If empty, auto-discover from SQLite (excluding sqlite_*).",
    )
    args = parser.parse_args()

    sqlite_path = args.sqlite
    pg_url = args.postgres
    engine = create_engine(pg_url, future=True)

    sconn = sqlite3.connect(sqlite_path)
    try:
        if args.tables.strip():
            tables = [t.strip() for t in args.tables.split(",") if t.strip()]
        else:
            rows = sconn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchall()
            tables = [r[0] for r in rows]

        checks: List[TableCheck] = []
        for t in tables:
            # 验证表名安全性，防止SQL注入
            if not t.replace('_', '').replace('-', '').isalnum():
                print(f"警告: 表名 '{t}' 包含不安全字符，跳过检查")
                continue
            
            # PostgreSQL 里 user 是关键字，这里允许用户传入带引号的表名
            t_sql = t
            s_count = int(_sqlite_scalar(sconn, f"SELECT COUNT(*) FROM {t_sql}") or 0)
            s_min = _sqlite_scalar(sconn, f"SELECT MIN(id) FROM {t_sql}") if s_count else None
            s_max = _sqlite_scalar(sconn, f"SELECT MAX(id) FROM {t_sql}") if s_count else None

            p_count = int(_pg_scalar(engine, f"SELECT COUNT(*) FROM {t_sql}") or 0)
            p_min = _pg_scalar(engine, f"SELECT MIN(id) FROM {t_sql}") if p_count else None
            p_max = _pg_scalar(engine, f"SELECT MAX(id) FROM {t_sql}") if p_count else None

            def _to_int_or_none(x: Any) -> Optional[int]:
                if x is None:
                    return None
                try:
                    return int(x)
                except Exception:  # noqa: BLE001
                    return None

            checks.append(
                TableCheck(
                    table=t,
                    sqlite_count=s_count,
                    pg_count=p_count,
                    sqlite_min_id=_to_int_or_none(s_min),
                    sqlite_max_id=_to_int_or_none(s_max),
                    pg_min_id=_to_int_or_none(p_min),
                    pg_max_id=_to_int_or_none(p_max),
                )
            )

        ok = True
        for c in checks:
            mark = "OK" if c.ok else "MISMATCH"
            print(
                f"{c.table:24} sqlite={c.sqlite_count:8} pg={c.pg_count:8} "
                f"id[min,max] sqlite=({c.sqlite_min_id},{c.sqlite_max_id}) pg=({c.pg_min_id},{c.pg_max_id}) -> {mark}"
            )
            if not c.ok:
                ok = False

        if not ok:
            raise SystemExit(2)
    finally:
        sconn.close()


if __name__ == "__main__":
    main()

