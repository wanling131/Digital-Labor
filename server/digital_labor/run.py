from __future__ import annotations

import logging
import os
import sys
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from digital_labor.controllers.auth import router as auth_router
from digital_labor.controllers.attendance import router as attendance_router
from digital_labor.controllers.health import router as health_router
from digital_labor.controllers.data import router as data_router
from digital_labor.controllers.monitor import router as monitor_router
from digital_labor.controllers.notify import router as notify_router
from digital_labor.controllers.person import router as person_router
from digital_labor.controllers.settlement import router as settlement_router
from digital_labor.controllers.site import router as site_router
from digital_labor.controllers.sys import router as sys_router
from digital_labor.controllers.worker import router as worker_router
from digital_labor.controllers.contract import router as contract_router
from digital_labor.settings import settings
from digital_labor.web.middleware import AuthMiddleware


def setup_logging() -> None:
    """配置日志格式和级别。"""
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    log_format = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"

    # 配置根日志
    logging.basicConfig(
        level=getattr(logging, log_level, logging.INFO),
        format=log_format,
        handlers=[logging.StreamHandler(sys.stdout)],
    )

    # 降低第三方库日志级别
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


def create_app() -> FastAPI:
    app = FastAPI(title="Digital Labor API", description="与前端兼容的 REST API（FastAPI + PostgreSQL）")

    @app.exception_handler(Exception)
    def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """未捕获异常统一返回 500 JSON，避免挂起或暴露堆栈。"""
        logging.exception("Unhandled exception at %s: %s", request.url.path, exc)
        return JSONResponse(
            status_code=500,
            content={"code": "INTERNAL_ERROR", "message": "服务暂时不可用，请稍后重试"},
        )

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        """请求日志中间件，记录请求耗时。"""
        # 跳过健康检查和静态资源的日志
        if request.url.path in ("/api/health", "/favicon.ico") or request.url.path.startswith("/uploads/"):
            return await call_next(request)

        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time

        # 只记录慢请求(>1s)或非2xx响应
        if process_time > 1.0 or response.status_code >= 400:
            logging.getLogger("api.request").warning(
                "%s %s - %d - %.3fs",
                request.method,
                request.url.path,
                response.status_code,
                process_time,
            )
        return response

    @app.on_event("startup")
    def startup_check() -> None:
        """启动时尝试连接数据库，失败仅打日志，不阻止启动。"""
        try:
            from sqlalchemy import text
            from digital_labor.db import get_engine
            from digital_labor.settings import settings

            # SQLite 演示库需要较新的 SQLite 版本（用于 ON CONFLICT / UPSERT 等语法）。
            # 若系统自带 SQLite 过老，会在运行时出现“near ON: syntax error”之类问题，提前给出明确提示。
            if settings.database_url.strip().lower().startswith("sqlite:"):
                import sqlite3

                min_ver = (3, 24, 0)
                if sqlite3.sqlite_version_info < min_ver:
                    raise RuntimeError(
                        "当前 SQLite 版本过低，无法支持演示所需的 UPSERT 语法。"
                        f"需要 >= {min_ver[0]}.{min_ver[1]}.{min_ver[2]}，"
                        f"当前为 {sqlite3.sqlite_version}。"
                        "建议升级 Python/SQLite，或改用 PostgreSQL（DATABASE_URL 指向 PostgreSQL）。"
                    )
            with get_engine().connect() as conn:
                conn.execute(text("SELECT 1"))
        except Exception as e:  # noqa: BLE001
            logging.warning("Database unreachable at startup: %s", e)
        else:
            try:
                from digital_labor.db_migrations import run_attendance_overtime_migration
                run_attendance_overtime_migration()
            except Exception as e:  # noqa: BLE001
                logging.warning("Migration run_attendance_overtime failed: %s", e)
            # 移除不存在的迁移函数引用
            try:
                from digital_labor.db_migrations import ensure_user_role_has_export_permission
                ensure_user_role_has_export_permission()
            except Exception as e:  # noqa: BLE001
                logging.warning("Migration ensure_user_role_has_export_permission failed: %s", e)
            try:
                from digital_labor.db_migrations import run_job_title_config_migration
                run_job_title_config_migration()
            except Exception as e:  # noqa: BLE001
                logging.warning("Migration run_job_title_config failed: %s", e)
            try:
                from digital_labor.db_migrations import run_role_org_scope_migration
                run_role_org_scope_migration()
            except Exception as e:  # noqa: BLE001
                logging.warning("Migration run_role_org_scope failed: %s", e)
            try:
                from digital_labor.db_migrations import run_performance_indexes
                run_performance_indexes()
            except Exception as e:  # noqa: BLE001
                logging.warning("Migration run_performance_indexes failed: %s", e)
            try:
                from digital_labor.services.sys_admin_service import seed_op_log_if_empty
                seed_op_log_if_empty()
            except Exception as e:  # noqa: BLE001
                logging.warning("Seed op_log failed: %s", e)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Token-Refresh"],
    )
    app.add_middleware(AuthMiddleware)

    # 静态资源：保持与 Node 端一致的 /uploads 访问方式
    from digital_labor.paths import get_paths

    uploads_dir = get_paths().uploads_root
    if os.path.isdir(uploads_dir):
        app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(sys_router)
    app.include_router(person_router)
    app.include_router(worker_router)
    app.include_router(notify_router)
    app.include_router(attendance_router)
    app.include_router(settlement_router)
    app.include_router(contract_router)
    app.include_router(data_router)
    app.include_router(monitor_router)
    app.include_router(site_router)
    return app


def main() -> None:
    # 配置日志
    setup_logging()
    logger = logging.getLogger(__name__)
    logger.info("Starting Digital Labor API server on port %d", settings.port)

    # dtcloud 原生启动方式后续会接入；目前先用 uvicorn 跑通最小可用 API。
    import uvicorn

    uvicorn.run(
        "digital_labor.run:create_app",
        host="0.0.0.0",
        port=settings.port,
        factory=True,
        reload=os.getenv("RELOAD", "0") == "1",
        log_level=os.getenv("LOG_LEVEL", "info").lower(),
    )


if __name__ == "__main__":
    main()

