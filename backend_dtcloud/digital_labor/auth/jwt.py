from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Dict, Optional

import jwt

from digital_labor.settings import settings


@dataclass(frozen=True)
class VerifyResult:
    valid: bool
    decoded: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


def sign_token(payload: Dict[str, Any]) -> str:
    now = int(time.time())
    body = {
        **payload,
        "version": settings.token_version,
        "type": "access",
        "iat": now,
        "exp": now + settings.access_token_expiry_seconds,
    }
    return jwt.encode(body, settings.jwt_secret, algorithm="HS256")


def verify_token(token: str) -> VerifyResult:
    try:
        decoded = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except Exception as e:  # noqa: BLE001
        return VerifyResult(valid=False, error=str(e))

    if str(decoded.get("version", "")) != str(settings.token_version):
        return VerifyResult(valid=False, error="Token版本已过期")

    return VerifyResult(valid=True, decoded=decoded)


def should_refresh(decoded: Dict[str, Any]) -> bool:
    exp = int(decoded.get("exp", 0))
    now = int(time.time())
    return exp - now < settings.refresh_threshold_seconds

