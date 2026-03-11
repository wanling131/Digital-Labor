from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel
from digital_labor.pagination import parse_pagination
from digital_labor.services.site_service import board as svc_board
from digital_labor.services.site_service import equipment_create as svc_equipment_create
from digital_labor.services.site_service import equipment_delete as svc_equipment_delete
from digital_labor.services.site_service import equipment_list as svc_equipment_list
from digital_labor.services.site_service import equipment_update as svc_equipment_update
from digital_labor.services.site_service import leave as svc_leave
from digital_labor.services.site_service import site_log_create as svc_site_log_create
from digital_labor.services.site_service import site_log_list as svc_site_log_list
from digital_labor.web.response import err, ok


router = APIRouter(prefix="/api/site")


class LeaveBody(BaseModel):
    person_id: int


@router.post("/leave")
def leave(body: LeaveBody):
    if not body.person_id:
        return err(400, "person_id 必填")
    return ok(svc_leave(body.person_id))


@router.get("/board")
def board():
    return ok(svc_board())


@router.get("/equipment")
def equipment_list(request: Request):
    q = dict(request.query_params)
    pg = parse_pagination(q, default_page_size=50, max_page_size=100)
    return ok(svc_equipment_list(filters=q, limit=pg.limit, offset=pg.offset))


class EquipmentBody(BaseModel):
    org_id: Optional[int] = None
    name: str
    code: Optional[str] = None
    status: str = "正常"


@router.post("/equipment")
def equipment_create(body: EquipmentBody):
    try:
        new_id = svc_equipment_create(body.model_dump())
    except ValueError as e:
        return err(400, str(e))
    return ok({"id": new_id})


class EquipmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    status: Optional[str] = None


@router.put("/equipment/{equipment_id}")
def equipment_update(equipment_id: int, body: EquipmentUpdate):
    try:
        ok_ = svc_equipment_update(equipment_id, body.model_dump(exclude_none=False, exclude_unset=True))
    except ValueError as e:
        return err(400, str(e))
    if not ok_:
        return err(404, "不存在")
    return ok({"ok": True})


@router.delete("/equipment/{equipment_id}")
def equipment_delete(equipment_id: int):
    ok_ = svc_equipment_delete(equipment_id)
    if not ok_:
        return err(404, "不存在")
    return ok({"ok": True})


@router.get("/site-log")
def site_log_list(request: Request):
    q = dict(request.query_params)
    pg = parse_pagination(q, default_page_size=50, max_page_size=100)
    return ok(svc_site_log_list(filters=q, limit=pg.limit, offset=pg.offset))


class SiteLogBody(BaseModel):
    org_id: Optional[int] = None
    log_type: str
    content: Optional[str] = None


@router.post("/site-log")
def site_log_create(request: Request, body: SiteLogBody):
    user_id = (getattr(request.state, "user", {}) or {}).get("userId")
    try:
        new_id = svc_site_log_create(user_id=user_id, body=body.model_dump())
    except ValueError as e:
        return err(400, str(e))
    return ok({"id": new_id})

