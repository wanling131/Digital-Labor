from __future__ import annotations

from fastapi import APIRouter, Request
from digital_labor.pagination import parse_pagination
from digital_labor.services.notify_service import list_notifications as svc_list_notifications
from digital_labor.services.notify_service import mark_read as svc_mark_read
from digital_labor.web.middleware import require_worker
from digital_labor.web.response import err, ok


router = APIRouter(prefix="/api/notify")


@router.get("/list")
def notify_list(request: Request):
    resp = require_worker(request)
    if resp is not None:
        return resp
    worker_id = request.state.user["workerId"]
    pg = parse_pagination(dict(request.query_params))
    return ok(svc_list_notifications(worker_id=int(worker_id), limit=pg.limit, offset=pg.offset))


@router.put("/{notify_id}/read")
def notify_read(request: Request, notify_id: int):
    resp = require_worker(request)
    if resp is not None:
        return resp
    worker_id = request.state.user["workerId"]
    ok_ = svc_mark_read(worker_id=int(worker_id), notify_id=int(notify_id))
    if not ok_:
        return err(404, "不存在")
    return ok({"ok": True})

