"""工种配置 CRUD 服务。"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy import text

from digital_labor.db import get_engine


def list_all() -> dict:
    """返回工种配置树形结构及扁平列表。"""
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT id, code, name, parent_id, sort, created_at FROM job_title_config ORDER BY sort, id")
        ).mappings().all()

    if not rows:
        return {"list": [], "flat": []}

    by_id: Dict[int, Dict[str, Any]] = {int(r["id"]): dict(r) for r in rows}
    for r in by_id.values():
        r["children"] = []

    roots: List[Dict[str, Any]] = []
    flat_names: List[str] = []

    for r in rows:
        rid = int(r["id"])
        parent_id = r.get("parent_id")
        node = {**by_id[rid], "children": []}
        flat_names.append(str(r["name"]))
        if parent_id is None:
            roots.append(node)
        else:
            pid = int(parent_id)
            if pid in by_id and "children" in by_id[pid]:
                by_id[pid]["children"].append(node)
            else:
                roots.append(node)

    def collect_leaves(nodes: List[Dict]) -> List[str]:
        out: List[str] = []
        for n in nodes:
            kids = n.get("children") or []
            if not kids:
                out.append(str(n.get("name", "")))
            else:
                out.extend(collect_leaves(kids))
        return out

    flat_list = collect_leaves(roots) if roots else flat_names
    return {"list": roots, "flat": flat_list}


def get_one(config_id: int) -> Optional[dict]:
    """获取单条工种配置。"""
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT id, code, name, parent_id, sort, created_at FROM job_title_config WHERE id = :id"),
            {"id": config_id},
        ).mappings().first()
    return dict(row) if row else None


def create(body: Dict[str, Any]) -> int:
    """创建工种配置。"""
    code = (body.get("code") or "").strip()
    name = (body.get("name") or "").strip()
    if not name:
        raise ValueError("名称必填")
    if not code:
        code = name  # 无编码时用名称

    parent_id = body.get("parent_id")
    sort = body.get("sort", 0)

    engine = get_engine()
    with engine.begin() as conn:
        params = {"code": code, "name": name, "parent_id": parent_id if parent_id is not None else None, "sort": sort}
        if engine.dialect.name == "sqlite":
            r = conn.execute(
                text("INSERT INTO job_title_config (code, name, parent_id, sort) VALUES (:code, :name, :parent_id, :sort)"),
                params,
            )
            return int(r.lastrowid or 0)
        row = conn.execute(
            text(
                "INSERT INTO job_title_config (code, name, parent_id, sort) VALUES (:code, :name, :parent_id, :sort) RETURNING id"
            ),
            params,
        ).mappings().first()
        return int(row["id"])


def update(config_id: int, patch: Dict[str, Any]) -> bool:
    """更新工种配置。"""
    updates = []
    params: Dict[str, Any] = {"id": config_id}

    if "code" in patch:
        val = (patch["code"] or "").strip()
        if val:  # 不允许多余设为空，因列 NOT NULL
            updates.append("code = :code")
            params["code"] = val
    if "name" in patch:
        val = (patch["name"] or "").strip()
        if not val:
            raise ValueError("名称不能为空")
        updates.append("name = :name")
        params["name"] = val
    if "parent_id" in patch:
        updates.append("parent_id = :parent_id")
        params["parent_id"] = patch["parent_id"]
    if "sort" in patch:
        updates.append("sort = :sort")
        params["sort"] = patch["sort"]

    if not updates:
        return True

    engine = get_engine()
    with engine.begin() as conn:
        set_clause = ", ".join(updates)
        query = text(f"UPDATE job_title_config SET {set_clause} WHERE id = :id")
        result = conn.execute(query, params)
    return result.rowcount > 0


def delete(config_id: int) -> str:
    """删除工种配置。若存在子节点则不允许删除。"""
    engine = get_engine()
    with engine.connect() as conn:
        exists = conn.execute(text("SELECT 1 FROM job_title_config WHERE id = :id"), {"id": config_id}).first()
        if not exists:
            return "not_found"
        has_child = conn.execute(
            text("SELECT 1 FROM job_title_config WHERE parent_id = :id"), {"id": config_id}
        ).first()
        if has_child:
            return "has_child"
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM job_title_config WHERE id = :id"), {"id": config_id})
    return "ok"
