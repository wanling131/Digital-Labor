from __future__ import annotations

from typing import Any, List, Optional

from fastapi import APIRouter, Request, UploadFile
from pydantic import BaseModel

from digital_labor.pagination import parse_pagination
from digital_labor.services import sys_admin_service
from digital_labor.services.job_title_config_service import list_all, get_one, create, update, delete as delete_job_title
from digital_labor.services.sys_service import feature_status_payload
from digital_labor.web.middleware import get_user
from digital_labor.web.response import err, ok


router = APIRouter(prefix="/api/sys")


@router.get("/feature-status")
def feature_status():
    return ok(feature_status_payload())


class OrgCreate(BaseModel):
    parent_id: int = 0
    name: str
    type: str = "company"
    sort: int = 0
    manager: Optional[str] = None


class OrgUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    sort: Optional[int] = None
    manager: Optional[str] = None


@router.get("/org")
def get_org():
    return ok(sys_admin_service.org_tree())


@router.post("/org")
def create_org(body: OrgCreate):
    try:
        new_id = sys_admin_service.org_create(body.model_dump())
    except ValueError as e:
        return err(400, str(e))
    return ok({"id": int(new_id)})


@router.put("/org/{org_id}")
def update_org(org_id: int, body: OrgUpdate):
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    try:
        sys_admin_service.org_update(org_id, patch)
    except ValueError as e:
        return err(400, str(e))
    return ok({"ok": True})


@router.delete("/org/{org_id}")
def delete_org(org_id: int):
    r = sys_admin_service.org_delete(org_id)
    if r == "has_child":
        return err(400, "请先删除子节点")
    return ok({"ok": True})


@router.get("/user")
def user_list():
    return ok(sys_admin_service.user_list())


class UserCreate(BaseModel):
    username: str
    password: str
    name: Optional[str] = None
    org_id: Optional[int] = None
    role: str = "admin"


@router.post("/user")
def user_create(body: UserCreate):
    try:
        r = sys_admin_service.user_create(body.model_dump())
    except ValueError as e:
        return err(400, str(e))
    if r == "duplicate":
        return err(400, "用户名已存在")
    return ok({"id": int(r)})


class UserUpdate(BaseModel):
    name: Optional[str] = None
    org_id: Optional[int] = None
    role: Optional[str] = None
    enabled: Optional[bool] = None
    password: Optional[str] = None


@router.put("/user/{user_id}")
def user_update(user_id: int, body: UserUpdate):
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    try:
        sys_admin_service.user_update(user_id, patch)
    except ValueError as e:
        return err(400, str(e))
    return ok({"ok": True})


@router.get("/my-menu")
def my_menu(request: Request):
    u = get_user(request)
    user_id = u.get("userId") if u else None
    if not user_id:
        return err(401, "未登录")
    return ok(sys_admin_service.my_menu(int(user_id)))


@router.get("/all-menus")
def all_menus():
    return ok(sys_admin_service.all_menus())


@router.get("/role")
def roles():
    return ok(sys_admin_service.roles_summary())


@router.get("/role/{code}/menus")
def role_menus(code: str):
    return ok(sys_admin_service.role_menus(code))


class PathsBody(BaseModel):
    paths: List[str]


@router.put("/role/{code}/menus")
def role_menus_save(code: str, body: PathsBody):
    return ok(sys_admin_service.role_menus_save(code, body.paths))


@router.get("/role/{code}/permissions")
def role_permissions(code: str):
    return ok(sys_admin_service.role_permissions(code))


class KeysBody(BaseModel):
    keys: List[str]


@router.put("/role/{code}/permissions")
def role_permissions_save(code: str, body: KeysBody):
    return ok(sys_admin_service.role_permissions_save(code, body.keys))


@router.get("/all-permissions")
def all_permissions():
    return ok(sys_admin_service.all_permissions())


@router.get("/my-permissions")
def my_permissions(request: Request):
    u = get_user(request)
    user_id = u.get("userId") if u else None
    if not user_id:
        return err(401, "未登录")
    return ok(sys_admin_service.my_permissions(int(user_id)))


@router.get("/log")
def op_log(request: Request):
    pg = parse_pagination(dict(request.query_params), default_page_size=50, max_page_size=100)
    return ok(sys_admin_service.op_log_list(pg.limit, pg.offset))


# --- 用户 Excel 导入（兼容接口存在，先实现最小可用） ---
@router.post("/user/import")
async def user_import(file: UploadFile):
    if not file:
        return err(400, "请上传 Excel 文件")
    data = await file.read()
    try:
        r = sys_admin_service.import_users_from_excel(data)
    except ValueError as e:
        return err(400, str(e))
    except RuntimeError as e:
        return err(500, str(e))
    return ok({"ok": True, "count": r.count, "errors": r.errors})


@router.get("/profile")
def profile(request: Request):
    """
    当前登录用户的个人资料（管理端）。
    """
    u = get_user(request)
    user_id = u.get("userId") if u else None
    if not user_id:
        return err(401, "未登录")
    row = sys_admin_service.my_profile(int(user_id))
    if not row:
        return err(404, "用户不存在")
    return ok(row)


class ProfileUpdateBody(BaseModel):
    name: Optional[str] = None


@router.put("/profile")
def profile_update(request: Request, body: ProfileUpdateBody):
    u = get_user(request)
    user_id = u.get("userId") if u else None
    if not user_id:
        return err(401, "未登录")
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    try:
        sys_admin_service.profile_update(int(user_id), patch)
    except ValueError as e:
        return err(400, str(e))
    return ok({"ok": True})


class ChangePasswordBody(BaseModel):
    old_password: str
    new_password: str


@router.post("/profile/change-password")
def change_password(request: Request, body: ChangePasswordBody):
    u = get_user(request)
    user_id = u.get("userId") if u else None
    if not user_id:
        return err(401, "未登录")
    try:
        r = sys_admin_service.change_password(int(user_id), body.old_password, body.new_password)
    except ValueError as e:
        return err(400, str(e))
    if r == "no_user":
        return err(404, "用户不存在")
    if r == "bad_old_password":
        return err(400, "旧密码不正确")
    return ok({"ok": True})


class JobTitleCreate(BaseModel):
    code: Optional[str] = None
    name: str
    parent_id: Optional[int] = None
    sort: int = 0


class JobTitleUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    parent_id: Optional[int] = None
    sort: Optional[int] = None


@router.get("/job-title-config")
def get_job_title_config():
    return ok(list_all())


@router.post("/job-title-config")
def create_job_title(body: JobTitleCreate):
    try:
        new_id = create(body.model_dump())
    except ValueError as e:
        return err(400, str(e))
    return ok({"id": new_id})


@router.put("/job-title-config/{config_id}")
def update_job_title(config_id: int, body: JobTitleUpdate):
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    try:
        update(config_id, patch)
    except ValueError as e:
        return err(400, str(e))
    return ok({"ok": True})


@router.delete("/job-title-config/{config_id}")
def delete_job_title_endpoint(config_id: int):
    r = delete_job_title(config_id)
    if r == "has_child":
        return err(400, "请先删除子节点")
    return ok({"ok": True})

