from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel
from sqlalchemy import text

from digital_labor.services.worker_service import (
    bind_mobile as svc_bind_mobile,
    change_password as svc_change_password,
    get_me as svc_get_me,
    get_notification_settings as svc_get_notification_settings,
    my_certificates as svc_my_certificates,
    update_me as svc_update_me,
    update_notification_settings as svc_update_notification_settings,
)
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


class ChangePasswordBody(BaseModel):
    old_password: str = ""
    new_password: str = ""


@router.post("/change-password")
def change_password(request: Request, body: ChangePasswordBody):
    resp = require_worker(request)
    if resp is not None:
        return resp
    worker_id = int(request.state.user["workerId"])
    result = svc_change_password(worker_id, body.old_password or "", body.new_password or "")
    if result == "ok":
        return ok({"ok": True, "message": "密码已修改"})
    if result == "bad_old_password":
        return err(400, "原密码错误")
    return err(400, "新密码至少 6 位")


class BindMobileBody(BaseModel):
    mobile: str = ""
    verify_code: Optional[str] = None


@router.post("/bind-mobile")
def bind_mobile(request: Request, body: BindMobileBody):
    resp = require_worker(request)
    if resp is not None:
        return resp
    worker_id = int(request.state.user["workerId"])
    try:
        svc_bind_mobile(worker_id, body.mobile or "", body.verify_code)
    except ValueError as e:
        return err(400, str(e))
    return ok({"ok": True, "message": "手机号已更新"})


@router.get("/notification-settings")
def get_notification_settings(request: Request):
    resp = require_worker(request)
    if resp is not None:
        return resp
    worker_id = int(request.state.user["workerId"])
    return ok(svc_get_notification_settings(worker_id))


class NotificationSettingsBody(BaseModel):
    push_enabled: bool = True


@router.put("/notification-settings")
def put_notification_settings(request: Request, body: NotificationSettingsBody):
    resp = require_worker(request)
    if resp is not None:
        return resp
    worker_id = int(request.state.user["workerId"])
    svc_update_notification_settings(worker_id, body.push_enabled)
    return ok({"ok": True, "push_enabled": body.push_enabled})

