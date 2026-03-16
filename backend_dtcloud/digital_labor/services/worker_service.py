from __future__ import annotations

from typing import Any, Dict, Optional

from sqlalchemy import text

from digital_labor.auth.passwords import hash_password, verify_password
from digital_labor.crypto_compat import encrypt, safe_decrypt_then_mask
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
    updates = ["updated_at = CURRENT_TIMESTAMP"]
    params: Dict[str, Any] = {"id": worker_id}
    if "mobile" in patch:
        updates.append("mobile = :mobile")
        v = patch.get("mobile")
        params["mobile"] = encrypt(str(v)) if v else None
    if "id_card" in patch:
        updates.append("id_card = :id_card")
        v = patch.get("id_card")
        params["id_card"] = encrypt(str(v)) if v else None
    if len(params.keys()) == 1:
        raise ValueError("无有效字段")
    engine = get_engine()
    with engine.begin() as conn:
        set_clause = ", ".join(updates)
        query = text(f"UPDATE person SET {set_clause} WHERE id = :id")
        conn.execute(query, params)


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


def change_password(worker_id: int, old_password: str, new_password: str) -> str:
    """工人修改密码。返回 'ok' 或 'bad_old_password' 或 'weak_password'。"""
    if not new_password or len(str(new_password).strip()) < 6:
        return "weak_password"
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT password_hash FROM person WHERE id = :id"),
            {"id": worker_id},
        ).mappings().first()
    if not row:
        return "bad_old_password"
    row_dict = dict(row)
    current = (row_dict.get("password_hash") or "").strip()
    if current:
        if not verify_password(str(old_password or ""), current):
            return "bad_old_password"
    else:
        # 首次设置密码时仍需提供旧密码（可为空，表示未设置过）
        pass
    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE person SET password_hash = :p, updated_at = CURRENT_TIMESTAMP WHERE id = :id"),
            {"p": hash_password(str(new_password).strip()), "id": worker_id},
        )
    return "ok"


def bind_mobile(worker_id: int, mobile: str, verify_code: Optional[str] = None) -> None:
    """工人绑定手机号。当前未接短信时 verify_code 可省略或任意值。"""
    mobile_s = (mobile or "").strip()
    if not mobile_s:
        raise ValueError("手机号不能为空")
    engine = get_engine()
    with engine.begin() as conn:
        result = conn.execute(
            text("UPDATE person SET mobile = :m, updated_at = CURRENT_TIMESTAMP WHERE id = :id"),
            {"m": encrypt(mobile_s), "id": worker_id},
        )
        if result.rowcount == 0:
            # 正常情况下 worker_id 来自登录态，应当存在。若不存在说明账号已被删除或失效。
            raise ValueError("人员不存在或已被删除")


def get_notification_settings(worker_id: int) -> dict:
    """获取工人通知设置，若无记录则返回默认 push_enabled=True。"""
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT worker_id, push_enabled, updated_at FROM worker_notification_settings WHERE worker_id = :id"),
            {"id": worker_id},
        ).mappings().first()
    if not row:
        return {"push_enabled": True}
    row_dict = dict(row)
    return {"push_enabled": bool(row_dict.get("push_enabled", 1))}


def update_notification_settings(worker_id: int, push_enabled: bool) -> None:
    """更新工人通知设置（upsert）。"""
    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO worker_notification_settings (worker_id, push_enabled, updated_at)
                VALUES (:id, :push, CURRENT_TIMESTAMP)
                ON CONFLICT (worker_id) DO UPDATE SET push_enabled = :push, updated_at = CURRENT_TIMESTAMP
                """
            ),
            {"id": worker_id, "push": 1 if push_enabled else 0},
        )

