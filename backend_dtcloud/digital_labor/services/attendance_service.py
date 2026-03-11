from __future__ import annotations

import datetime as dt
import re
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import text

from digital_labor.db import get_engine


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
            org_id = None
            if org_idx >= 0 and r[org_idx] is not None:
                try:
                    org_id = int(str(r[org_idx]).strip())
                except Exception:  # noqa: BLE001
                    org_id = None

            conn.execute(
                text(
                    """
                    INSERT INTO attendance (person_id, org_id, work_date, clock_in, clock_out, hours)
                    VALUES (:pid, :oid, :d::date, :ci, :co, :h)
                    ON CONFLICT (person_id, work_date)
                    DO UPDATE SET org_id = EXCLUDED.org_id, clock_in = EXCLUDED.clock_in, clock_out = EXCLUDED.clock_out, hours = EXCLUDED.hours
                    """
                ),
                {"pid": person_id, "oid": org_id, "d": work_date, "ci": clock_in, "co": clock_out, "h": hours},
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


def report(*, filters: Dict[str, Any], limit: int, offset: int) -> dict:
    person_id = filters.get("person_id")
    org_id = filters.get("org_id")
    start = filters.get("start")
    end = filters.get("end")
    where = []
    params: Dict[str, Any] = {"limit": limit, "offset": offset}
    if person_id:
        where.append("a.person_id = :pid")
        params["pid"] = int(person_id)
    if org_id:
        where.append("(a.org_id = :oid OR p.org_id = :oid)")
        params["oid"] = int(org_id)
    if start:
        where.append("a.work_date >= :start::date")
        params["start"] = start
    if end:
        where.append("a.work_date <= :end::date")
        params["end"] = end
    where_sql = (" WHERE " + " AND ".join(where)) if where else ""
    engine = get_engine()
    with engine.connect() as conn:
        total = conn.execute(text(f"SELECT COUNT(*) FROM attendance a JOIN person p ON a.person_id=p.id{where_sql}"), params).scalar_one()
        rows = conn.execute(
            text(
                f"""
                SELECT a.*, p.name as person_name, p.work_no, o.name as org_name
                FROM attendance a
                JOIN person p ON a.person_id=p.id
                LEFT JOIN org o ON a.org_id=o.id
                {where_sql}
                ORDER BY a.work_date DESC, a.id DESC
                LIMIT :limit OFFSET :offset
                """
            ),
            params,
        ).mappings().all()
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
            sql += " AND a.work_date >= :start::date AND a.work_date <= :end::date"
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
            text("SELECT id, clock_in, clock_out FROM attendance WHERE person_id = :pid AND work_date = :d::date"),
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
                    VALUES (:pid, :oid, :d::date, :ci, :co)
                    """
                ),
                {"pid": person_id, "oid": org_id, "d": work_date, "ci": time_str if typ == "in" else None, "co": time_str if typ == "out" else None},
            )
        conn.execute(
            text("INSERT INTO clock_log (person_id, punch_at, type, source) VALUES (:pid, :p, :t, 'h5')"),
            {"pid": person_id, "p": punch_at, "t": typ},
        )

    return {"ok": True, "work_date": work_date, ("clock_in" if typ == "in" else "clock_out"): time_str}


def clock_log(*, filters: Dict[str, Any], limit: int, offset: int) -> dict:
    person_id = filters.get("person_id")
    org_id = filters.get("org_id")
    start = filters.get("start")
    end = filters.get("end")
    where = []
    params: Dict[str, Any] = {"limit": limit, "offset": offset}
    if person_id:
        where.append("c.person_id = :pid")
        params["pid"] = int(person_id)
    if org_id:
        where.append("p.org_id = :oid")
        params["oid"] = int(org_id)
    if start:
        where.append("c.punch_at >= :start")
        params["start"] = start
    if end:
        where.append("c.punch_at <= :end")
        params["end"] = f"{end} 23:59:59"
    where_sql = (" WHERE " + " AND ".join(where)) if where else ""
    engine = get_engine()
    with engine.connect() as conn:
        total = conn.execute(text(f"SELECT COUNT(*) FROM clock_log c JOIN person p ON c.person_id=p.id{where_sql}"), params).scalar_one()
        rows = conn.execute(
            text(
                f"""
                SELECT c.id, c.person_id, c.punch_at, c.type, c.source, c.created_at,
                       p.name as person_name, p.work_no, o.name as org_name
                FROM clock_log c
                JOIN person p ON c.person_id=p.id
                LEFT JOIN org o ON p.org_id=o.id
                {where_sql}
                ORDER BY c.punch_at DESC, c.id DESC
                LIMIT :limit OFFSET :offset
                """
            ),
            params,
        ).mappings().all()
    return {"list": [dict(r) for r in rows], "total": int(total)}

