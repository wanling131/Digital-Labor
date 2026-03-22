from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from sqlalchemy import text

from digital_labor.auth.jwt import sign_token
from digital_labor.auth.passwords import verify_password, is_bcrypt_hash
from digital_labor.db import get_engine
from digital_labor.settings import settings


@dataclass(frozen=True)
class AuthResult:
    token: str
    user: Optional[dict] = None
    person: Optional[dict] = None


def admin_login(username: str, password: str) -> Optional[AuthResult]:
    u = (username or "").strip()
    p = password or ""
    if not u or not p:
        return None

    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(
            text(
                """
                SELECT id, username, name, role, password_hash
                FROM "user"
                WHERE username = :u AND enabled = 1
                """
            ),
            {"u": u},
        ).mappings().first()

    if not row:
        return None

    # 验证密码：支持 bcrypt 哈希和旧版明文（兼容迁移）
    stored_hash = row["password_hash"] or ""
    if is_bcrypt_hash(stored_hash):
        if not verify_password(p, stored_hash):
            return None
    else:
        # 旧版明文密码（仅用于兼容，生产环境应迁移到 bcrypt）
        if p != stored_hash:
            return None

    token = sign_token({"userId": int(row["id"]), "username": row["username"], "role": row["role"]})
    return AuthResult(
        token=token,
        user={"id": int(row["id"]), "username": row["username"], "name": row["name"], "role": row["role"]},
    )


def worker_login(*, person_id: Optional[int], work_no: Optional[str], name: Optional[str], mobile: Optional[str], password: Optional[str]) -> Optional[AuthResult]:
    engine = get_engine()
    pid: Optional[int] = int(person_id) if person_id else None

    with engine.connect() as conn:
        if not pid and mobile and str(mobile).strip():
            mobile_s = str(mobile).strip()
            row = conn.execute(
                text("SELECT id FROM person WHERE mobile = :m LIMIT 1"),
                {"m": mobile_s},
            ).mappings().first()
            if not row:
                # 严格依赖已有数据，避免通过错误密码暴露手机号是否存在
                return None
            # 先校验密码，再确认人员 ID，避免通过行为差异枚举已存在手机号
            # 密码验证逻辑：
            # - 没有密码或空密码：允许登录（兼容原有行为）
            # - 配置了演示密码且密码不匹配：拒绝登录
            # - 未配置演示密码但提供了密码：拒绝登录（安全默认）
            demo_pwd = settings.worker_demo_password
            provided_pwd = str(password).strip() if password else ""
            if provided_pwd:  # 提供了非空密码
                if not demo_pwd or provided_pwd != demo_pwd:
                    return None
            pid = int(row["id"])

        if not pid and (work_no or name):
            w = (work_no or "").strip()
            n = (name or "").strip()
            row = conn.execute(
                text("SELECT id FROM person WHERE work_no = :w OR name = :n LIMIT 1"),
                {"w": w or n, "n": n or w},
            ).mappings().first()
            if row:
                pid = int(row["id"])

        if not pid:
            return None

        person = conn.execute(
            text("SELECT id, work_no, name, mobile FROM person WHERE id = :id"),
            {"id": pid},
        ).mappings().first()

    token = sign_token({"workerId": pid})
    return AuthResult(token=token, person=dict(person) if person else None)


def worker_qrcode_login(scene: str) -> dict:
    raw = (scene or "").strip()
    if not raw:
        return {"error": "scene 必填"}

    engine = get_engine()
    with engine.connect() as conn:
        if raw.startswith("person:"):
            id_str = raw[len("person:") :]
            try:
                n = int(id_str)
            except Exception:  # noqa: BLE001
                n = 0
            if n <= 0:
                return {"error": "二维码对应人员不存在", "status": 404}
            exists = conn.execute(text("SELECT id FROM person WHERE id = :id"), {"id": n}).mappings().first()
            if not exists:
                return {"error": "二维码对应人员不存在", "status": 404}
            person = conn.execute(text("SELECT id, work_no, name, mobile FROM person WHERE id = :id"), {"id": n}).mappings().first()
            token = sign_token({"workerId": n})
            return {"mode": "person", "token": token, "person": dict(person) if person else None}

    if raw.startswith("project:"):
        project_key = raw[len("project:") :] or None
    else:
        project_key = raw
    return {"mode": "project", "project_key": project_key}

