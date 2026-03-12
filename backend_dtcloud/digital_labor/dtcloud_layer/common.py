from __future__ import annotations

"""
dtcloud Controller 层通用工具。

第二阶段重构目标：
- 业务逻辑沉淀到 digital_labor/services/*
- dtcloud Controller 只负责：路由声明、参数读取、返回 JSON

当前阶段仍用 uvicorn/FastAPI 启动做兼容性验证，因此 dtcloud Controller 暂不参与运行；
但其代码形态已经是 dtcloud 原生，后续切换到 `python dtcloud.py -c xxx.yaml` 时可直接接入。
"""

from typing import Any, Callable, Dict, Optional, Union

from digital_labor.auth.jwt import verify_token


def render_json(func: Callable[..., Any]) -> Callable[..., Any]:
    """
    dtcloud 官方示例常使用 commons.web.decorators.render_json。
    为了让本仓库在“尚未按 dtcloud 完整应用结构运行”时也可被静态检查/导入，
    这里提供一个 no-op 装饰器；正式切到 dtcloud 原生启动后，可替换为真实装饰器。
    """

    return func


def _dtcloud_request() -> Optional[Any]:
    """
    兼容性获取 dtcloud 的 request 对象（不同版本/运行方式字段可能不同）。
    该方法仅在 dtcloud 原生启动时才会被实际调用。
    """

    try:
        from dtcloud import http  # type: ignore
    except (ImportError, ModuleNotFoundError):
        return None

    return getattr(http, "request", None)


def _get_auth_header() -> Optional[str]:
    req = _dtcloud_request()
    if not req:
        return None

    # 常见字段：request.httprequest.headers / request.headers
    headers = None
    httpreq = getattr(req, "httprequest", None)
    if httpreq is not None:
        headers = getattr(httpreq, "headers", None)
    if headers is None:
        headers = getattr(req, "headers", None)

    if headers is None:
        return None

    # werkzeug headers / dict-like
    try:
        return headers.get("Authorization") or headers.get("authorization")
    except (AttributeError, TypeError, KeyError):
        return None


def get_jwt_payload() -> Optional[Dict[str, Any]]:
    """Parse Bearer token from Authorization header; only accepts 'Bearer <token>' format."""
    auth = _get_auth_header()
    if not auth:
        return None
    parts = str(auth).strip().split(None, 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    token = parts[1].strip()
    if not token:
        return None
    r = verify_token(token)
    return r.decoded if r.valid else None


def require_user_id() -> Union[int, Dict[str, str]]:
    payload = get_jwt_payload()
    user_id = int((payload or {}).get("userId") or 0)
    if not user_id:
        return {"code": "UNAUTHORIZED", "message": "未登录"}
    return user_id


def require_worker_id() -> Union[int, Dict[str, str]]:
    payload = get_jwt_payload()
    worker_id = int((payload or {}).get("workerId") or 0)
    if not worker_id:
        return {"code": "UNAUTHORIZED", "message": "请使用工人端登录"}
    return worker_id

