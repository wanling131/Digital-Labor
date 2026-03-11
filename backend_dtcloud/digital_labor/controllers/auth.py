from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel
from digital_labor.services.auth_service import (
    admin_login,
    worker_login as worker_login_service,
    worker_qrcode_login as worker_qrcode_login_service,
)
from digital_labor.web.response import err, ok


router = APIRouter(prefix="/api/auth")


class LoginBody(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None


@router.post("/login")
def login(body: LoginBody):
    u = (body.username or "").strip()
    p = body.password or ""
    if not u or not p:
        return err(400, "用户名和密码必填")
    try:
        r = admin_login(u, p)
    except Exception:  # 数据库不可达/超时等，统一返回 503
        return err(503, "服务暂时不可用，请检查数据库连接")
    if not r:
        return err(401, "用户名或密码错误")
    return ok({"token": r.token, "user": r.user})


class WorkerLoginBody(BaseModel):
    person_id: Optional[int] = None
    work_no: Optional[str] = None
    name: Optional[str] = None
    mobile: Optional[str] = None
    password: Optional[str] = None


WORKER_DEMO_PASSWORD = "123456"


@router.post("/worker-login")
def worker_login_endpoint(body: WorkerLoginBody):
    try:
        r = worker_login_service(
            person_id=body.person_id,
            work_no=body.work_no,
            name=body.name,
            mobile=body.mobile,
            password=body.password,
        )
    except Exception:
        return err(503, "服务暂时不可用，请检查数据库连接")
    if not r:
        # 与 Node 文案保持一致（粗粒度）
        return err(401, "未找到对应人员")
    return ok({"token": r.token, "person": r.person})


class WorkerQrBody(BaseModel):
    scene: Optional[str] = None


@router.post("/worker-qrcode-login")
def worker_qrcode_login_endpoint(body: WorkerQrBody):
    raw = (body.scene or "").strip()
    if not raw:
        return err(400, "scene 必填")
    out = worker_qrcode_login_service(raw)
    if out.get("error"):
        return err(int(out.get("status") or 400), str(out["error"]))
    return ok(out)


@router.post("/logout")
def logout() -> Any:
    """
    管理端退出登录。

    当前 JWT 为无状态实现，服务端无需维护会话，只需让前端清理本地 token。
    预留接口便于未来接入服务端会话/黑名单。
    """
    return ok({"ok": True})

