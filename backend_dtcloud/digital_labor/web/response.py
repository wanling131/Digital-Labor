from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import Response
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder


DEFAULT_CODES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    500: "INTERNAL_ERROR",
    503: "SERVICE_UNAVAILABLE",
}


def custom_jsonable_encoder(obj: Any) -> Any:
    if isinstance(obj, datetime):
        return obj.isoformat()
    return jsonable_encoder(obj)


def ok(data: Any, status_code: int = 200) -> JSONResponse:
    encoded_data = custom_jsonable_encoder(data)
    return JSONResponse(
        status_code=status_code, 
        content=encoded_data,
        media_type="application/json"
    )


def err(status_code: int, message: str, *, code: Optional[str] = None, details: Any = None) -> JSONResponse:
    body: Dict[str, Any] = {"code": code or DEFAULT_CODES.get(status_code, "ERROR"), "message": message}
    if details is not None:
        body["details"] = details
    encoded_body = custom_jsonable_encoder(body)
    return JSONResponse(
        status_code=status_code, 
        content=encoded_body,
        media_type="application/json"
    )


def set_token_refresh_header(response: Response, token: str) -> None:
    response.headers["X-Token-Refresh"] = token

