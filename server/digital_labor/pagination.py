from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict


@dataclass(frozen=True)
class Pagination:
    limit: int
    offset: int
    page: int
    page_size: int


def parse_pagination(query: Dict[str, Any], *, default_page_size: int = 20, max_page_size: int = 100) -> Pagination:
    page = int(query.get("page") or 1)
    page_size = int(query.get("pageSize") or default_page_size)
    page = 1 if page < 1 else page
    if page_size < 1:
        page_size = default_page_size
    if page_size > max_page_size:
        page_size = max_page_size
    offset = (page - 1) * page_size
    return Pagination(limit=page_size, offset=offset, page=page, page_size=page_size)

