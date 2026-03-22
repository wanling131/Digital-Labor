from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Form, Request, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse
import csv
import io
import datetime as dt
from pydantic import BaseModel
from sqlalchemy import text

from digital_labor.crypto_compat import safe_decrypt_then_mask
from digital_labor.db import get_engine
from digital_labor.pagination import parse_pagination
from digital_labor.services.aliyun_face_service import (
    enroll_person as aliyun_enroll_person,
    is_available as aliyun_face_available,
    verify_person as aliyun_verify_person,
    detect_liveness as aliyun_detect_liveness,
)
from digital_labor.services.person_service import (
    Page,
    archive_create as svc_archive_create,
    archive_delete as svc_archive_delete,
    batch_import_from_excel as svc_batch_import_from_excel,
    archive_get as svc_archive_get,
    archive_list as svc_archive_list,
    archive_update as svc_archive_update,
    certificate_create as svc_certificate_create,
    certificate_delete as svc_certificate_delete,
    certificate_update as svc_certificate_update,
    certificates_list as svc_certificates_list,
    face_verify_mark_passed as svc_face_verify_mark_passed,
    face_verify_status as svc_face_verify_status,
    job_titles as svc_job_titles,
    me_activation as svc_me_activation,
    person_simple_get as svc_person_simple_get,
    status_batch as svc_status_batch,
    status_counts as svc_status_counts,
)
from digital_labor.web.middleware import get_user, require_permission, require_worker
from digital_labor.web.response import err, ok


router = APIRouter(prefix="/api/person")


@router.get("/archive")
def archive_list(request: Request):
    q = dict(request.query_params)
    pg = parse_pagination(q)
    u = get_user(request) or {}
    actor_org_id = None
    if u.get("role") != "admin" and u.get("orgId") is not None:
        actor_org_id = int(u["orgId"])
    data = svc_archive_list(filters=q, page=Page(pg.limit, pg.offset, pg.page, pg.page_size), actor_org_id=actor_org_id)
    return ok(data)


@router.get("/archive/export")
def archive_export(request: Request):
    """
    人员档案导出（CSV），复用当前筛选条件。
    为避免一次性加载过大数据，这里简单限制最多导出 10000 条。
    需要 person:export 权限。
    """
    resp = require_permission(request, "person:export")
    if resp is not None:
        return resp
    q = dict(request.query_params)
    u = get_user(request) or {}
    actor_org_id = None
    if u.get("role") != "admin" and u.get("orgId") is not None:
        actor_org_id = int(u["orgId"])
    page = Page(limit=10000, offset=0, page=1, page_size=10000)
    data = svc_archive_list(filters=q, page=page, actor_org_id=actor_org_id)
    rows = data.get("list") or []

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "ID",
            "工号",
            "姓名",
            "身份证号(脱敏)",
            "手机号(脱敏)",
            "所属组织",
            "工种",
            "状态",
            "是否签约",
            "是否在岗",
            "创建时间",
        ]
    )
    for r in rows:
        created_at = (r.get("created_at") or "")[:19] if isinstance(r.get("created_at"), str) else r.get("created_at")
        writer.writerow(
            [
                r.get("id") or "",
                r.get("work_no") or "",
                r.get("name") or "",
                r.get("id_card") or "",
                r.get("mobile") or "",
                r.get("org_name") or "",
                r.get("job_title") or "",
                r.get("status") or "",
                "是" if r.get("contract_signed") else "否",
                "是" if r.get("on_site") else "否",
                created_at or "",
            ]
        )

    filename = f"person_export_{dt.datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue().encode("utf-8-sig")]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/archive/{person_id}")
def archive_one(person_id: int):
    row = svc_archive_get(person_id)
    if not row:
        return err(404, "不存在")
    return ok(row)


class PersonCreate(BaseModel):
    org_id: Optional[int] = None
    work_no: Optional[str] = None
    name: str
    id_card: Optional[str] = None
    mobile: Optional[str] = None
    bank_card: Optional[str] = None
    status: str = "预注册"
    job_title: Optional[str] = None


@router.post("/archive")
def archive_create(request: Request, body: PersonCreate):
    resp = require_permission(request, "person:add")
    if resp is not None:
        return resp
    try:
        new_id = svc_archive_create(body.model_dump())
    except ValueError as e:
        return err(400, str(e))
    return ok({"id": new_id})


class PersonUpdate(BaseModel):
    org_id: Optional[int] = None
    work_no: Optional[str] = None
    name: Optional[str] = None
    id_card: Optional[str] = None
    mobile: Optional[str] = None
    bank_card: Optional[str] = None
    status: Optional[str] = None
    job_title: Optional[str] = None
    work_address: Optional[str] = None
    signature_image: Optional[str] = None


@router.put("/archive/{person_id}")
def archive_update(request: Request, person_id: int, body: PersonUpdate):
    resp = require_permission(request, "person:edit")
    if resp is not None:
        return resp
    try:
        ok_ = svc_archive_update(person_id, body.model_dump(exclude_none=False, exclude_unset=True))
    except ValueError as e:
        return err(400, str(e))
    if not ok_:
        return err(404, "人员不存在")
    return ok({"ok": True})


class ActivationBody(BaseModel):
    id_card: Optional[str] = None
    mobile: Optional[str] = None
    signature_image: Optional[str] = None


@router.post("/me/activation")
def me_activation(request: Request, body: ActivationBody):
    u = get_user(request)
    worker_id = u.get("workerId") if u else None
    if not worker_id:
        return err(401, "请以工人身份登录")

    try:
        svc_me_activation(int(worker_id), body.model_dump(exclude_none=False, exclude_unset=True))
    except LookupError as e:
        return err(404, str(e))
    except ValueError as e:
        return err(400, str(e))
    return ok({"ok": True})


@router.delete("/archive/{person_id}")
def archive_delete(request: Request, person_id: int):
    resp = require_permission(request, "person:delete")
    if resp is not None:
        return resp
    ok_ = svc_archive_delete(person_id)
    if not ok_:
        return err(404, "人员不存在")
    return ok({"ok": True})


@router.post("/batch-import")
async def batch_import(request: Request, file: UploadFile, default_job_title: Optional[str] = Form(None)):
    resp = require_permission(request, "person:import")
    if resp is not None:
        return resp
    if not file or not file.filename:
        return err(400, "请上传文件")
    try:
        data = await file.read()
        r = svc_batch_import_from_excel(data, default_job_title=(default_job_title or "").strip() or None)
    except ValueError as e:
        return err(400, str(e))
    except RuntimeError as e:
        return err(500, str(e))
    if r.get("errors"):
        return JSONResponse(
            status_code=400,
            content={"message": "数据验证失败", "errors": r["errors"]},
        )
    return ok({"ok": True, "imported": r["imported"], "total": r["total"], "message": f"成功导入 {r['imported']} 条数据"})


@router.get("/import-template")
def import_template():
    """下载人员导入模板 Excel。"""
    try:
        import openpyxl  # type: ignore
    except Exception:  # noqa: BLE001
        return err(500, "缺少依赖 openpyxl")
    wb = openpyxl.Workbook()
    ws = wb.active
    if ws:
        ws.append(["姓名", "工号", "身份证号", "手机号", "组织ID", "状态", "工种"])
        ws.append(["张三", "W001", "110101199001011234", "13800138000", "1", "预注册", "瓦工"])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="人员信息导入模板.xlsx"'},
    )


@router.get("/status")
def status_counts():
    return ok(svc_status_counts())


class BatchStatus(BaseModel):
    ids: List[int]
    status: str


@router.post("/status/batch")
def status_batch(body: BatchStatus):
    if not body.ids or not body.status:
        return err(400, "ids 数组和 status 必填")
    svc_status_batch(body.ids, body.status)
    return ok({"ok": True})


@router.get("/job-titles")
def job_titles(request: Request):
    flat = (request.query_params.get("flat") or "").strip() in ("1", "true")
    return ok(svc_job_titles(flat=flat))


@router.get("/auth")
def auth_list(request: Request):
    q = dict(request.query_params)
    filled = q.get("filled")
    status = q.get("status")
    org_id = q.get("org_id")
    keyword = (q.get("keyword") or "").strip()
    job_title = q.get("job_title")
    pg = parse_pagination(q)

    # 仅使用固定条件片段 + 参数绑定，避免将用户输入拼入 SQL 字符串
    conditions: List[str] = []
    params: Dict[str, Any] = {"limit": pg.limit, "offset": pg.offset}
    if filled == "1":
        conditions.append("TRIM(COALESCE(p.id_card,'')) != '' AND TRIM(COALESCE(p.mobile,'')) != ''")
    if filled == "0":
        conditions.append("(TRIM(COALESCE(p.id_card,'')) = '' OR TRIM(COALESCE(p.mobile,'')) = '')")
    if status:
        conditions.append("p.status = :status")
        params["status"] = status
    if org_id:
        conditions.append("p.org_id = :org_id")
        params["org_id"] = int(org_id)
    if job_title:
        conditions.append("p.job_title = :job_title")
        params["job_title"] = job_title
    if keyword:
        conditions.append(
            "(LOWER(p.name) LIKE LOWER(:kw) OR LOWER(p.work_no) LIKE LOWER(:kw) OR LOWER(o.name) LIKE LOWER(:kw))"
        )
        params["kw"] = f"%{keyword}%"

    where_clause = " AND " + " AND ".join(conditions) if conditions else ""
    base_sql = "SELECT COUNT(*) FROM person p LEFT JOIN org o ON p.org_id=o.id WHERE 1=1"
    list_sql = """
        SELECT p.id, p.work_no, p.name, p.id_card, p.mobile, p.status, p.updated_at, p.auth_review_status,
               p.face_verified, p.face_verified_at, o.name as org_name
        FROM person p LEFT JOIN org o ON p.org_id=o.id
        WHERE 1=1
    """

    engine = get_engine()
    with engine.connect() as conn:
        total = conn.execute(
            text(base_sql + where_clause),
            params,
        ).scalar_one()
        rows = conn.execute(
            text(list_sql + where_clause + " ORDER BY p.updated_at DESC LIMIT :limit OFFSET :offset"),
            params,
        ).mappings().all()

    out = []
    for r in rows:
        d = dict(r)
        id_filled = bool(d.get("id_card") and str(d["id_card"]).strip())
        mobile_filled = bool(d.get("mobile") and str(d["mobile"]).strip())
        d["id_card"] = safe_decrypt_then_mask(d.get("id_card"), "idCard") if d.get("id_card") else d.get("id_card")
        d["mobile"] = safe_decrypt_then_mask(d.get("mobile"), "mobile") if d.get("mobile") else d.get("mobile")
        d["id_filled"] = id_filled
        d["mobile_filled"] = mobile_filled
        d["filled"] = id_filled and mobile_filled
        d["face_verified"] = bool(d.get("face_verified"))
        out.append(d)
    return ok({"list": out, "total": int(total), "page": pg.page, "pageSize": pg.page_size})


class AuthReviewBody(BaseModel):
    status: str


@router.put("/{person_id}/auth-review")
def auth_review(person_id: int, body: AuthReviewBody):
    if body.status not in ("approved", "rejected"):
        return err(400, "status 须为 approved 或 rejected")
    engine = get_engine()
    with engine.connect() as conn:
        exists = conn.execute(text("SELECT 1 FROM person WHERE id = :id"), {"id": person_id}).first()
    if not exists:
        return err(404, "人员不存在")
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE person SET auth_review_status = :s, updated_at = now() WHERE id = :id"),
            {"s": body.status, "id": person_id},
        )
    return ok({"ok": True, "auth_review_status": body.status})


class FaceVerifyBody(BaseModel):
    mode: str = "living"
    image: Optional[str] = None
    person_id: Optional[int] = None
    cert_name: Optional[str] = None
    cert_no: Optional[str] = None
    target_image: Optional[str] = None
    meta_info: Optional[str] = None


def _handle_face_verify_common(person_id: Optional[int], body: FaceVerifyBody):
    # 兼容 Node 行为：不同 mode 的最小参数校验
    if body.mode == "living" and not body.image:
        return err(400, "活体检测模式需要提供 image")
    if body.mode == "compare" and (not body.image or not body.target_image):
        return err(400, "人脸比对模式需要提供 image 和 target_image")
    if body.mode == "full" and (not body.cert_name or not body.cert_no):
        return err(400, "实人认证模式需要提供 cert_name 和 cert_no")
    if body.mode == "full" and not body.meta_info:
        return err(400, "实人认证需要提供 meta_info（设备环境信息）")

    # person_id 必填，否则无法标记具体人员的人脸认证状态
    if not person_id:
        return err(400, "person_id 必填")

    # 活体模式 + 已配置阿里云人脸 1:N：先活体检测，再 1:N 录入/核验
    if body.mode == "living" and body.image and aliyun_face_available():
        ok_live, live_msg = aliyun_detect_liveness(body.image)
        if not ok_live:
            return err(
                400,
                live_msg or "活体检测未通过",
                details={"mode": body.mode, "step": "liveness"},
            )
        status = svc_face_verify_status(person_id)
        face_verified = status.get("face_verified", False) if status else False
        if not face_verified:
            # 首次：录入人脸到阿里云库，成功后标记已认证
            ok_enroll, msg = aliyun_enroll_person(person_id, body.image)
            if not ok_enroll:
                return err(
                    400,
                    msg or "人脸录入失败",
                    details={"mode": body.mode, "step": "enroll"},
                )
            svc_face_verify_mark_passed(person_id)
            return ok(
                {
                    "ok": True,
                    "passed": True,
                    "message": msg,
                    "details": {"mode": body.mode, "enroll": True},
                }
            )
        # 已录入过：1:N 搜索核验
        ok_verify, msg = aliyun_verify_person(person_id, body.image)
        if not ok_verify:
            return err(
                400,
                msg or "人脸比对未通过",
                details={"mode": body.mode},
            )
        svc_face_verify_mark_passed(person_id)
        return ok(
            {
                "ok": True,
                "passed": True,
                "message": msg,
                "details": {"mode": body.mode},
            }
        )

    # 未配置阿里云或非 living 模式：保持 mock，通过则直接标记
    passed = True
    svc_face_verify_mark_passed(person_id)
    return ok(
        {
            "ok": passed,
            "passed": passed,
            "message": "核验通过" if passed else "核验未通过",
            "details": {"mode": body.mode, "mock": True},
        }
    )


@router.post("/face-verify")
def face_verify(request: Request, body: FaceVerifyBody):
    """
    工人端人脸验证：仅允许当前登录工人操作自己的记录。
    - person_id 不再信任 body 中传入的值，而是统一使用 token 中的 workerId。
    """
    resp = require_worker(request)
    if resp is not None:
        return resp
    worker_id = int(request.state.user["workerId"])
    return _handle_face_verify_common(worker_id, body)


@router.post("/{person_id}/face-verify")
def face_verify_for_person(request: Request, person_id: int, body: FaceVerifyBody):
    """
    管理端为指定人员触发人脸验证（如人工辅助录入）。
    需要具备人员编辑权限。
    """
    resp = require_permission(request, "person:edit")
    if resp is not None:
        return resp
    return _handle_face_verify_common(person_id, body)


@router.get("/{person_id}/face-verify-status")
def face_verify_status(person_id: int):
    row = svc_face_verify_status(person_id)
    if not row:
        return err(404, "人员不存在")
    return ok(row)


@router.get("/{person_id}")
def person_simple(person_id: int):
    row = svc_person_simple_get(person_id)
    if not row:
        return err(404, "不存在")
    return ok(row)


@router.get("/archive/{person_id}/certificates")
def certificates(person_id: int):
    out = svc_certificates_list(person_id)
    if out is None:
        return err(404, "人员不存在")
    return ok(out)


class CertBody(BaseModel):
    name: str
    certificate_no: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    status: str = "valid"


@router.post("/archive/{person_id}/certificates")
def cert_create(person_id: int, body: CertBody):
    try:
        new_id = svc_certificate_create(person_id, body.model_dump())
    except ValueError as e:
        return err(400, str(e))
    if new_id is None:
        return err(404, "人员不存在")
    return ok({"id": new_id})


@router.put("/archive/{person_id}/certificates/{cert_id}")
def cert_update(person_id: int, cert_id: int, body: CertBody):
    try:
        r = svc_certificate_update(person_id, cert_id, body.model_dump(exclude_none=False, exclude_unset=True))
    except ValueError as e:
        return err(400, str(e))
    if r == "no_person":
        return err(404, "人员不存在")
    if r == "no_cert":
        return err(404, "证书不存在")
    return ok({"ok": True})


@router.delete("/archive/{person_id}/certificates/{cert_id}")
def cert_delete(person_id: int, cert_id: int):
    r = svc_certificate_delete(person_id, cert_id)
    if r == "no_cert":
        return err(404, "证书不存在")
    return ok({"ok": True})

