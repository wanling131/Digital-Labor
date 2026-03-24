from __future__ import annotations

import io
from typing import Any, Dict

from fastapi import APIRouter, Request, UploadFile
from digital_labor.pagination import parse_pagination
from digital_labor.services.attendance_service import clock as svc_clock
from digital_labor.services.attendance_service import clock_log as svc_clock_log
from digital_labor.services.attendance_service import import_from_excel_rows as svc_import_from_excel_rows
from digital_labor.services.attendance_service import my_attendance as svc_my_attendance
from digital_labor.services.attendance_service import report as svc_report
from digital_labor.web.middleware import get_user, require_worker
from digital_labor.web.response import err, ok


router = APIRouter(prefix="/api/attendance")


@router.post("/import")
async def import_excel(file: UploadFile):
    if not file:
        return err(400, "请上传文件")
    try:
        import openpyxl  # type: ignore
        import io
    except Exception:  # noqa: BLE001
        return err(500, "缺少依赖 openpyxl，无法解析 Excel")

    data = await file.read()
    wb = openpyxl.load_workbook(io.BytesIO(data), data_only=True)
    ws = wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    try:
        return ok(svc_import_from_excel_rows(rows))
    except ValueError as e:
        return err(400, str(e))


@router.get("/report")
def report(request: Request):
    q = dict(request.query_params)
    pg = parse_pagination(q, default_page_size=50, max_page_size=100)
    u = get_user(request) or {}
    actor_org_id = None
    if u.get("role") != "admin" and u.get("orgId") is not None:
        actor_org_id = int(u["orgId"])
    return ok(svc_report(filters=q, limit=pg.limit, offset=pg.offset, actor_org_id=actor_org_id))


@router.get("/my")
def my(request: Request):
    q = dict(request.query_params)
    person_id = q.get("person_id") or (request.state.user.get("workerId") if hasattr(request.state, "user") else None)
    year = q.get("year")
    month = q.get("month")
    if not person_id:
        return err(400, "person_id 必填或请登录")

    return ok(svc_my_attendance(person_id=int(person_id), year=year, month=month))


@router.post("/clock")
def clock(request: Request, body: Dict[str, Any]):
    resp = require_worker(request)
    if resp is not None:
        return resp
    person_id = int(request.state.user["workerId"])
    try:
        return ok(svc_clock(person_id=person_id, typ=str(body.get("type"))))
    except ValueError as e:
        return err(400, str(e))


@router.get("/log")
def clock_log(request: Request):
    q = dict(request.query_params)
    pg = parse_pagination(q, default_page_size=50, max_page_size=200)
    u = get_user(request) or {}
    actor_org_id = None
    if u.get("role") != "admin" and u.get("orgId") is not None:
        actor_org_id = int(u["orgId"])
    return ok(svc_clock_log(filters=q, limit=pg.limit, offset=pg.offset, actor_org_id=actor_org_id))

