from __future__ import annotations

import logging
import platform
import re
from typing import Any, Dict, List, Tuple

from sqlalchemy import text

from digital_labor.db import get_engine

logger = logging.getLogger(__name__)

# 允许查询的系统表白名单（防止意外查询敏感表）
ALLOWED_TABLE_PATTERN = re.compile(r'^[a-zA-Z_][a-zA-Z0-9_]*$')


def _is_valid_table_name(name: str) -> bool:
    """验证表名是否安全（只允许字母、数字、下划线）"""
    return bool(ALLOWED_TABLE_PATTERN.match(name))


def health() -> Tuple[Dict[str, Any], int]:
    engine = get_engine()
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1")).scalar()
        db_ok = True
    except Exception:  # noqa: BLE001
        db_ok = False
    status = "healthy" if db_ok else "unhealthy"
    return {"status": status, "checks": {"database": {"ok": db_ok}}}, (200 if db_ok else 503)


def database_stats() -> dict:
    engine = get_engine()
    if engine.dialect.name == "sqlite":
        with engine.connect() as conn:
            tables = conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
            ).mappings().all()
            stats: List[Dict[str, Any]] = []
            for t in tables:
                name = t["name"]
                if not _is_valid_table_name(name):
                    logger.warning("Skipping invalid table name: %s", name)
                    continue
                cnt = conn.execute(text(f'SELECT COUNT(*) FROM "{name}"')).scalar_one()
                stats.append({"name": name, "rowCount": int(cnt)})
            idx_cnt = conn.execute(text("SELECT COUNT(*) FROM sqlite_master WHERE type='index'")).scalar_one()
        return {"tables": stats, "indexCount": int(idx_cnt)}

    with engine.connect() as conn:
        tables = conn.execute(
            text(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema='public'
                ORDER BY table_name
                """
            )
        ).mappings().all()
        stats: List[Dict[str, Any]] = []
        for t in tables:
            name = t["table_name"]
            if not _is_valid_table_name(name):
                logger.warning("Skipping invalid table name: %s", name)
                continue
            cnt = conn.execute(text(f'SELECT COUNT(*) FROM "{name}"')).scalar_one()
            stats.append({"name": name, "rowCount": int(cnt)})
        idx_cnt = conn.execute(text("SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public'")).scalar_one()
    return {"tables": stats, "indexCount": int(idx_cnt)}


def system_info() -> dict:
    return {"platform": platform.system().lower(), "release": platform.release(), "pythonVersion": platform.python_version(), "uptime": None}

