from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import Response
from fastapi.responses import JSONResponse


DEFAULT_CODES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    500: "INTERNAL_ERROR",
    503: "SERVICE_UNAVAILABLE",
}


def ok(data: Any, status_code: int = 200) -> JSONResponse:
    return JSONResponse(status_code=status_code, content=data)


def err(status_code: int, message: str, *, code: Optional[str] = None, details: Any = None) -> JSONResponse:
    body: Dict[str, Any] = {"code": code or DEFAULT_CODES.get(status_code, "ERROR"), "message": message}
    if details is not None:
        body["details"] = details
    return JSONResponse(status_code=status_code, content=body)


def set_token_refresh_header(response: Response, token: str) -> None:
    response.headers["X-Token-Refresh"] = token

