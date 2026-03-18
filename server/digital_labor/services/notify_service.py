from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import text

from digital_labor.db import get_engine


def list_notifications(*, worker_id: int, limit: int, offset: int) -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        total = conn.execute(text("SELECT COUNT(*) FROM notification WHERE person_id = :id"), {"id": worker_id}).scalar_one()
        rows = conn.execute(
            text(
                """
                SELECT id, type, title, body, read_at, created_at
                FROM notification
                WHERE person_id = :id
                ORDER BY id DESC
                LIMIT :l OFFSET :o
                """
            ),
            {"id": worker_id, "l": limit, "o": offset},
        ).mappings().all()
    return {"list": [dict(r) for r in rows], "total": int(total)}


def mark_read(*, worker_id: int, notify_id: int) -> bool:
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT id FROM notification WHERE id = :nid AND person_id = :pid"),
            {"nid": notify_id, "pid": worker_id},
        ).first()
    if not row:
        return False
    with engine.begin() as conn:
        conn.execute(text("UPDATE notification SET read_at = CURRENT_TIMESTAMP WHERE id = :nid"), {"nid": notify_id})
    return True

