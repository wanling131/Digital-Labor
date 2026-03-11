from __future__ import annotations

from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

from digital_labor.settings import settings


# 连接超时（秒），避免 PostgreSQL 不可达时请求长时间挂起
_CONNECT_TIMEOUT = 5


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    url = settings.database_url
    # sqlite 不支持 connect_timeout 这个参数
    if url.strip().lower().startswith("sqlite:"):
        return create_engine(url, future=True, pool_pre_ping=True)
    return create_engine(
        url,
        future=True,
        pool_pre_ping=True,
        connect_args={"connect_timeout": _CONNECT_TIMEOUT},
    )

