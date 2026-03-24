from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy import bindparam, text

from digital_labor.db import get_engine
from digital_labor.utils.permission import get_org_tree_ids


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


def equipment_list(*, filters: Dict[str, Any], limit: int, offset: int, actor_org_id: Optional[int] = None) -> dict:
    org_id = filters.get("org_id")
    status = filters.get("status")
    # 如果传入了actor_org_id，覆盖用户选择的org_id
    if actor_org_id is not None:
        org_id = actor_org_id
    where = []
    params: Dict[str, Any] = {"limit": limit, "offset": offset}
    bindparams_list: List[bindparam] = []
    if org_id:
        # 实现基于组织树的数据范围控制
        org_ids = get_org_tree_ids(int(org_id))
        if org_ids:
            where.append("e.org_id IN :_org_ids")
            params["_org_ids"] = org_ids
            bindparams_list.append(bindparam("_org_ids", expanding=True))
    if status:
        where.append("e.status = :status")
        params["status"] = status
    where_clause = " WHERE " + " AND ".join(where) if where else ""
    engine = get_engine()
    with engine.connect() as conn:
        total_query = text("SELECT COUNT(*) FROM equipment e" + where_clause)
        if bindparams_list:
            total_query = total_query.bindparams(*bindparams_list)
        total = conn.execute(total_query, params).scalar_one()
        rows_query = text(
            """
            SELECT e.*, o.name as org_name
            FROM equipment e LEFT JOIN org o ON e.org_id=o.id
            """
            + where_clause +
            " ORDER BY e.updated_at DESC, e.id DESC LIMIT :limit OFFSET :offset"
        )
        if bindparams_list:
            rows_query = rows_query.bindparams(*bindparams_list)
        rows = conn.execute(rows_query, params).mappings().all()
    return {"list": [dict(r) for r in rows], "total": int(total)}


def equipment_create(body: Dict[str, Any]) -> int:
    name = (body.get("name") or "").strip()
    if not name:
        raise ValueError("name 必填")
    engine = get_engine()
    with engine.begin() as conn:
        params = {"oid": body.get("org_id"), "n": name, "c": body.get("code"), "s": body.get("status") or "正常"}
        if engine.dialect.name == "sqlite":
            r = conn.execute(
                text("INSERT INTO equipment (org_id, name, code, status, updated_at) VALUES (:oid, :n, :c, :s, CURRENT_TIMESTAMP)"),
                params,
            )
            return int(r.lastrowid or 0)
        r = conn.execute(
            text(
                "INSERT INTO equipment (org_id, name, code, status, updated_at) VALUES (:oid, :n, :c, :s, CURRENT_TIMESTAMP) RETURNING id"
            ),
            params,
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
        set_clause = ", ".join(updates)
        query = text(f"UPDATE equipment SET {set_clause} WHERE id = :id")
        conn.execute(query, params)
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


def site_log_list(*, filters: Dict[str, Any], limit: int, offset: int, actor_org_id: Optional[int] = None) -> dict:
    org_id = filters.get("org_id")
    log_type = filters.get("log_type")
    # 如果传入了actor_org_id，覆盖用户选择的org_id
    if actor_org_id is not None:
        org_id = actor_org_id
    where = []
    params: Dict[str, Any] = {"limit": limit, "offset": offset}
    bindparams_list: List[bindparam] = []
    if org_id:
        # 实现基于组织树的数据范围控制
        org_ids = get_org_tree_ids(int(org_id))
        if org_ids:
            where.append("s.org_id IN :_org_ids")
            params["_org_ids"] = org_ids
            bindparams_list.append(bindparam("_org_ids", expanding=True))
    if log_type:
        where.append("s.log_type = :lt")
        params["lt"] = log_type
    where_clause = " WHERE " + " AND ".join(where) if where else ""
    engine = get_engine()
    with engine.connect() as conn:
        total_query = text("SELECT COUNT(*) FROM site_log s" + where_clause)
        if bindparams_list:
            total_query = total_query.bindparams(*bindparams_list)
        total = conn.execute(total_query, params).scalar_one()
        rows_query = text(
            """
            SELECT s.*, o.name as org_name, u.name as user_name
            FROM site_log s
            LEFT JOIN org o ON s.org_id=o.id
            LEFT JOIN "user" u ON s.user_id=u.id
            """
            + where_clause +
            " ORDER BY s.created_at DESC LIMIT :limit OFFSET :offset"
        )
        if bindparams_list:
            rows_query = rows_query.bindparams(*bindparams_list)
        rows = conn.execute(rows_query, params).mappings().all()
    return {"list": [dict(r) for r in rows], "total": int(total)}


def site_log_create(*, user_id: Optional[int], body: Dict[str, Any]) -> int:
    log_type = (body.get("log_type") or "").strip()
    if not log_type:
        raise ValueError("log_type 必填")
    engine = get_engine()
    with engine.begin() as conn:
        params = {"oid": body.get("org_id"), "uid": user_id, "t": log_type, "c": body.get("content")}
        if engine.dialect.name == "sqlite":
            r = conn.execute(
                text("INSERT INTO site_log (org_id, user_id, log_type, content) VALUES (:oid, :uid, :t, :c)"),
                params,
            )
            return int(r.lastrowid or 0)
        r = conn.execute(
            text("INSERT INTO site_log (org_id, user_id, log_type, content) VALUES (:oid, :uid, :t, :c) RETURNING id"),
            params,
        ).mappings().first()
        return int(r["id"])

