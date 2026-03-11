from __future__ import annotations

import base64
import os
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from sqlalchemy import bindparam, text

from digital_labor.crypto_compat import encrypt, safe_decrypt_then_mask
from digital_labor.db import get_engine
from digital_labor.paths import get_paths


@dataclass(frozen=True)
class Page:
    limit: int
    offset: int
    page: int
    page_size: int


def _save_signature_data_url(worker_id: int, data_url: str) -> Optional[str]:
    """
    兼容 Node 行为：activation 允许传 dataURL；后端落盘并在 DB 存相对 server/ 的路径。
    """
    if not data_url.startswith("data:image"):
        return data_url
    comma = data_url.find(",")
    if comma < 0:
        return None
    b64 = data_url[comma + 1 :]
    try:
        buf = base64.b64decode(b64)
    except Exception:  # noqa: BLE001
        return None
    paths = get_paths()
    dir_abs = paths.uploads_signatures
    os.makedirs(dir_abs, exist_ok=True)
    filename = f"person_{worker_id}_{int(time.time() * 1000)}.png"
    abs_path = os.path.join(dir_abs, filename)
    with open(abs_path, "wb") as f:
        f.write(buf)
    rel = os.path.relpath(abs_path, paths.server_root).replace("\\", "/")
    return rel


def archive_list(
    *,
    filters: Dict[str, Any],
    page: Page,
) -> dict:
    status = filters.get("status")
    org_id = filters.get("org_id")
    on_site = filters.get("on_site")
    filled = filters.get("filled")
    contract_signed = filters.get("contract_signed")
    keyword = (filters.get("keyword") or "").strip()
    job_title = filters.get("job_title")

    where: List[str] = []
    params: Dict[str, Any] = {"limit": page.limit, "offset": page.offset}
    if status:
        where.append("p.status = :status")
        params["status"] = status
    if org_id:
        where.append("p.org_id = :org_id")
        params["org_id"] = int(org_id)
    if on_site == "1":
        where.append("p.on_site = 1")
    if on_site == "0":
        where.append("p.on_site = 0")
    if filled == "1":
        where.append("TRIM(COALESCE(p.id_card,'')) != '' AND TRIM(COALESCE(p.mobile,'')) != ''")
    if filled == "0":
        where.append("(TRIM(COALESCE(p.id_card,'')) = '' OR TRIM(COALESCE(p.mobile,'')) = '')")
    if contract_signed == "1":
        where.append("p.contract_signed = 1")
    if contract_signed == "0":
        where.append("p.contract_signed = 0")
    if job_title:
        where.append("p.job_title = :job_title")
        params["job_title"] = job_title
    if keyword:
        where.append("(LOWER(p.name) LIKE LOWER(:kw) OR LOWER(p.work_no) LIKE LOWER(:kw) OR LOWER(o.name) LIKE LOWER(:kw))")
        params["kw"] = f"%{keyword}%"

    where_sql = (" AND " + " AND ".join(where)) if where else ""
    engine = get_engine()
    with engine.connect() as conn:
        total = conn.execute(
            text(f"SELECT COUNT(*) FROM person p LEFT JOIN org o ON p.org_id = o.id WHERE 1=1{where_sql}"),
            params,
        ).scalar_one()
        rows = conn.execute(
            text(
                f"""
                SELECT p.*, o.name as org_name
                FROM person p LEFT JOIN org o ON p.org_id = o.id
                WHERE 1=1{where_sql}
                ORDER BY p.id DESC
                LIMIT :limit OFFSET :offset
                """
            ),
            params,
        ).mappings().all()

    out = []
    for r in rows:
        d = dict(r)
        if d.get("id_card"):
            d["id_card"] = safe_decrypt_then_mask(d["id_card"], "idCard")
        if d.get("mobile"):
            d["mobile"] = safe_decrypt_then_mask(d["mobile"], "mobile")
        if d.get("bank_card"):
            d["bank_card"] = safe_decrypt_then_mask(d["bank_card"], "bankCard")
        out.append(d)
    return {"list": out, "total": int(total), "page": page.page, "pageSize": page.page_size}


def archive_get(person_id: int) -> Optional[dict]:
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(
            text(
                """
                SELECT p.*, o.name as org_name
                FROM person p LEFT JOIN org o ON p.org_id=o.id
                WHERE p.id = :id
                """
            ),
            {"id": person_id},
        ).mappings().first()
    return dict(row) if row else None


def archive_create(body: Dict[str, Any]) -> int:
    if not body.get("name"):
        raise ValueError("姓名必填")
    engine = get_engine()
    with engine.begin() as conn:
        r = conn.execute(
            text(
                """
                INSERT INTO person (org_id, work_no, name, id_card, mobile, bank_card, status, job_title, updated_at)
                VALUES (:org_id, :work_no, :name, :id_card, :mobile, :bank_card, :status, :job_title, CURRENT_TIMESTAMP)
                RETURNING id
                """
            ),
            {
                "org_id": body.get("org_id"),
                "work_no": body.get("work_no"),
                "name": body["name"],
                "id_card": encrypt(body["id_card"]) if body.get("id_card") else None,
                "mobile": encrypt(body["mobile"]) if body.get("mobile") else None,
                "bank_card": encrypt(body["bank_card"]) if body.get("bank_card") else None,
                "status": body.get("status") or "预注册",
                "job_title": body.get("job_title"),
            },
        ).mappings().first()
    return int(r["id"])


def archive_update(person_id: int, patch: Dict[str, Any]) -> bool:
    engine = get_engine()
    with engine.connect() as conn:
        exists = conn.execute(text("SELECT 1 FROM person WHERE id = :id"), {"id": person_id}).first()
    if not exists:
        return False

    updates = ["updated_at = CURRENT_TIMESTAMP"]
    params: Dict[str, Any] = {"id": person_id}

    def set_field(col: str, key: str, transform=lambda x: x):  # noqa: B008
        if key in patch:
            updates.append(f"{col} = :{key}")
            params[key] = transform(patch.get(key))

    set_field("org_id", "org_id")
    set_field("work_no", "work_no")
    set_field("name", "name")
    set_field("id_card", "id_card", lambda v: encrypt(v) if v else None)
    set_field("mobile", "mobile", lambda v: encrypt(v) if v else None)
    set_field("bank_card", "bank_card", lambda v: encrypt(v) if v else None)
    set_field("status", "status")
    set_field("job_title", "job_title")
    set_field("work_address", "work_address")
    set_field("signature_image", "signature_image")

    if len(params.keys()) == 1:
        raise ValueError("无有效字段")

    with engine.begin() as conn:
        conn.execute(text(f"UPDATE person SET {', '.join(updates)} WHERE id = :id"), params)
    return True


def me_activation(worker_id: int, patch: Dict[str, Any]) -> None:
    engine = get_engine()
    with engine.connect() as conn:
        exists = conn.execute(text("SELECT 1 FROM person WHERE id = :id"), {"id": worker_id}).first()
    if not exists:
        raise LookupError("人员不存在")

    updates = ["updated_at = CURRENT_TIMESTAMP"]
    params: Dict[str, Any] = {"id": worker_id}

    if "id_card" in patch:
        updates.append("id_card = :id_card")
        params["id_card"] = encrypt(str(patch.get("id_card"))) if patch.get("id_card") else None
    if "mobile" in patch:
        updates.append("mobile = :mobile")
        params["mobile"] = encrypt(str(patch.get("mobile"))) if patch.get("mobile") else None
    if "signature_image" in patch:
        sig = patch.get("signature_image")
        if sig in ("", None):
            stored = None
        else:
            stored = _save_signature_data_url(int(worker_id), str(sig))
        updates.append("signature_image = :signature_image")
        params["signature_image"] = stored

    if len(params.keys()) == 1:
        raise ValueError("无有效字段")

    with engine.begin() as conn:
        conn.execute(text(f"UPDATE person SET {', '.join(updates)} WHERE id = :id"), params)


def archive_delete(person_id: int) -> bool:
    engine = get_engine()
    with engine.connect() as conn:
        exists = conn.execute(text("SELECT 1 FROM person WHERE id = :id"), {"id": person_id}).first()
    if not exists:
        return False
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM person WHERE id = :id"), {"id": person_id})
    return True


def status_counts() -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT status, COUNT(*) as count FROM person GROUP BY status")).mappings().all()
    return {"list": [{"status": r["status"], "count": int(r["count"])} for r in rows]}


def status_batch(ids: List[int], status: str) -> None:
    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE person SET status = :s, updated_at = CURRENT_TIMESTAMP WHERE id IN :ids").bindparams(
                bindparam("ids", expanding=True)
            ),
            {"s": status, "ids": list(ids)},
        )
        on_site = 1 if status == "已进场" else 0 if status == "已离场" else None
        if on_site is not None:
            conn.execute(
                text("UPDATE person SET on_site = :v WHERE id IN :ids").bindparams(bindparam("ids", expanding=True)),
                {"v": on_site, "ids": list(ids)},
            )


def job_titles() -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT DISTINCT job_title FROM person WHERE TRIM(COALESCE(job_title,'')) != '' ORDER BY job_title")
        ).mappings().all()
    return {"list": [r["job_title"] for r in rows]}


def face_verify_mark_passed(person_id: Optional[int]) -> None:
    if not person_id:
        return
    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(
            text(
                "UPDATE person SET face_verified = 1, face_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = :id"
            ),
            {"id": int(person_id)},
        )


def face_verify_status(person_id: int) -> Optional[dict]:
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT id, name, face_verified, face_verified_at FROM person WHERE id = :id"),
            {"id": person_id},
        ).mappings().first()
    if not row:
        return None
    return {
        "person_id": int(row["id"]),
        "name": row["name"],
        "face_verified": bool(row["face_verified"]),
        "face_verified_at": row["face_verified_at"],
    }


def person_simple_get(person_id: int) -> Optional[dict]:
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(text("SELECT * FROM person WHERE id = :id"), {"id": person_id}).mappings().first()
    return dict(row) if row else None


def certificates_list(person_id: int) -> Optional[dict]:
    engine = get_engine()
    with engine.connect() as conn:
        exists = conn.execute(text("SELECT 1 FROM person WHERE id = :id"), {"id": person_id}).first()
        if not exists:
            return None
        rows = conn.execute(
            text(
                """
                SELECT id, name, certificate_no, issue_date, expiry_date, status
                FROM person_certificate
                WHERE person_id = :id
                ORDER BY expiry_date DESC
                """
            ),
            {"id": person_id},
        ).mappings().all()
    return {"list": [dict(r) for r in rows]}


def certificate_create(person_id: int, body: Dict[str, Any]) -> Optional[int]:
    if not body.get("name"):
        raise ValueError("name 必填")
    engine = get_engine()
    with engine.begin() as conn:
        exists = conn.execute(text("SELECT 1 FROM person WHERE id = :id"), {"id": person_id}).first()
        if not exists:
            return None
        r = conn.execute(
            text(
                """
                INSERT INTO person_certificate (person_id, name, certificate_no, issue_date, expiry_date, status)
                VALUES (:pid, :n, :no, :i, :e, :s)
                RETURNING id
                """
            ),
            {
                "pid": person_id,
                "n": body["name"],
                "no": body.get("certificate_no"),
                "i": body.get("issue_date"),
                "e": body.get("expiry_date"),
                "s": body.get("status") or "valid",
            },
        ).mappings().first()
    return int(r["id"])


def certificate_update(person_id: int, cert_id: int, patch: Dict[str, Any]) -> str:
    engine = get_engine()
    with engine.connect() as conn:
        pe = conn.execute(text("SELECT 1 FROM person WHERE id = :id"), {"id": person_id}).first()
        if not pe:
            return "no_person"
        ce = conn.execute(
            text("SELECT 1 FROM person_certificate WHERE id = :cid AND person_id = :pid"),
            {"cid": cert_id, "pid": person_id},
        ).first()
        if not ce:
            return "no_cert"

    updates = []
    params: Dict[str, Any] = {"cid": cert_id}
    for k in ("name", "certificate_no", "issue_date", "expiry_date", "status"):
        if k in patch:
            updates.append(f"{k} = :{k}")
            params[k] = patch.get(k)
    if not updates:
        raise ValueError("无有效字段")
    with engine.begin() as conn:
        conn.execute(text(f"UPDATE person_certificate SET {', '.join(updates)} WHERE id = :cid"), params)
    return "ok"


def certificate_delete(person_id: int, cert_id: int) -> str:
    engine = get_engine()
    with engine.begin() as conn:
        ce = conn.execute(
            text("SELECT 1 FROM person_certificate WHERE id = :cid AND person_id = :pid"),
            {"cid": cert_id, "pid": person_id},
        ).first()
        if not ce:
            return "no_cert"
        conn.execute(text("DELETE FROM person_certificate WHERE id = :cid"), {"cid": cert_id})
    return "ok"

