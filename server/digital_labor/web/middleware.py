from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from digital_labor.auth.jwt import should_refresh, sign_token, verify_token
from digital_labor.web.response import err, set_token_refresh_header


TOKEN_COOKIE = "labor_token"
WORKER_TOKEN_COOKIE = "labor_worker_token"


def _get_bearer_token(request: Request) -> Optional[str]:
    auth = request.headers.get("authorization")
    if auth:
        parts = auth.split(" ")
        if len(parts) == 2 and parts[0] == "Bearer":
            return parts[1]
    # 从 cookie 读取（httpOnly 模式，USE_HTTPONLY_COOKIE=true 时）
    try:
        c = request.cookies
        return c.get(TOKEN_COOKIE) or c.get(WORKER_TOKEN_COOKIE) or None
    except Exception:  # noqa: BLE001
        return None


class AuthMiddleware(BaseHTTPMiddleware):
    """
    复刻 Node 端行为：
    - 除 /api/auth/*、/api/health、/api、/api/sys/feature-status 外，其余 /api/* 都要求 Bearer token
    - token 接近过期则下发 X-Token-Refresh
    """

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        path = request.url.path or ""
        if not path.startswith("/api"):
            return await call_next(request)

        # 免鉴权路径
        if path.startswith("/api/auth/") or path in ("/api/health", "/api") or path == "/api/sys/feature-status":
            return await call_next(request)

        token = _get_bearer_token(request)
        if not token:
            return err(401, "未登录")

        result = verify_token(token)
        if not result.valid or not result.decoded:
            return err(401, result.error or "登录已过期")

        request.state.user = result.decoded

        response: Response = await call_next(request)

        # 刷新 token：仅 access token 且接近过期时下发
        if result.decoded.get("type") == "access" and should_refresh(result.decoded):
            payload = {
                "userId": result.decoded.get("userId") or result.decoded.get("id"),
                "username": result.decoded.get("username"),
                "role": result.decoded.get("role"),
                "workerId": result.decoded.get("workerId"),
            }
            if result.decoded.get("orgId") is not None:
                payload["orgId"] = result.decoded["orgId"]
            new_token = sign_token(payload)
            set_token_refresh_header(response, new_token)

        return response


def get_user(request: Request) -> Optional[Dict[str, Any]]:
    return getattr(request.state, "user", None)


def require_worker(request: Request) -> Optional[Response]:
    user = get_user(request)
    if not user or not user.get("workerId"):
        return err(401, "请使用工人端登录")
    return None


def require_permission(request: Request, permission_key: str) -> Optional[Response]:
    """校验管理端用户是否拥有指定权限，无权限时返回 403。"""
    user = get_user(request)
    if not user:
        return err(401, "未登录")
    if user.get("role") == "admin":
        return None
    from digital_labor.services.sys_admin_service import my_permissions

    perms = my_permissions(int(user.get("userId") or user.get("id") or 0))
    if permission_key in (perms.get("permissions") or []):
        return None
    return err(403, "无操作权限")

