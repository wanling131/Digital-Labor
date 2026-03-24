"""权限相关的工具函数。"""
from __future__ import annotations

from typing import List, Optional, Tuple

from sqlalchemy import bindparam, text

from digital_labor.db import get_engine


def get_org_tree_ids(org_id: int) -> List[int]:
    """
    获取指定组织及其所有子组织的ID列表。
    使用递归CTE查询组织树。

    Args:
        org_id: 组织ID

    Returns:
        包含该组织及其所有子组织的ID列表
    """
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(
            text('''WITH RECURSIVE org_hierarchy(id) AS (
                SELECT id FROM org WHERE id = :org_id
                UNION ALL
                SELECT o.id FROM org o JOIN org_hierarchy oh ON o.parent_id = oh.id
            ) SELECT id FROM org_hierarchy'''),
            {"org_id": int(org_id)}
        ).scalars().all()
        return [int(row) for row in rows]


def build_in_clause(
    column_name: str,
    param_name: str,
    values: List[int]
) -> Tuple[str, dict, Optional[bindparam]]:
    """
    构建 IN 子句，返回可用于 SQLAlchemy text() 的组件。

    Args:
        column_name: 数据库列名
        param_name: 参数名
        values: 值列表

    Returns:
        Tuple[str, dict, Optional[bindparam]]:
            - SQL 条件片段（如 "column IN :param"）
            - 参数字典
            - bindparam 对象（需要 .bindparams() 绑定到 text()）

    Usage:
        clause, params, bp = build_in_clause("org_id", "org_ids", [1, 2, 3])
        if bp:
            query = text(f"SELECT * FROM table WHERE {clause}").bindparams(bp)
        else:
            query = text(f"SELECT * FROM table WHERE {clause}")
        result = conn.execute(query, params)
    """
    if not values:
        return "1=0", {}, None  # 空列表返回不匹配任何行的条件

    params = {param_name: values}
    clause = f"{column_name} IN :{param_name}"
    bp = bindparam(param_name, expanding=True)

    return clause, params, bp


def apply_org_filter(
    where: List[str],
    params: dict,
    org_id: Optional[int],
    table_alias: str = "p",
    org_column: str = "org_id"
) -> Optional[bindparam]:
    """
    应用组织范围过滤条件。

    Args:
        where: WHERE条件列表（会被修改）
        params: SQL参数字典（会被修改）
        org_id: 组织ID（如果提供，将过滤该组织及其子组织）
        table_alias: 表别名，默认为 'p'
        org_column: 组织ID列名，默认为 'org_id'

    Returns:
        Optional[bindparam]: 需要绑定到 text() 的 bindparam 对象，或 None
    """
    if org_id is None:
        return None

    org_ids = get_org_tree_ids(org_id)
    if not org_ids:
        return None

    param_name = "_org_ids"
    where.append(f"{table_alias}.{org_column} IN :{param_name}")
    params[param_name] = org_ids
    return bindparam(param_name, expanding=True)
