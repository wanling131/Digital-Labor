from __future__ import annotations

from digital_labor.dtcloud_layer.common import render_json, require_user_id, require_worker_id
from digital_labor.settings import settings
from digital_labor.services.auth_service import admin_login, worker_login, worker_qrcode_login
from digital_labor.services.health_service import api_root_payload, health_payload
from digital_labor.services import sys_admin_service
from digital_labor.services.sys_service import feature_status_payload
from digital_labor.services.person_service import (
    Page,
    archive_create as svc_archive_create,
    archive_delete as svc_archive_delete,
    archive_get,
    archive_list,
    archive_update as svc_archive_update,
    job_titles as job_titles_svc,
    status_counts,
)
from digital_labor.services.worker_service import get_me as worker_get_me
from digital_labor.services.worker_service import my_certificates as worker_my_certificates
from digital_labor.services.notify_service import list_notifications as notify_list
from digital_labor.services.notify_service import mark_read as notify_mark_read
from digital_labor.services.attendance_service import clock as att_clock
from digital_labor.services.attendance_service import clock_log as att_clock_log
from digital_labor.services.attendance_service import my_attendance as att_my
from digital_labor.services.attendance_service import report as att_report
from digital_labor.services.settlement_service import confirm as set_confirm
from digital_labor.services.settlement_service import confirm_list as set_confirm_list
from digital_labor.services.settlement_service import generate as set_generate
from digital_labor.services.settlement_service import my_all as set_my
from digital_labor.services.settlement_service import my_pending as set_my_pending
from digital_labor.services.settlement_service import push_notify as set_push_notify
from digital_labor.services.contract_service import my_pending as c_my_pending
from digital_labor.services.contract_service import my_signed as c_my_signed
from digital_labor.services.contract_service import status_list as c_status_list
from digital_labor.services.contract_service import template_list as c_template_list
from digital_labor.services.site_service import board as site_board
from digital_labor.services.site_service import leave as site_leave
from digital_labor.services.data_service import board_payload as data_board
from digital_labor.services.data_service import board_trend_payload as data_trend
from digital_labor.services.monitor_service import health as mon_health

try:
    # dtcloud 的路由声明
    from dtcloud import http  # type: ignore
except (ImportError, ModuleNotFoundError):
    # 允许在未安装 dtcloud 依赖时进行静态分析/导入
    http = None  # type: ignore


if http:
    _CORS = settings.cors_allow_origins.strip() or "*"

    class HealthController(http.Controller):  # type: ignore[misc]
        @http.route("/api/health", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def health(self, **kw):  # noqa: ANN001
            return health_payload()

        @http.route("/api", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def api_root(self, **kw):  # noqa: ANN001
            return api_root_payload()

    class SysController(http.Controller):  # type: ignore[misc]
        @http.route("/api/sys/feature-status", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def feature_status(self, **kw):  # noqa: ANN001
            return feature_status_payload()

        @http.route("/api/sys/org", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def org(self, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            return sys_admin_service.org_tree()

        @http.route("/api/sys/org", type="json", methods=["POST"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def org_create(self, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            try:
                new_id = sys_admin_service.org_create(kw)
            except ValueError as e:
                return {"code": "BAD_REQUEST", "message": str(e)}
            return {"id": int(new_id)}

        @http.route("/api/sys/org/<int:org_id>", type="json", methods=["PUT"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def org_update(self, org_id, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            try:
                sys_admin_service.org_update(int(org_id), kw)
            except ValueError as e:
                return {"code": "BAD_REQUEST", "message": str(e)}
            return {"ok": True}

        @http.route("/api/sys/org/<int:org_id>", type="http", methods=["DELETE"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def org_delete(self, org_id, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            r = sys_admin_service.org_delete(int(org_id))
            if r == "has_child":
                return {"code": "BAD_REQUEST", "message": "请先删除子节点"}
            return {"ok": True}

        @http.route("/api/sys/user", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def user_list(self, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            return sys_admin_service.user_list()

        @http.route("/api/sys/user", type="json", methods=["POST"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def user_create(self, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            try:
                r = sys_admin_service.user_create(kw)
            except ValueError as e:
                return {"code": "BAD_REQUEST", "message": str(e)}
            if r == "duplicate":
                return {"code": "BAD_REQUEST", "message": "用户名已存在"}
            return {"id": int(r)}

        @http.route("/api/sys/user/<int:user_id>", type="json", methods=["PUT"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def user_update(self, user_id, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            try:
                sys_admin_service.user_update(int(user_id), kw)
            except ValueError as e:
                return {"code": "BAD_REQUEST", "message": str(e)}
            return {"ok": True}

        @http.route("/api/sys/my-menu", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def my_menu(self, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            return sys_admin_service.my_menu(int(uid))

        @http.route("/api/sys/all-menus", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def all_menus(self, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            return sys_admin_service.all_menus()

        @http.route("/api/sys/role", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def roles(self, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            return sys_admin_service.roles_summary()

        @http.route("/api/sys/role/<string:code>/menus", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def role_menus(self, code, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            return sys_admin_service.role_menus(str(code))

        @http.route("/api/sys/role/<string:code>/menus", type="json", methods=["PUT"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def role_menus_save(self, code, paths=None, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            return sys_admin_service.role_menus_save(str(code), list(paths or []))

        @http.route("/api/sys/role/<string:code>/permissions", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def role_permissions(self, code, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            return sys_admin_service.role_permissions(str(code))

        @http.route("/api/sys/role/<string:code>/permissions", type="json", methods=["PUT"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def role_permissions_save(self, code, keys=None, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            return sys_admin_service.role_permissions_save(str(code), list(keys or []))

        @http.route("/api/sys/all-permissions", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def all_permissions(self, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            return sys_admin_service.all_permissions()

        @http.route("/api/sys/my-permissions", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def my_permissions(self, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            return sys_admin_service.my_permissions(int(uid))

        @http.route("/api/sys/log", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def op_log(self, page=1, pageSize=50, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            page = int(page or 1)
            pageSize = int(pageSize or 50)
            if page < 1:
                page = 1
            if pageSize < 1:
                pageSize = 50
            if pageSize > 100:
                pageSize = 100
            limit = pageSize
            offset = (page - 1) * pageSize
            return sys_admin_service.op_log_list(limit=limit, offset=offset)

    class AuthController(http.Controller):  # type: ignore[misc]
        @http.route("/api/auth/login", type="json", methods=["POST"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def login(self, username=None, password=None, **kw):  # noqa: ANN001
            r = admin_login(username or "", password or "")
            if not r:
                # dtcloud 侧错误映射后续统一处理；这里先返回与 Node 相同的语义
                return {"code": "UNAUTHORIZED", "message": "用户名或密码错误"}
            return {"token": r.token, "user": r.user}

        @http.route("/api/auth/worker-login", type="json", methods=["POST"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def worker_login(self, person_id=None, work_no=None, name=None, mobile=None, password=None, **kw):  # noqa: ANN001
            r = worker_login(person_id=person_id, work_no=work_no, name=name, mobile=mobile, password=password)
            if not r:
                return {"code": "UNAUTHORIZED", "message": "未找到对应人员"}
            return {"token": r.token, "person": r.person}

        @http.route("/api/auth/worker-qrcode-login", type="json", methods=["POST"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def worker_qrcode_login(self, scene=None, **kw):  # noqa: ANN001
            out = worker_qrcode_login(scene or "")
            if out.get("error"):
                return {"code": "BAD_REQUEST", "message": out["error"]}
            return out

    class PersonController(http.Controller):  # type: ignore[misc]
        @http.route("/api/person/archive", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def archive(self, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            # dtcloud 的 kw 就是 query_params；分页参数按 Node 约定 page/pageSize
            page = int(kw.get("page") or 1)
            page_size = int(kw.get("pageSize") or 20)
            if page < 1:
                page = 1
            if page_size < 1:
                page_size = 20
            if page_size > 100:
                page_size = 100
            limit = page_size
            offset = (page - 1) * page_size
            return archive_list(filters=kw, page=Page(limit=limit, offset=offset, page=page, page_size=page_size))

        @http.route("/api/person/archive/<int:person_id>", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def archive_one(self, person_id, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            row = archive_get(int(person_id))
            return row or {"code": "NOT_FOUND", "message": "不存在"}

        @http.route("/api/person/archive", type="json", methods=["POST"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def archive_create(self, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            try:
                new_id = svc_archive_create(kw)
            except Exception as e:  # noqa: BLE001
                return {"code": "BAD_REQUEST", "message": str(e)}
            return {"id": new_id}

        @http.route("/api/person/archive/<int:person_id>", type="json", methods=["PUT"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def archive_update(self, person_id, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            try:
                ok_ = svc_archive_update(int(person_id), kw)
            except Exception as e:  # noqa: BLE001
                return {"code": "BAD_REQUEST", "message": str(e)}
            if not ok_:
                return {"code": "NOT_FOUND", "message": "人员不存在"}
            return {"ok": True}

        @http.route("/api/person/archive/<int:person_id>", type="http", methods=["DELETE"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def archive_delete(self, person_id, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            ok_ = svc_archive_delete(int(person_id))
            if not ok_:
                return {"code": "NOT_FOUND", "message": "人员不存在"}
            return {"ok": True}

        @http.route("/api/person/status", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def status(self, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            return status_counts()

        @http.route("/api/person/job-titles", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def job_titles(self, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            return job_titles_svc()

    class WorkerController(http.Controller):  # type: ignore[misc]
        @http.route("/api/worker/me", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def me(self, **kw):  # noqa: ANN001
            wid = require_worker_id()
            if isinstance(wid, dict):
                return wid
            row = worker_get_me(int(wid))
            return row or {"code": "NOT_FOUND", "message": "人员不存在"}

        @http.route("/api/worker/certificates", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def certificates(self, **kw):  # noqa: ANN001
            wid = require_worker_id()
            if isinstance(wid, dict):
                return wid
            return worker_my_certificates(int(wid))

    class NotifyController(http.Controller):  # type: ignore[misc]
        @http.route("/api/notify/list", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def list(self, page=1, pageSize=20, **kw):  # noqa: ANN001
            wid = require_worker_id()
            if isinstance(wid, dict):
                return wid
            page = int(page or 1)
            pageSize = int(pageSize or 20)
            if page < 1:
                page = 1
            if pageSize < 1:
                pageSize = 20
            if pageSize > 100:
                pageSize = 100
            limit = pageSize
            offset = (page - 1) * pageSize
            return notify_list(worker_id=int(wid), limit=limit, offset=offset)

        @http.route("/api/notify/<int:notify_id>/read", type="http", methods=["PUT"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def read(self, notify_id, **kw):  # noqa: ANN001
            wid = require_worker_id()
            if isinstance(wid, dict):
                return wid
            ok_ = notify_mark_read(worker_id=int(wid), notify_id=int(notify_id))
            if not ok_:
                return {"code": "NOT_FOUND", "message": "不存在"}
            return {"ok": True}

    class AttendanceController(http.Controller):  # type: ignore[misc]
        @http.route("/api/attendance/report", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def report(self, page=1, pageSize=50, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            page = int(page or 1)
            pageSize = int(pageSize or 50)
            if page < 1:
                page = 1
            if pageSize < 1:
                pageSize = 50
            if pageSize > 100:
                pageSize = 100
            limit = pageSize
            offset = (page - 1) * pageSize
            return att_report(filters=kw, limit=limit, offset=offset)

        @http.route("/api/attendance/my", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def my(self, person_id=None, year=None, month=None, **kw):  # noqa: ANN001
            pid = int(person_id or 0)
            if not pid:
                wid = require_worker_id()
                if isinstance(wid, dict):
                    return wid
                pid = int(wid)
            else:
                uid = require_user_id()
                if isinstance(uid, dict):
                    return uid
            return att_my(person_id=pid, year=year, month=month)

        @http.route("/api/attendance/clock", type="json", methods=["POST"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def clock(self, type=None, **kw):  # noqa: ANN001
            wid = require_worker_id()
            if isinstance(wid, dict):
                return wid
            try:
                return att_clock(person_id=int(wid), typ=str(type))
            except Exception as e:  # noqa: BLE001
                return {"code": "BAD_REQUEST", "message": str(e)}

        @http.route("/api/attendance/log", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def log(self, page=1, pageSize=50, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            page = int(page or 1)
            pageSize = int(pageSize or 50)
            if page < 1:
                page = 1
            if pageSize < 1:
                pageSize = 50
            if pageSize > 200:
                pageSize = 200
            limit = pageSize
            offset = (page - 1) * pageSize
            return att_clock_log(filters=kw, limit=limit, offset=offset)

    class SettlementController(http.Controller):  # type: ignore[misc]
        @http.route("/api/settlement/my-pending", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def my_pending(self, person_id=None, **kw):  # noqa: ANN001
            pid = int(person_id or 0)
            if not pid:
                wid = require_worker_id()
                if isinstance(wid, dict):
                    return wid
                pid = int(wid)
            else:
                uid = require_user_id()
                if isinstance(uid, dict):
                    return uid
            return set_my_pending(pid)

        @http.route("/api/settlement/my", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def my(self, person_id=None, **kw):  # noqa: ANN001
            pid = int(person_id or 0)
            if not pid:
                wid = require_worker_id()
                if isinstance(wid, dict):
                    return {"code": "BAD_REQUEST", "message": "person_id 必填或请登录"}
                pid = int(wid)
            return set_my(pid)

        @http.route("/api/settlement/confirm", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def confirm_list(self, page=1, pageSize=20, status=None, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            page = int(page or 1)
            pageSize = int(pageSize or 20)
            if page < 1:
                page = 1
            if pageSize < 1:
                pageSize = 20
            if pageSize > 100:
                pageSize = 100
            limit = pageSize
            offset = (page - 1) * pageSize
            return set_confirm_list(status=status, limit=limit, offset=offset)

        @http.route("/api/settlement/generate", type="json", methods=["POST"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def generate(self, period_start=None, period_end=None, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            if not period_start or not period_end:
                return {"code": "BAD_REQUEST", "message": "period_start、period_end 必填"}
            return set_generate(period_start, period_end)

        @http.route("/api/settlement/push-notify", type="json", methods=["POST"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def push_notify(self, ids=None, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            return set_push_notify(ids)

    class ContractController(http.Controller):  # type: ignore[misc]
        @http.route("/api/contract/template", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def template_list(self, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            return c_template_list()

        @http.route("/api/contract/status", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def status(self, page=1, pageSize=20, status=None, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            page = int(page or 1)
            pageSize = int(pageSize or 20)
            if page < 1:
                page = 1
            if pageSize < 1:
                pageSize = 20
            if pageSize > 100:
                pageSize = 100
            limit = pageSize
            offset = (page - 1) * pageSize
            return c_status_list(status=status, limit=limit, offset=offset)

        @http.route("/api/contract/my-pending", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def my_pending(self, person_id=None, **kw):  # noqa: ANN001
            pid = int(person_id or 0)
            if not pid:
                wid = require_worker_id()
                if isinstance(wid, dict):
                    return wid
                pid = int(wid)
            else:
                uid = require_user_id()
                if isinstance(uid, dict):
                    return uid
            return c_my_pending(pid)

        @http.route("/api/contract/my-signed", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def my_signed(self, person_id=None, **kw):  # noqa: ANN001
            pid = int(person_id or 0)
            if not pid:
                wid = require_worker_id()
                if isinstance(wid, dict):
                    return wid
                pid = int(wid)
            else:
                uid = require_user_id()
                if isinstance(uid, dict):
                    return uid
            return c_my_signed(pid)

    class SiteController(http.Controller):  # type: ignore[misc]
        @http.route("/api/site/board", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def board(self, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            return site_board()

        @http.route("/api/site/leave", type="json", methods=["POST"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def leave(self, person_id=None, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            if not person_id:
                return {"code": "BAD_REQUEST", "message": "person_id 必填"}
            return site_leave(int(person_id))

    class DataController(http.Controller):  # type: ignore[misc]
        @http.route("/api/data/board", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def board(self, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            return data_board()

        @http.route("/api/data/board/trend", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def trend(self, days=30, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            return data_trend(int(days or 30))

    class MonitorController(http.Controller):  # type: ignore[misc]
        @http.route("/api/monitor/health", type="http", methods=["GET"], auth="none", sitemap=False, csrf=False, cors=_CORS)  # type: ignore[attr-defined]
        @render_json
        def health(self, **kw):  # noqa: ANN001
            uid = require_user_id()
            if isinstance(uid, dict):
                return uid
            payload, _ = mon_health()
            return payload

