from __future__ import annotations

import platform
from fastapi import APIRouter, Request
from digital_labor.services.monitor_service import database_stats as svc_database_stats
from digital_labor.services.monitor_service import health as svc_health
from digital_labor.services.monitor_service import system_info as svc_system_info
from digital_labor.web.middleware import get_user
from digital_labor.web.response import err, ok


router = APIRouter(prefix="/api/monitor")


@router.get("/health")
def health():
    payload, status_code = svc_health()
    return ok(payload, status_code=status_code)


def _require_admin(request: Request):
    u = get_user(request)
    if not u or u.get("role") != "admin":
        return err(403, "需要管理员权限")
    return None


@router.get("/performance")
def performance(request: Request):
    # 旧 Node 端有更复杂的性能统计；新后端先提供基础占位，避免前端/运维调用报 404
    resp = _require_admin(request)
    if resp is not None:
        return resp
    return ok({"ok": True, "data": {"note": "迁移后可接入 APM/Prometheus，这里先返回占位数据"}})


@router.get("/slow-endpoints")
def slow_endpoints(request: Request):
    resp = _require_admin(request)
    if resp is not None:
        return resp
    limit = int(request.query_params.get("limit") or 10)
    return ok({"ok": True, "data": [], "limit": limit})


@router.get("/database")
def database(request: Request):
    resp = _require_admin(request)
    if resp is not None:
        return resp
    return ok({"ok": True, "data": svc_database_stats()})


@router.get("/system")
def system(request: Request):
    resp = _require_admin(request)
    if resp is not None:
        return resp
    return ok({"ok": True, "data": svc_system_info()})

