from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from digital_labor.auth.jwt import should_refresh, sign_token, verify_token
from digital_labor.web.response import err, set_token_refresh_header


def _get_bearer_token(request: Request) -> Optional[str]:
    auth = request.headers.get("authorization")
    if not auth:
        return None
    parts = auth.split(" ")
    if len(parts) == 2 and parts[0] == "Bearer":
        return parts[1]
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
            new_token = sign_token(
                {
                    "userId": result.decoded.get("userId") or result.decoded.get("id"),
                    "username": result.decoded.get("username"),
                    "role": result.decoded.get("role"),
                    "workerId": result.decoded.get("workerId"),
                }
            )
            set_token_refresh_header(response, new_token)

        return response


def get_user(request: Request) -> Optional[Dict[str, Any]]:
    return getattr(request.state, "user", None)


def require_worker(request: Request) -> Optional[Response]:
    user = get_user(request)
    if not user or not user.get("workerId"):
        return err(401, "请使用工人端登录")
    return None

