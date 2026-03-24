from __future__ import annotations

import datetime as dt
import re
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import bindparam, text

from digital_labor.db import get_engine
from digital_labor.utils.permission import get_org_tree_ids


def _as_date_str(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, (dt.date, dt.datetime)):
        return v.date().isoformat() if isinstance(v, dt.datetime) else v.isoformat()
    s = str(v).strip()
    if not s:
        return ""
    s = s.replace("/", "-")
    return s[:10]


def import_from_excel_rows(rows: List[Tuple[Any, ...]]) -> dict:
    """
    兼容 Node 行为：解析 Excel 后按 person_id+work_date upsert attendance，
    同时写入 clock_log（source=import）。
    """
    if not rows:
        return {"ok": True, "count": 0, "message": "无数据"}

    header = [str(h or "").strip() for h in rows[0]]

    def find_idx(pattern: str) -> int:
        for i, h in enumerate(header):
            if re.search(pattern, h, re.I):
                return i
        return -1

    person_idx = find_idx(r"人员|姓名|person|name")
    date_idx = find_idx(r"日期|date|工作日期")
    in_idx = find_idx(r"上班|签到|clock.?in|开始")
    out_idx = find_idx(r"下班|签退|clock.?out|结束")
    hours_idx = find_idx(r"工时|hours|时长")
    overtime_idx = find_idx(r"加班|overtime|加班时长")
    org_idx = find_idx(r"组织|班组|org|项目")
    if person_idx < 0 or date_idx < 0:
        raise ValueError("表格需包含人员(或姓名)列和日期列")

    engine = get_engine()
    count = 0
    with engine.begin() as conn:
        for i in range(1, len(rows)):
            r = rows[i]
            name_or_id = str(r[person_idx] or "").strip()
            work_date = _as_date_str(r[date_idx])
            if not name_or_id or not work_date:
                continue

            person_id: Optional[int]
            try:
                person_id = int(name_or_id)
            except Exception:  # noqa: BLE001
                person_id = None
            if person_id is None:
                p = conn.execute(
                    text("SELECT id FROM person WHERE name = :v OR work_no = :v LIMIT 1"),
                    {"v": name_or_id},
                ).mappings().first()
                if not p:
                    continue
                person_id = int(p["id"])

            clock_in = str(r[in_idx]).strip() if in_idx >= 0 and r[in_idx] is not None else None
            clock_out = str(r[out_idx]).strip() if out_idx >= 0 and r[out_idx] is not None else None
            hours = 0.0
            if hours_idx >= 0 and r[hours_idx] is not None:
                try:
                    hours = float(r[hours_idx])
                except Exception:  # noqa: BLE001
                    hours = 0.0
            overtime_hours = 0.0
            if overtime_idx >= 0 and r[overtime_idx] is not None:
                try:
                    overtime_hours = float(r[overtime_idx])
                except Exception:  # noqa: BLE001
                    overtime_hours = 0.0
            # 若有加班列则用其值，否则按工时>8 自动拆分：标准 8、其余为加班
            if overtime_idx >= 0:
                standard_hours = max(0.0, hours - overtime_hours)
            else:
                standard_hours = min(8.0, hours)
                overtime_hours = max(0.0, hours - 8.0)
            org_id = None
            if org_idx >= 0 and r[org_idx] is not None:
                try:
                    org_id = int(str(r[org_idx]).strip())
                except Exception:  # noqa: BLE001
                    org_id = None

            conn.execute(
                text(
                    """
                    INSERT INTO attendance (person_id, org_id, work_date, clock_in, clock_out, hours, standard_hours, overtime_hours)
                    VALUES (:pid, :oid, :d, :ci, :co, :h, :std, :ot)
                    ON CONFLICT (person_id, work_date)
                    DO UPDATE SET org_id = EXCLUDED.org_id, clock_in = EXCLUDED.clock_in, clock_out = EXCLUDED.clock_out,
                      hours = EXCLUDED.hours, standard_hours = EXCLUDED.standard_hours, overtime_hours = EXCLUDED.overtime_hours
                    """
                ),
                {
                    "pid": person_id,
                    "oid": org_id,
                    "d": work_date,
                    "ci": clock_in,
                    "co": clock_out,
                    "h": hours,
                    "std": standard_hours,
                    "ot": overtime_hours,
                },
            )
            if clock_in:
                conn.execute(
                    text("INSERT INTO clock_log (person_id, punch_at, type, source) VALUES (:pid, :t, 'in', 'import')"),
                    {"pid": person_id, "t": f"{work_date} {clock_in[:5]}:00"},
                )
            if clock_out:
                conn.execute(
                    text("INSERT INTO clock_log (person_id, punch_at, type, source) VALUES (:pid, :t, 'out', 'import')"),
                    {"pid": person_id, "t": f"{work_date} {clock_out[:5]}:00"},
                )
            count += 1

    return {"ok": True, "count": count}


def report(*, filters: Dict[str, Any], limit: int, offset: int, actor_org_id: Optional[int] = None) -> dict:
    person_id = filters.get("person_id")
    org_id = filters.get("org_id")
    # 如果传入了actor_org_id，覆盖用户选择的org_id
    if actor_org_id is not None:
        org_id = actor_org_id
    start = filters.get("start")
    end = filters.get("end")
    where = []
    params: Dict[str, Any] = {"limit": limit, "offset": offset}
    bindparams_list: List[bindparam] = []
    if person_id:
        where.append("a.person_id = :pid")
        params["pid"] = int(person_id)
    if org_id:
        # 实现基于组织树的数据范围控制
        org_ids = get_org_tree_ids(int(org_id))
        if org_ids:
            where.append("(a.org_id IN :_org_ids OR p.org_id IN :_org_ids)")
            params["_org_ids"] = org_ids
            bindparams_list.append(bindparam("_org_ids", expanding=True))
    if start:
        where.append("DATE(a.work_date) >= DATE(:start)")
        params["start"] = start
    if end:
        where.append("DATE(a.work_date) <= DATE(:end)")
        params["end"] = end
    where_clause = " WHERE " + " AND ".join(where) if where else ""
    engine = get_engine()
    with engine.connect() as conn:
        total_query = text("SELECT COUNT(*) FROM attendance a JOIN person p ON a.person_id=p.id" + where_clause)
        if bindparams_list:
            total_query = total_query.bindparams(*bindparams_list)
        total = conn.execute(total_query, params).scalar_one()
        rows_query = text(
            """
            SELECT a.*, p.name as person_name, p.work_no, o.name as org_name
            FROM attendance a
            JOIN person p ON a.person_id=p.id
            LEFT JOIN org o ON a.org_id=o.id
            """
            + where_clause +
            " ORDER BY a.work_date DESC, a.id DESC LIMIT :limit OFFSET :offset"
        )
        if bindparams_list:
            rows_query = rows_query.bindparams(*bindparams_list)
        rows = conn.execute(rows_query, params).mappings().all()
    return {"list": [dict(r) for r in rows], "total": int(total)}


def my_attendance(*, person_id: int, year: Optional[str], month: Optional[str]) -> dict:
    sql = "SELECT a.* FROM attendance a WHERE a.person_id = :pid"
    params: Dict[str, Any] = {"pid": int(person_id)}
    if year and month:
        try:
            y = int(year)
            m = int(month)
        except Exception:  # noqa: BLE001
            y = 0
            m = 0
        if y and 1 <= m <= 12:
            start = f"{y}-{str(m).zfill(2)}-01"
            end = (dt.date(y, m, 1) + dt.timedelta(days=32)).replace(day=1) - dt.timedelta(days=1)
            sql += " AND DATE(a.work_date) >= DATE(:start) AND DATE(a.work_date) <= DATE(:end)"
            params["start"] = start
            params["end"] = end.isoformat()
    sql += " ORDER BY a.work_date DESC LIMIT 200"
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(text(sql), params).mappings().all()
    return {"list": [dict(r) for r in rows]}


def clock(*, person_id: int, typ: str) -> dict:
    if typ not in ("in", "out"):
        raise ValueError("type 必填且为 in 或 out")
    now = dt.datetime.utcnow()
    work_date = now.date().isoformat()
    time_str = now.time().strftime("%H:%M")
    punch_at = now.strftime("%Y-%m-%d %H:%M:%S")

    engine = get_engine()
    with engine.begin() as conn:
        org_id = conn.execute(text("SELECT org_id FROM person WHERE id = :id"), {"id": person_id}).scalar()
        row = conn.execute(
            text("SELECT id, clock_in, clock_out FROM attendance WHERE person_id = :pid AND work_date = :d"),
            {"pid": person_id, "d": work_date},
        ).mappings().first()
        if row:
            if typ == "in":
                conn.execute(text("UPDATE attendance SET clock_in = :t WHERE id = :id"), {"t": time_str, "id": int(row["id"])})
            else:
                conn.execute(text("UPDATE attendance SET clock_out = :t WHERE id = :id"), {"t": time_str, "id": int(row["id"])})
        else:
            conn.execute(
                text(
                    """
                    INSERT INTO attendance (person_id, org_id, work_date, clock_in, clock_out)
                    VALUES (:pid, :oid, :d, :ci, :co)
                    """
                ),
                {"pid": person_id, "oid": org_id, "d": work_date, "ci": time_str if typ == "in" else None, "co": time_str if typ == "out" else None},
            )
        conn.execute(
            text("INSERT INTO clock_log (person_id, punch_at, type, source) VALUES (:pid, :p, :t, 'h5')"),
            {"pid": person_id, "p": punch_at, "t": typ},
        )

    return {"ok": True, "work_date": work_date, ("clock_in" if typ == "in" else "clock_out"): time_str}


def clock_log(*, filters: Dict[str, Any], limit: int, offset: int, actor_org_id: Optional[int] = None) -> dict:
    person_id = filters.get("person_id")
    org_id = filters.get("org_id")
    # 如果传入了actor_org_id，覆盖用户选择的org_id
    if actor_org_id is not None:
        org_id = actor_org_id
    start = filters.get("start")
    end = filters.get("end")
    where = []
    params: Dict[str, Any] = {"limit": limit, "offset": offset}
    bindparams_list: List[bindparam] = []
    if person_id:
        where.append("c.person_id = :pid")
        params["pid"] = int(person_id)
    if org_id:
        # 实现基于组织树的数据范围控制
        org_ids = get_org_tree_ids(int(org_id))
        if org_ids:
            where.append("p.org_id IN :_org_ids")
            params["_org_ids"] = org_ids
            bindparams_list.append(bindparam("_org_ids", expanding=True))
    if start:
        where.append("c.punch_at >= :start")
        params["start"] = start
    if end:
        where.append("c.punch_at <= :end")
        params["end"] = f"{end} 23:59:59"
    where_clause = " WHERE " + " AND ".join(where) if where else ""
    engine = get_engine()
    with engine.connect() as conn:
        total_query = text("SELECT COUNT(*) FROM clock_log c JOIN person p ON c.person_id=p.id" + where_clause)
        if bindparams_list:
            total_query = total_query.bindparams(*bindparams_list)
        total = conn.execute(total_query, params).scalar_one()
        rows_query = text(
            """
            SELECT c.id, c.person_id, c.punch_at, c.type, c.source, c.created_at,
                   p.name as person_name, p.work_no, o.name as org_name
            FROM clock_log c
            JOIN person p ON c.person_id=p.id
            LEFT JOIN org o ON p.org_id=o.id
            """
            + where_clause +
            " ORDER BY c.punch_at DESC, c.id DESC LIMIT :limit OFFSET :offset"
        )
        if bindparams_list:
            rows_query = rows_query.bindparams(*bindparams_list)
        rows = conn.execute(rows_query, params).mappings().all()
    return {"list": [dict(r) for r in rows], "total": int(total)}

