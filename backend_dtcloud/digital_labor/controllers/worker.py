from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel
from sqlalchemy import text

from digital_labor.services.worker_service import get_me as svc_get_me
from digital_labor.services.worker_service import my_certificates as svc_my_certificates
from digital_labor.services.worker_service import update_me as svc_update_me
from digital_labor.web.middleware import require_worker
from digital_labor.web.response import err, ok


router = APIRouter(prefix="/api/worker")


@router.get("/me")
def me(request: Request):
    resp = require_worker(request)
    if resp is not None:
        return resp
    worker_id = request.state.user["workerId"]
    out = svc_get_me(int(worker_id))
    if not out:
        return err(404, "人员不存在")
    return ok(out)


class MeUpdate(BaseModel):
    mobile: Optional[str] = None
    id_card: Optional[str] = None


@router.put("/me")
def me_update(request: Request, body: MeUpdate):
    resp = require_worker(request)
    if resp is not None:
        return resp
    worker_id = request.state.user["workerId"]
    try:
        svc_update_me(int(worker_id), body.model_dump(exclude_none=False, exclude_unset=True))
    except ValueError as e:
        return err(400, str(e))
    return ok({"ok": True})


@router.get("/certificates")
def my_certificates(request: Request):
    resp = require_worker(request)
    if resp is not None:
        return resp
    worker_id = request.state.user["workerId"]
    return ok(svc_my_certificates(int(worker_id)))

