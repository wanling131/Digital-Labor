from __future__ import annotations

import os
import sys
from typing import Optional

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine


def _ensure_backend_on_path() -> None:
    """
    将 server 加入 sys.path，便于重用 digital_labor.settings 配置。

    设计为幂等调用，多次调用也不会重复插入路径。
    """

    root = os.path.dirname(os.path.dirname(__file__))
    backend = os.path.join(root, "server")
    if backend not in sys.path:
        sys.path.insert(0, backend)


def get_database_url(override: Optional[str] = None) -> str:
    """
    优先顺序：
    1) 参数 override
    2) 环境变量 DATABASE_URL
    3) server.digital_labor.settings.Settings.database_url
    """

    if override:
        return override
    env = os.getenv("DATABASE_URL")
    if env:
        return env

    _ensure_backend_on_path()
    try:
        from digital_labor.settings import settings  # type: ignore
    except Exception as e:  # noqa: BLE001
        raise RuntimeError("无法导入 digital_labor.settings，请确保 server 可用") from e
    return settings.database_url


def get_engine(database_url: str) -> Engine:
    """
    创建 SQLAlchemy Engine。

    不直接重用 digital_labor.db.get_engine 是为了允许覆写 DATABASE_URL，
    同时避免与应用运行时全局 Engine 混用。
    """

    return create_engine(database_url, future=True)  # pool 设置交给 PostgreSQL 自身

