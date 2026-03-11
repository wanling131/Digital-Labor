from __future__ import annotations

import os
import shutil
import time
from typing import Any, Dict, List, Optional, Tuple, Union

from sqlalchemy import text

from digital_labor.db import get_engine
from digital_labor.paths import get_paths


def template_list() -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT id, name, file_path, version, is_visual, created_at FROM contract_template ORDER BY id DESC")
        ).mappings().all()
    return {"list": [dict(r) for r in rows]}


def template_get(template_id: int) -> Optional[dict]:
    engine = get_engine()
    with engine.connect() as conn:
        t = conn.execute(text("SELECT * FROM contract_template WHERE id = :id"), {"id": template_id}).mappings().first()
        if not t:
            return None
        vars_ = conn.execute(text("SELECT * FROM template_variable WHERE template_id = :id"), {"id": template_id}).mappings().all()
    d = dict(t)
    d["variables"] = [dict(v) for v in vars_]
    return d


def template_create(body: Dict[str, Any]) -> int:
    if not body.get("name"):
        raise ValueError("name 必填")
    engine = get_engine()
    with engine.begin() as conn:
        params = {"n": body["name"], "p": body.get("file_path"), "c": body.get("content"), "v": 1 if body.get("content") else 0}
        if engine.dialect.name == "sqlite":
            rr = conn.execute(
                text("INSERT INTO contract_template (name, file_path, content, is_visual) VALUES (:n, :p, :c, :v)"),
                params,
            )
            tid = int(rr.lastrowid or 0)
        else:
            r = conn.execute(
                text(
                    """
                    INSERT INTO contract_template (name, file_path, content, is_visual)
                    VALUES (:n, :p, :c, :v)
                    RETURNING id
                    """
                ),
                params,
            ).mappings().first()
            tid = int(r["id"])
        for v in body.get("variables") or []:
            conn.execute(
                text(
                    """
                    INSERT INTO template_variable (template_id, name, label, type, options, required)
                    VALUES (:tid, :n, :l, :t, :o, :r)
                    """
                ),
                {
                    "tid": tid,
                    "n": v.get("name"),
                    "l": v.get("label"),
                    "t": v.get("type") or "text",
                    "o": None if v.get("options") is None else str(v.get("options")),
                    "r": 1 if v.get("required") else 0,
                },
            )
    return tid


def template_copy(template_id: int) -> Optional[int]:
    """
    复制模板及其变量，返回新模板 ID。
    """
    engine = get_engine()
    with engine.connect() as conn:
        tpl = conn.execute(text("SELECT * FROM contract_template WHERE id = :id"), {"id": template_id}).mappings().first()
        if not tpl:
            return None
        vars_ = conn.execute(text("SELECT * FROM template_variable WHERE template_id = :id"), {"id": template_id}).mappings().all()

    name = str(tpl.get("name") or "").strip() or "未命名模板"
    new_name = f"{name} 副本"
    engine = get_engine()
    with engine.begin() as conn:
        params = {
            "n": new_name,
            "p": tpl.get("file_path"),
            "c": tpl.get("content"),
            "v": int(tpl.get("is_visual") or 0),
        }
        if engine.dialect.name == "sqlite":
            rr = conn.execute(
                text("INSERT INTO contract_template (name, file_path, content, is_visual) VALUES (:n, :p, :c, :v)"),
                params,
            )
            new_id = int(rr.lastrowid or 0)
        else:
            r = conn.execute(
                text(
                    """
                    INSERT INTO contract_template (name, file_path, content, is_visual)
                    VALUES (:n, :p, :c, :v)
                    RETURNING id
                    """
                ),
                params,
            ).mappings().first()
            new_id = int(r["id"])

        for v in vars_:
            conn.execute(
                text(
                    """
                    INSERT INTO template_variable (template_id, name, label, type, options, required)
                    VALUES (:tid, :n, :l, :t, :o, :r)
                    """
                ),
                {
                    "tid": new_id,
                    "n": v.get("name"),
                    "l": v.get("label"),
                    "t": v.get("type") or "text",
                    "o": None if v.get("options") is None else str(v.get("options")),
                    "r": 1 if v.get("required") else 0,
                },
            )
    return new_id


def template_delete(template_id: int) -> bool:
    """
    删除模板及其变量，返回是否删除成功。
    """
    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM template_variable WHERE template_id = :id"), {"id": template_id})
        r = conn.execute(text("DELETE FROM contract_template WHERE id = :id"), {"id": template_id})
    return bool(getattr(r, "rowcount", 0))


def template_update(template_id: int, body: Dict[str, Any]) -> None:
    if not template_id or not body.get("name"):
        raise ValueError("参数无效")
    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE contract_template
                SET name=:n, file_path=:p, content=:c, is_visual=:v
                WHERE id=:id
                """
            ),
            {"id": template_id, "n": body["name"], "p": body.get("file_path"), "c": body.get("content"), "v": 1 if body.get("content") else 0},
        )
        conn.execute(text("DELETE FROM template_variable WHERE template_id = :id"), {"id": template_id})
        for v in body.get("variables") or []:
            conn.execute(
                text(
                    """
                    INSERT INTO template_variable (template_id, name, label, type, options, required)
                    VALUES (:tid, :n, :l, :t, :o, :r)
                    """
                ),
                {"tid": template_id, "n": v.get("name"), "l": v.get("label"), "t": v.get("type") or "text", "o": None if v.get("options") is None else str(v.get("options")), "r": 1 if v.get("required") else 0},
            )


def template_render(template_id: int, data: Dict[str, Any]) -> Optional[dict]:
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(text("SELECT content FROM contract_template WHERE id = :id"), {"id": template_id}).mappings().first()
    if not row:
        return None
    content = row.get("content") or ""
    rendered = str(content)
    for k, v in data.items():
        rendered = rendered.replace("{{" + str(k) + "}}", str(v))
    return {"content": rendered}


def template_upload_save(*, filename: str, content: bytes, name: Optional[str]) -> int:
    paths = get_paths()
    os.makedirs(paths.uploads_templates, exist_ok=True)
    safe_name = (filename or "file").replace("/", "_").replace("\\", "_")
    stored = f"{int(time.time()*1000)}_{safe_name}"
    abs_path = os.path.join(paths.uploads_templates, stored)
    with open(abs_path, "wb") as f:
        f.write(content)
    rel = os.path.relpath(abs_path, paths.server_root).replace("\\", "/")
    tpl_name = (name or "").strip() or filename or "未命名模板"
    engine = get_engine()
    with engine.begin() as conn:
        params = {"n": tpl_name, "p": rel}
        if engine.dialect.name == "sqlite":
            rr = conn.execute(text("INSERT INTO contract_template (name, file_path) VALUES (:n, :p)"), params)
            return int(rr.lastrowid or 0)
        r = conn.execute(
            text("INSERT INTO contract_template (name, file_path) VALUES (:n, :p) RETURNING id"),
            params,
        ).mappings().first()
        return int(r["id"])


def template_file_path(template_id: int) -> Optional[str]:
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(text("SELECT file_path FROM contract_template WHERE id = :id"), {"id": template_id}).mappings().first()
    if not row or not row.get("file_path"):
        return None
    paths = get_paths()
    abs_path = os.path.abspath(os.path.join(paths.server_root, str(row["file_path"])))
    if not abs_path.startswith(os.path.abspath(paths.uploads_templates)) or not os.path.exists(abs_path):
        return None
    return abs_path


def status_list(*, status: Optional[str], limit: int, offset: int) -> dict:
    where = []
    params: Dict[str, Any] = {"limit": limit, "offset": offset}
    if status:
        where.append("ci.status = :status")
        params["status"] = status
    where_sql = (" WHERE " + " AND ".join(where)) if where else ""
    engine = get_engine()
    with engine.connect() as conn:
        total = conn.execute(text(f"SELECT COUNT(*) FROM contract_instance ci{where_sql}"), params).scalar_one()
        rows = conn.execute(
            text(
                f"""
                SELECT ci.*, p.name as person_name, p.work_no
                FROM contract_instance ci JOIN person p ON ci.person_id=p.id
                {where_sql}
                ORDER BY ci.id DESC
                LIMIT :limit OFFSET :offset
                """
            ),
            params,
        ).mappings().all()
    return {"list": [dict(r) for r in rows], "total": int(total)}


def launch(*, template_id: Optional[int], title: str, person_ids: List[int], deadline: Optional[str]) -> dict:
    if not title or not title.strip():
        raise ValueError("title 必填")
    if not person_ids:
        raise ValueError("person_ids 必填")
    engine = get_engine()
    with engine.begin() as conn:
        for pid in person_ids:
            conn.execute(
                text(
                    """
                    INSERT INTO contract_instance (template_id, title, person_id, status, deadline, flow_id)
                    VALUES (:tid, :t, :pid, '待签署', :d, NULL)
                    """
                ),
                {"tid": template_id, "t": title, "pid": pid, "d": deadline},
            )
            conn.execute(
                text("INSERT INTO notification (person_id, type, title, body) VALUES (:pid, '合同待签', :t, :b)"),
                {"pid": pid, "t": title, "b": (f"截止：{deadline}" if deadline else None)},
            )
    return {"ok": True, "count": len(person_ids)}


def archive_list(*, filters: Dict[str, Any], limit: int, offset: int) -> dict:
    person_id = filters.get("person_id")
    org_id = filters.get("org_id")
    title = filters.get("title")
    date_from = filters.get("date_from")
    date_to = filters.get("date_to")
    where = ["ci.status = '已签署'"]
    params: Dict[str, Any] = {"limit": limit, "offset": offset}
    if person_id:
        where.append("ci.person_id = :pid")
        params["pid"] = int(person_id)
    if org_id:
        where.append("p.org_id = :oid")
        params["oid"] = int(org_id)
    if title:
        where.append("LOWER(ci.title) LIKE LOWER(:title)")
        params["title"] = f"%{title}%"
    if date_from:
        where.append("DATE(ci.signed_at) >= DATE(:df)")
        params["df"] = date_from
    if date_to:
        where.append("DATE(ci.signed_at) <= DATE(:dt)")
        params["dt"] = date_to
    where_sql = " WHERE " + " AND ".join(where)
    engine = get_engine()
    with engine.connect() as conn:
        total = conn.execute(text(f"SELECT COUNT(*) FROM contract_instance ci JOIN person p ON ci.person_id=p.id{where_sql}"), params).scalar_one()
        rows = conn.execute(
            text(
                f"""
                SELECT ci.*, p.name as person_name, p.work_no, p.org_id as person_org_id, o.name as org_name
                FROM contract_instance ci
                JOIN person p ON ci.person_id=p.id
                LEFT JOIN org o ON p.org_id=o.id
                {where_sql}
                ORDER BY ci.signed_at DESC
                LIMIT :limit OFFSET :offset
                """
            ),
            params,
        ).mappings().all()
    return {"list": [dict(r) for r in rows], "total": int(total)}


def my_pending(person_id: int) -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT ci.* FROM contract_instance ci WHERE ci.person_id=:pid AND ci.status='待签署' ORDER BY ci.id DESC"),
            {"pid": person_id},
        ).mappings().all()
    return {"list": [dict(r) for r in rows]}


def my_signed(person_id: int) -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT ci.id, ci.title, ci.signed_at, ci.status, ci.deadline, ci.sign_image_snapshot,
                       p.signature_image as person_signature_image
                FROM contract_instance ci JOIN person p ON ci.person_id=p.id
                WHERE ci.person_id=:pid AND ci.status='已签署'
                ORDER BY ci.signed_at DESC
                """
            ),
            {"pid": person_id},
        ).mappings().all()
    return {"list": [dict(r) for r in rows]}


def sign(*, contract_id: int, person_id: int) -> str:
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(text("SELECT * FROM contract_instance WHERE id = :id"), {"id": contract_id}).mappings().first()
    if not row:
        return "not_found"
    if row["status"] != "待签署":
        return "bad_status"
    if int(row["person_id"]) != int(person_id):
        return "forbidden"

    paths = get_paths()
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE contract_instance SET status='已签署', signed_at=CURRENT_TIMESTAMP WHERE id=:id"),
            {"id": contract_id},
        )
        conn.execute(text("UPDATE person SET contract_signed=1 WHERE id=:id"), {"id": int(row["person_id"])})
        try:
            person = conn.execute(text("SELECT signature_image FROM person WHERE id=:id"), {"id": int(row["person_id"])}).mappings().first()
            sig = (person or {}).get("signature_image")
            if sig and not str(sig).startswith("data:image"):
                src_abs = os.path.abspath(os.path.join(paths.server_root, str(sig)))
                if os.path.exists(src_abs):
                    os.makedirs(paths.uploads_signatures_contracts, exist_ok=True)
                    dst_abs = os.path.join(paths.uploads_signatures_contracts, f"contract_{contract_id}_person_{int(row['person_id'])}.png")
                    shutil.copyfile(src_abs, dst_abs)
                    rel = os.path.relpath(dst_abs, paths.server_root).replace("\\", "/")
                    conn.execute(text("UPDATE contract_instance SET sign_image_snapshot=:p WHERE id=:id"), {"p": rel, "id": contract_id})
        except Exception:
            pass
    return "ok"


def invalidate(contract_id: int) -> str:
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(text("SELECT status FROM contract_instance WHERE id=:id"), {"id": contract_id}).mappings().first()
    if not row:
        return "not_found"
    if row["status"] != "已签署":
        return "bad_status"
    with engine.begin() as conn:
        conn.execute(text("UPDATE contract_instance SET status='已作废' WHERE id=:id"), {"id": contract_id})
    return "ok"


def pdf_path(*, contract_id: int) -> Tuple[Optional[int], Optional[str]]:
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(text("SELECT person_id, pdf_path FROM contract_instance WHERE id=:id"), {"id": contract_id}).mappings().first()
    if not row:
        return None, None
    paths = get_paths()
    if not row.get("pdf_path"):
        return int(row["person_id"]), ""
    abs_path = os.path.abspath(os.path.join(paths.server_root, str(row["pdf_path"])))
    return int(row["person_id"]), abs_path


def detail(contract_id: int) -> Optional[dict]:
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(
            text(
                """
                SELECT ci.*, p.name as person_name, p.work_no, p.signature_image as person_signature_image
                FROM contract_instance ci JOIN person p ON ci.person_id=p.id
                WHERE ci.id=:id
                """
            ),
            {"id": contract_id},
        ).mappings().first()
    return dict(row) if row else None


def evidence(*, contract_id: int) -> Union[str, dict]:
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(text("SELECT person_id, status, signed_at FROM contract_instance WHERE id=:id"), {"id": contract_id}).mappings().first()
    if not row:
        return "not_found"
    if row["status"] != "已签署":
        return "not_signed"
    return {"ok": True, "evidence": {"type": "本地存证", "message": "电子签章服务对接后可获取完整存证信息", "signedAt": row.get("signed_at")}}


def sign_url(*, contract_id: int, person_id: int) -> Union[str, dict]:
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(text("SELECT person_id, status FROM contract_instance WHERE id=:id"), {"id": contract_id}).mappings().first()
    if not row:
        return "not_found"
    if int(row["person_id"]) != int(person_id):
        return "forbidden"
    if row["status"] != "待签署":
        return "bad_status"
    return {"ok": True, "local": True, "message": "使用本地签署流程"}

