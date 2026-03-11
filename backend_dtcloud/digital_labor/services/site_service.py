from __future__ import annotations

from typing import Any, Dict, Optional

from sqlalchemy import text

from digital_labor.db import get_engine


def leave(person_id: int) -> dict:
    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(text("UPDATE person SET on_site = 0, updated_at = CURRENT_TIMESTAMP WHERE id = :id"), {"id": person_id})
    return {"ok": True}


def board() -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT p.org_id, o.name as org_name,
                       SUM(CASE WHEN p.status = '已进场' THEN 1 ELSE 0 END) as expected,
                       SUM(CASE WHEN p.on_site = 1 THEN 1 ELSE 0 END) as count
                FROM person p
                LEFT JOIN org o ON p.org_id=o.id
                WHERE p.status='已进场' OR p.on_site=1
                GROUP BY p.org_id, o.name
                """
            )
        ).mappings().all()
    total = sum(int(r["count"] or 0) for r in rows)
    total_expected = sum(int(r["expected"] or 0) for r in rows)
    return {
        "projects": [{"org_id": r["org_id"], "org_name": r["org_name"], "expected": int(r["expected"] or 0), "count": int(r["count"] or 0)} for r in rows],
        "total": total,
        "total_expected": total_expected,
    }


def equipment_list(*, filters: Dict[str, Any], limit: int, offset: int) -> dict:
    org_id = filters.get("org_id")
    status = filters.get("status")
    where = []
    params: Dict[str, Any] = {"limit": limit, "offset": offset}
    if org_id:
        where.append("e.org_id = :oid")
        params["oid"] = int(org_id)
    if status:
        where.append("e.status = :status")
        params["status"] = status
    where_sql = (" WHERE " + " AND ".join(where)) if where else ""
    engine = get_engine()
    with engine.connect() as conn:
        total = conn.execute(text(f"SELECT COUNT(*) FROM equipment e{where_sql}"), params).scalar_one()
        rows = conn.execute(
            text(
                f"""
                SELECT e.*, o.name as org_name
                FROM equipment e LEFT JOIN org o ON e.org_id=o.id
                {where_sql}
                ORDER BY e.updated_at DESC, e.id DESC
                LIMIT :limit OFFSET :offset
                """
            ),
            params,
        ).mappings().all()
    return {"list": [dict(r) for r in rows], "total": int(total)}


def equipment_create(body: Dict[str, Any]) -> int:
    name = (body.get("name") or "").strip()
    if not name:
        raise ValueError("name 必填")
    engine = get_engine()
    with engine.begin() as conn:
        r = conn.execute(
            text(
                "INSERT INTO equipment (org_id, name, code, status, updated_at) VALUES (:oid, :n, :c, :s, CURRENT_TIMESTAMP) RETURNING id"
            ),
            {"oid": body.get("org_id"), "n": name, "c": body.get("code"), "s": body.get("status") or "正常"},
        ).mappings().first()
    return int(r["id"])


def equipment_update(equipment_id: int, patch: Dict[str, Any]) -> bool:
    engine = get_engine()
    with engine.connect() as conn:
        exists = conn.execute(text("SELECT id FROM equipment WHERE id = :id"), {"id": equipment_id}).first()
    if not exists:
        return False
    updates = ["updated_at = CURRENT_TIMESTAMP"]
    params: Dict[str, Any] = {"id": equipment_id}
    for k in ("name", "code", "status"):
        if k in patch:
            updates.append(f"{k} = :{k}")
            params[k] = patch.get(k)
    if len(params.keys()) == 1:
        raise ValueError("无有效字段")
    with engine.begin() as conn:
        conn.execute(text(f"UPDATE equipment SET {', '.join(updates)} WHERE id = :id"), params)
    return True


def equipment_delete(equipment_id: int) -> bool:
    engine = get_engine()
    with engine.connect() as conn:
        exists = conn.execute(text("SELECT id FROM equipment WHERE id = :id"), {"id": equipment_id}).first()
    if not exists:
        return False
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM equipment WHERE id = :id"), {"id": equipment_id})
    return True


def site_log_list(*, filters: Dict[str, Any], limit: int, offset: int) -> dict:
    org_id = filters.get("org_id")
    log_type = filters.get("log_type")
    where = []
    params: Dict[str, Any] = {"limit": limit, "offset": offset}
    if org_id:
        where.append("s.org_id = :oid")
        params["oid"] = int(org_id)
    if log_type:
        where.append("s.log_type = :lt")
        params["lt"] = log_type
    where_sql = (" WHERE " + " AND ".join(where)) if where else ""
    engine = get_engine()
    with engine.connect() as conn:
        total = conn.execute(text(f"SELECT COUNT(*) FROM site_log s{where_sql}"), params).scalar_one()
        rows = conn.execute(
            text(
                f"""
                SELECT s.*, o.name as org_name, u.name as user_name
                FROM site_log s
                LEFT JOIN org o ON s.org_id=o.id
                LEFT JOIN "user" u ON s.user_id=u.id
                {where_sql}
                ORDER BY s.created_at DESC
                LIMIT :limit OFFSET :offset
                """
            ),
            params,
        ).mappings().all()
    return {"list": [dict(r) for r in rows], "total": int(total)}


def site_log_create(*, user_id: Optional[int], body: Dict[str, Any]) -> int:
    log_type = (body.get("log_type") or "").strip()
    if not log_type:
        raise ValueError("log_type 必填")
    engine = get_engine()
    with engine.begin() as conn:
        r = conn.execute(
            text("INSERT INTO site_log (org_id, user_id, log_type, content) VALUES (:oid, :uid, :t, :c) RETURNING id"),
            {"oid": body.get("org_id"), "uid": user_id, "t": log_type, "c": body.get("content")},
        ).mappings().first()
    return int(r["id"])

