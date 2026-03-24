from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Dict, Optional, Tuple

from sqlalchemy import text

from digital_labor.auth.jwt import sign_token
from digital_labor.auth.passwords import verify_password, is_bcrypt_hash, validate_password_strength
from digital_labor.db import get_engine
from digital_labor.settings import settings


# 登录失败次数限制配置
MAX_LOGIN_ATTEMPTS = 5  # 最大失败次数
LOCKOUT_DURATION_SECONDS = 300  # 锁定时长（5分钟）

# 内存存储登录失败记录: {username: (fail_count, last_fail_time, lockout_until)}
_login_attempts: Dict[str, Tuple[int, float, float]] = {}


def _check_login_attempts(username: str) -> Tuple[bool, Optional[str]]:
    """
    检查登录尝试次数。

    Returns:
        Tuple[bool, Optional[str]]: (是否允许登录, 错误消息)
    """
    now = time.time()
    username_lower = username.lower()

    if username_lower in _login_attempts:
        fail_count, last_fail, lockout_until = _login_attempts[username_lower]

        # 检查是否在锁定期内
        if lockout_until > now:
            remaining = int(lockout_until - now)
            return False, f"账户已锁定，请{remaining}秒后重试"

        # 如果锁定已过期，重置计数
        if lockout_until > 0 and lockout_until <= now:
            del _login_attempts[username_lower]

    return True, None


def _record_login_failure(username: str) -> Optional[str]:
    """
    记录登录失败。

    Returns:
        Optional[str]: 错误消息（如果账户被锁定）
    """
    now = time.time()
    username_lower = username.lower()

    if username_lower in _login_attempts:
        fail_count, last_fail, lockout_until = _login_attempts[username_lower]
        fail_count += 1
    else:
        fail_count = 1

    # 达到最大失败次数，锁定账户
    if fail_count >= MAX_LOGIN_ATTEMPTS:
        lockout_until = now + LOCKOUT_DURATION_SECONDS
        _login_attempts[username_lower] = (fail_count, now, lockout_until)
        return f"登录失败次数过多，账户已锁定{LOCKOUT_DURATION_SECONDS // 60}分钟"

    _login_attempts[username_lower] = (fail_count, now, 0)
    remaining = MAX_LOGIN_ATTEMPTS - fail_count
    return f"用户名或密码错误，剩余{remaining}次尝试机会"


def _clear_login_failure(username: str) -> None:
    """清除登录失败记录。"""
    username_lower = username.lower()
    if username_lower in _login_attempts:
        del _login_attempts[username_lower]


@dataclass(frozen=True)
class AuthResult:
    token: str
    user: Optional[dict] = None
    person: Optional[dict] = None


def admin_login(username: str, password: str) -> Tuple[Optional[AuthResult], Optional[str]]:
    """
    管理员登录。

    Returns:
        Tuple[Optional[AuthResult], Optional[str]]: (认证结果, 错误消息)
    """
    u = (username or "").strip()
    p = password or ""
    if not u or not p:
        return None, "用户名和密码不能为空"

    # 检查登录尝试次数
    allowed, err_msg = _check_login_attempts(u)
    if not allowed:
        return None, err_msg

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
        # 记录失败但不暴露用户是否存在
        err_msg = _record_login_failure(u)
        return None, "用户名或密码错误"

    # 验证密码：支持 bcrypt 哈希和旧版明文（兼容迁移）
    stored_hash = row["password_hash"] or ""
    if is_bcrypt_hash(stored_hash):
        if not verify_password(p, stored_hash):
            err_msg = _record_login_failure(u)
            return None, err_msg
    else:
        # 旧版明文密码（仅用于兼容，生产环境应迁移到 bcrypt）
        if p != stored_hash:
            err_msg = _record_login_failure(u)
            return None, err_msg

    # 登录成功，清除失败记录
    _clear_login_failure(u)

    token = sign_token({"userId": int(row["id"]), "username": row["username"], "role": row["role"]})
    return AuthResult(
        token=token,
        user={"id": int(row["id"]), "username": row["username"], "name": row["name"], "role": row["role"]},
    ), None


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

