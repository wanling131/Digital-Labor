from __future__ import annotations

import datetime as dt
import re
from typing import Any, Dict, Optional

from fastapi import APIRouter, Request, UploadFile
from digital_labor.pagination import parse_pagination
from digital_labor.services.attendance_service import clock as svc_clock
from digital_labor.services.attendance_service import clock_log as svc_clock_log
from digital_labor.services.attendance_service import import_from_excel_rows as svc_import_from_excel_rows
from digital_labor.services.attendance_service import my_attendance as svc_my_attendance
from digital_labor.services.attendance_service import report as svc_report
from digital_labor.web.middleware import require_worker
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
    person_id = q.get("person_id")
    org_id = q.get("org_id")
    start = q.get("start")
    end = q.get("end")
    pg = parse_pagination(q, default_page_size=50, max_page_size=100)
    where = []
    params: Dict[str, Any] = {"limit": pg.limit, "offset": pg.offset}
    if person_id:
        where.append("a.person_id = :pid")
        params["pid"] = int(person_id)
    if org_id:
        where.append("(a.org_id = :oid OR p.org_id = :oid)")
        params["oid"] = int(org_id)
    if start:
        where.append("DATE(a.work_date) >= DATE(:start)")
        params["start"] = start
    if end:
        where.append("DATE(a.work_date) <= DATE(:end)")
        params["end"] = end
    return ok(svc_report(filters=q, limit=pg.limit, offset=pg.offset))


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
    person_id = q.get("person_id")
    org_id = q.get("org_id")
    start = q.get("start")
    end = q.get("end")
    pg = parse_pagination(q, default_page_size=50, max_page_size=200)
    where = []
    params: Dict[str, Any] = {"limit": pg.limit, "offset": pg.offset}
    if person_id:
        where.append("c.person_id = :pid")
        params["pid"] = int(person_id)
    if org_id:
        where.append("p.org_id = :oid")
        params["oid"] = int(org_id)
    if start:
        where.append("c.punch_at >= :start")
        params["start"] = start
    if end:
        where.append("c.punch_at <= :end")
        params["end"] = f"{end} 23:59:59"
    return ok(svc_clock_log(filters=q, limit=pg.limit, offset=pg.offset))

