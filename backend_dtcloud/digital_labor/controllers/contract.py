from __future__ import annotations

import os
import urllib.parse
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Request, UploadFile
from fastapi.responses import FileResponse
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from digital_labor.pagination import parse_pagination
from digital_labor.services.contract_service import archive_list as svc_archive_list
from digital_labor.services.contract_service import detail as svc_detail
from digital_labor.services.contract_service import evidence as svc_evidence
from digital_labor.services.contract_service import invalidate as svc_invalidate
from digital_labor.services.contract_service import launch as svc_launch
from digital_labor.services.contract_service import my_pending as svc_my_pending
from digital_labor.services.contract_service import my_signed as svc_my_signed
from digital_labor.services.contract_service import pdf_path as svc_pdf_path
from digital_labor.services.contract_service import sign as svc_sign
from digital_labor.services.contract_service import sign_url as svc_sign_url
from digital_labor.services.contract_service import status_list as svc_status_list
from digital_labor.services.contract_service import template_create as svc_template_create
from digital_labor.services.contract_service import template_file_path as svc_template_file_path
from digital_labor.services.contract_service import template_get as svc_template_get
from digital_labor.services.contract_service import template_list as svc_template_list
from digital_labor.services.contract_service import template_render as svc_template_render
from digital_labor.services.contract_service import template_update as svc_template_update
from digital_labor.services.contract_service import template_upload_save as svc_template_upload_save
from digital_labor.services.contract_service import template_copy as svc_template_copy
from digital_labor.services.contract_service import template_delete as svc_template_delete
from digital_labor.web.middleware import get_user, require_worker
from digital_labor.web.response import err, ok


router = APIRouter(prefix="/api/contract")

# 说明：
# - 该模块保持与 Node 端接口一致，但外部 e签宝依赖先按“可降级”策略实现：
#   核心业务（发起/待签/已签/归档）不依赖外部服务可运行；后续可在此处替换为真实对接。


@router.get("/template")
def template_list():
    return ok(svc_template_list())


@router.get("/template/{template_id}")
def template_one(template_id: int):
    t = svc_template_get(template_id)
    if not t:
        return err(404, "模板不存在")
    return ok(t)


class TemplateVar(BaseModel):
    name: str
    label: str
    type: Optional[str] = "text"
    options: Optional[List[Any]] = None
    required: Optional[bool] = False


class TemplateBody(BaseModel):
    name: str
    file_path: Optional[str] = None
    content: Optional[str] = None
    variables: List[TemplateVar] = []


@router.post("/template")
def template_create(body: TemplateBody):
    try:
        tid = svc_template_create(body.model_dump())
    except ValueError as e:
        return err(400, str(e))
    return ok({"id": tid})


@router.put("/template/{template_id}")
def template_update(template_id: int, body: TemplateBody):
    try:
        svc_template_update(template_id, body.model_dump())
    except ValueError as e:
        return err(400, str(e))
    return ok({"id": template_id})


@router.post("/template/{template_id}/copy")
def template_copy(template_id: int):
    new_id = svc_template_copy(template_id)
    if not new_id:
        return err(404, "模板不存在")
    return ok({"id": new_id})


@router.delete("/template/{template_id}")
def template_delete(template_id: int):
    ok_flag = svc_template_delete(template_id)
    if not ok_flag:
        return err(404, "模板不存在")
    return ok({"ok": True})


@router.post("/template/{template_id}/render")
def template_render(template_id: int, data: Dict[str, Any]):
    out = svc_template_render(template_id, data)
    if not out:
        return err(404, "模板不存在")
    return ok(out)


@router.post("/template/upload")
async def template_upload(file: UploadFile, name: Optional[str] = None):
    if not file:
        return err(400, "请上传文件")
    data = await file.read()
    new_id = svc_template_upload_save(filename=file.filename or "file", content=data, name=name)
    return ok({"id": new_id})


@router.get("/template/{template_id}/file")
def template_file(template_id: int):
    abs_path = svc_template_file_path(template_id)
    if not abs_path:
        return err(404, "模板无文件")
    return FileResponse(abs_path, media_type="application/octet-stream", filename=os.path.basename(abs_path))


@router.get("/status")
def status_list(request: Request):
    q = dict(request.query_params)
    pg = parse_pagination(q)
    return ok(svc_status_list(status=q.get("status"), limit=pg.limit, offset=pg.offset))


class LaunchBody(BaseModel):
    template_id: Optional[int] = None
    title: str
    person_ids: List[int]
    deadline: Optional[str] = None


@router.post("/launch")
def launch(body: LaunchBody):
    try:
        return ok(svc_launch(template_id=body.template_id, title=body.title, person_ids=body.person_ids, deadline=body.deadline))
    except ValueError as e:
        return err(400, str(e))


@router.get("/archive")
def archive(request: Request):
    q = dict(request.query_params)
    pg = parse_pagination(q)
    return ok(svc_archive_list(filters=q, limit=pg.limit, offset=pg.offset))


@router.get("/my-pending")
def my_pending(request: Request):
    resp = require_worker(request)
    if resp is not None:
        return resp
    pid = int(request.query_params.get("person_id") or request.state.user["workerId"])
    return ok(svc_my_pending(pid))


@router.get("/my-signed")
def my_signed(request: Request):
    resp = require_worker(request)
    if resp is not None:
        return resp
    pid = int(request.query_params.get("person_id") or request.state.user["workerId"])
    return ok(svc_my_signed(pid))


@router.post("/sign/{contract_id}")
def sign(request: Request, contract_id: int, body: Dict[str, Any]):
    resp = require_worker(request)
    if resp is not None:
        return resp
    pid = int(body.get("person_id") or request.state.user["workerId"])
    r = svc_sign(contract_id=contract_id, person_id=pid)
    if r == "not_found":
        return err(404, "合同不存在")
    if r == "bad_status":
        return err(400, "合同已签署或已作废")
    if r == "forbidden":
        return err(403, "无权签署")
    return ok({"ok": True})


@router.put("/{contract_id}/invalidate")
def invalidate(contract_id: int):
    r = svc_invalidate(contract_id)
    if r == "not_found":
        return err(404, "合同不存在")
    if r == "bad_status":
        return err(400, "仅已签署合同可作废")
    return ok({"ok": True})


@router.get("/{contract_id}/pdf")
def pdf(request: Request, contract_id: int):
    owner_id, abs_path = svc_pdf_path(contract_id=contract_id)
    if owner_id is None:
        return err(404, "合同不存在")
    u = get_user(request)
    if u and u.get("workerId") and int(owner_id) != int(u["workerId"]):
        return err(403, "无权查看该合同")

    if abs_path == "":
        return JSONResponse(status_code=404, content={"message": "暂无 PDF 文件", "noFile": True})
    if not os.path.exists(abs_path):
        return JSONResponse(status_code=404, content={"message": "文件不存在", "noFile": True})
    return FileResponse(abs_path, media_type="application/pdf", filename=f"contract_{contract_id}.pdf")


@router.get("/{contract_id}")
def contract_detail(contract_id: int):
    row = svc_detail(contract_id)
    if not row:
        return err(404, "不存在")
    return ok(row)


@router.get("/{contract_id}/evidence")
def evidence(request: Request, contract_id: int):
    out = svc_evidence(contract_id=contract_id)
    if out == "not_found":
        return err(404, "合同不存在")
    if out == "not_signed":
        return err(400, "合同未签署，无存证信息")
    return ok(out)


@router.get("/{contract_id}/sign-url")
def sign_url(request: Request, contract_id: int):
    resp = require_worker(request)
    if resp is not None:
        return resp
    pid = int(request.query_params.get("person_id") or request.state.user["workerId"])
    out = svc_sign_url(contract_id=contract_id, person_id=pid)
    if out == "not_found":
        return err(404, "合同不存在")
    if out == "forbidden":
        return err(403, "无权签署该合同")
    if out == "bad_status":
        return err(400, "合同已签署或已作废")
    return ok(out)

