"""Password hashing utilities using bcrypt."""

from __future__ import annotations

import re
from typing import List, Tuple

import bcrypt


def hash_password(plain: str) -> str:
    """Hash a plaintext password with bcrypt."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:  # noqa: BLE001
        return False


def is_bcrypt_hash(value: str) -> bool:
    """Check if a stored value looks like a bcrypt hash."""
    return (value or "").strip().startswith("$2")


def validate_password_strength(password: str) -> Tuple[bool, List[str]]:
    """
    验证密码强度。

    要求：
    - 至少8个字符
    - 包含大小写字母
    - 包含数字
    - 包含特殊字符（可选，但建议）

    Returns:
        Tuple[bool, List[str]]: (是否通过, 错误消息列表)
    """
    errors: List[str] = []

    if not password:
        errors.append("密码不能为空")
        return False, errors

    if len(password) < 8:
        errors.append("密码长度至少8个字符")

    if not re.search(r'[a-z]', password):
        errors.append("密码需包含小写字母")

    if not re.search(r'[A-Z]', password):
        errors.append("密码需包含大写字母")

    if not re.search(r'\d', password):
        errors.append("密码需包含数字")

    # 可选：特殊字符检查
    # if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
    #     errors.append("密码需包含特殊字符")

    return len(errors) == 0, errors


def get_password_strength_score(password: str) -> int:
    """
    计算密码强度分数（0-100）。

    Returns:
        int: 密码强度分数
    """
    if not password:
        return 0

    score = 0

    # 长度得分
    if len(password) >= 8:
        score += 20
    if len(password) >= 12:
        score += 10
    if len(password) >= 16:
        score += 10

    # 字符类型得分
    if re.search(r'[a-z]', password):
        score += 15
    if re.search(r'[A-Z]', password):
        score += 15
    if re.search(r'\d', password):
        score += 15
    if re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        score += 15

    return min(100, score)
