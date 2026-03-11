from __future__ import annotations

from typing import Any, Dict, Optional

from sqlalchemy import text

from digital_labor.crypto_compat import safe_decrypt_then_mask
from digital_labor.db import get_engine


def get_me(worker_id: int) -> Optional[dict]:
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
            {"id": worker_id},
        ).mappings().first()
    if not row:
        return None
    out = dict(row)
    if out.get("id_card"):
        out["id_card"] = safe_decrypt_then_mask(out["id_card"], "idCard")
    if out.get("mobile"):
        out["mobile"] = safe_decrypt_then_mask(out["mobile"], "mobile")
    if out.get("bank_card"):
        out["bank_card"] = safe_decrypt_then_mask(out["bank_card"], "bankCard")
    return out


def update_me(worker_id: int, patch: Dict[str, Any]) -> None:
    updates = ["updated_at = now()"]
    params: Dict[str, Any] = {"id": worker_id}
    if "mobile" in patch:
        updates.append("mobile = :mobile")
        params["mobile"] = patch.get("mobile")
    if "id_card" in patch:
        updates.append("id_card = :id_card")
        params["id_card"] = patch.get("id_card")
    if len(params.keys()) == 1:
        raise ValueError("无有效字段")
    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(text(f"UPDATE person SET {', '.join(updates)} WHERE id = :id"), params)


def my_certificates(worker_id: int) -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT id, name, certificate_no, issue_date, expiry_date, status
                FROM person_certificate
                WHERE person_id = :id
                ORDER BY expiry_date DESC
                """
            ),
            {"id": worker_id},
        ).mappings().all()
    return {"list": [dict(r) for r in rows]}

