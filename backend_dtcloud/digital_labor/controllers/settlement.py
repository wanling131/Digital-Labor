from __future__ import annotations

import urllib.parse
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Request, Response
from pydantic import BaseModel
from digital_labor.pagination import parse_pagination
from digital_labor.services.settlement_service import confirm as svc_confirm
from digital_labor.services.settlement_service import confirm_list as svc_confirm_list
from digital_labor.services.settlement_service import generate as svc_generate
from digital_labor.services.settlement_service import my_all as svc_my_all
from digital_labor.services.settlement_service import my_pending as svc_my_pending
from digital_labor.services.settlement_service import push_notify as svc_push_notify
from digital_labor.services.settlement_service import salary_list as svc_salary_list
from digital_labor.services.settlement_service import slip_html as svc_slip_html
from digital_labor.web.middleware import get_user, require_worker
from digital_labor.web.response import err, ok



router = APIRouter(prefix="/api/settlement")


@router.get("/my-pending")
def my_pending(request: Request):
    person_id = request.query_params.get("person_id") or (getattr(request.state, "user", {}) or {}).get("workerId")
    if not person_id:
        return err(400, "person_id 必填或请登录")
    return ok(svc_my_pending(int(person_id)))


@router.get("/my")
def my(request: Request):
    person_id = request.query_params.get("person_id") or (getattr(request.state, "user", {}) or {}).get("workerId")
    if not person_id:
        return err(400, "person_id 必填或请登录")
    return ok(svc_my_all(int(person_id)))


@router.get("/confirm")
def confirm_list(request: Request):
    q = dict(request.query_params)
    status = q.get("status")
    pg = parse_pagination(q)
    u = get_user(request) or {}
    actor_org_id = None
    if u.get("role") != "admin" and u.get("orgId") is not None:
        actor_org_id = int(u["orgId"])
    return ok(svc_confirm_list(status=status, limit=pg.limit, offset=pg.offset, actor_org_id=actor_org_id))


class GenerateBody(BaseModel):
    period_start: str
    period_end: str


@router.post("/generate")
def generate(body: GenerateBody):
    if not body.period_start or not body.period_end:
        return err(400, "period_start、period_end 必填")
    return ok(svc_generate(body.period_start, body.period_end))


class ConfirmBody(BaseModel):
    action: Optional[str] = None  # confirm|reject
    amount_due: Optional[float] = None
    amount_paid: Optional[float] = None


@router.post("/confirm/{settlement_id}")
def confirm(request: Request, settlement_id: int, body: ConfirmBody):
    actor = get_user(request) or {}
    r = svc_confirm(
        settlement_id=settlement_id,
        action=body.action,
        amount_due=body.amount_due,
        amount_paid=body.amount_paid,
        actor=actor,
    )
    if r == "not_found":
        return err(404, "不存在")
    if r == "forbidden":
        return err(403, "无权操作")
    return ok({"ok": True})


class PushBody(BaseModel):
    ids: Optional[List[int]] = None


@router.post("/push-notify")
def push_notify(body: PushBody):
    return ok(svc_push_notify(body.ids))


@router.get("/{settlement_id}/slip")
def slip(request: Request, settlement_id: int):
    actor = get_user(request) or {}
    r = svc_slip_html(settlement_id=settlement_id, actor=actor)
    if r == "not_found":
        return err(404, "结算单不存在")
    if r == "forbidden":
        return err(403, "无权查看他人工资条")
    html, filename = r
    headers = {"Content-Disposition": "attachment; filename*=UTF-8''" + urllib.parse.quote(filename)}
    return Response(content=html, media_type="text/html; charset=utf-8", headers=headers)


@router.get("/salary")
def salary(request: Request):
    q = dict(request.query_params)
    pg = parse_pagination(q, default_page_size=50, max_page_size=100)
    u = get_user(request) or {}
    actor_org_id = None
    if u.get("role") != "admin" and u.get("orgId") is not None:
        actor_org_id = int(u["orgId"])
    return ok(svc_salary_list(filters=q, limit=pg.limit, offset=pg.offset, actor_org_id=actor_org_id))

