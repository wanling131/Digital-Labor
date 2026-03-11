from __future__ import annotations

import os
import shutil
import urllib.parse
from typing import Any, Dict, List, Optional, Tuple, Union

from sqlalchemy import text

from digital_labor.db import get_engine
from digital_labor.paths import get_paths


def my_pending(person_id: int) -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT s.* FROM settlement s WHERE s.person_id = :pid AND s.status = '待确认' ORDER BY s.id DESC"),
            {"pid": int(person_id)},
        ).mappings().all()
    return {"list": [dict(r) for r in rows]}


def my_all(person_id: int) -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT s.* FROM settlement s WHERE s.person_id = :pid ORDER BY s.id DESC LIMIT 100"),
            {"pid": int(person_id)},
        ).mappings().all()
    return {"list": [dict(r) for r in rows]}


def confirm_list(*, status: Optional[str], limit: int, offset: int) -> dict:
    where = []
    params: Dict[str, Any] = {"limit": limit, "offset": offset}
    if status:
        where.append("s.status = :status")
        params["status"] = status
    where_sql = (" WHERE " + " AND ".join(where)) if where else ""
    engine = get_engine()
    with engine.connect() as conn:
        total = conn.execute(text(f"SELECT COUNT(*) FROM settlement s{where_sql}"), params).scalar_one()
        rows = conn.execute(
            text(
                f"""
                SELECT s.*, p.name as person_name, p.work_no, p.mobile
                FROM settlement s JOIN person p ON s.person_id = p.id
                {where_sql}
                ORDER BY s.id DESC
                LIMIT :limit OFFSET :offset
                """
            ),
            params,
        ).mappings().all()
    return {"list": [dict(r) for r in rows], "total": int(total)}


def generate(period_start: str, period_end: str) -> dict:
    engine = get_engine()
    count = 0
    with engine.begin() as conn:
        rows = conn.execute(
            text(
                """
                SELECT person_id, SUM(hours) as total_hours
                FROM attendance
                WHERE work_date >= :s::date AND work_date <= :e::date
                GROUP BY person_id
                """
            ),
            {"s": period_start, "e": period_end},
        ).mappings().all()
        for r in rows:
            try:
                conn.execute(
                    text(
                        """
                        INSERT INTO settlement (person_id, period_start, period_end, total_hours, amount_due, status)
                        VALUES (:pid, :s::date, :e::date, :h, 0, '待确认')
                        ON CONFLICT (person_id, period_start) DO NOTHING
                        """
                    ),
                    {"pid": int(r["person_id"]), "s": period_start, "e": period_end, "h": float(r["total_hours"] or 0)},
                )
                conn.execute(
                    text("INSERT INTO notification (person_id, type, title, body) VALUES (:pid, '结算待确认', :t, :b)"),
                    {"pid": int(r["person_id"]), "t": f"{period_start}～{period_end} 结算单", "b": f"工时：{float(r['total_hours'] or 0)}"},
                )
                count += 1
            except Exception:  # noqa: BLE001
                pass
    return {"ok": True, "count": count}


def confirm(
    *,
    settlement_id: int,
    action: Optional[str],
    amount_due: Optional[float],
    amount_paid: Optional[float],
    actor: Dict[str, Any],
) -> str:
    """
    返回：
    - ok / not_found / forbidden
    """
    engine = get_engine()
    with engine.connect() as conn:
        st = conn.execute(text("SELECT id, status, person_id FROM settlement WHERE id = :id"), {"id": settlement_id}).mappings().first()
    if not st:
        return "not_found"
    if actor.get("workerId") and int(st["person_id"]) != int(actor["workerId"]):
        return "forbidden"

    updates = ["updated_at = now()"]
    params: Dict[str, Any] = {"id": settlement_id}
    if action == "confirm":
        paid = amount_paid is not None and float(amount_paid) > 0
        updates.append("status = :status")
        params["status"] = "已发放" if paid else "已确认"
        updates.append("confirm_at = now()")
        updates.append("confirm_method = :method")
        params["method"] = "worker_h5" if actor.get("workerId") else ("admin_pc" if actor.get("userId") else "unknown")
        if amount_due is not None:
            updates.append("amount_due = :amount_due")
            params["amount_due"] = float(amount_due)
        if amount_paid is not None:
            updates.append("amount_paid = :amount_paid")
            params["amount_paid"] = float(amount_paid)
    elif action == "reject":
        updates.append("status = :status")
        params["status"] = "已驳回"
    else:
        if amount_due is not None:
            updates.append("amount_due = :amount_due")
            params["amount_due"] = float(amount_due)
        if amount_paid is not None:
            updates.append("amount_paid = :amount_paid")
            params["amount_paid"] = float(amount_paid)

    paths = get_paths()
    with engine.begin() as conn:
        conn.execute(text(f"UPDATE settlement SET {', '.join(updates)} WHERE id = :id"), params)
        if action == "confirm":
            conn.execute(
                text("UPDATE person SET status = '已离场', on_site = 0, updated_at = now() WHERE id = :pid"),
                {"pid": int(st["person_id"])},
            )
            # 复制签名快照
            try:
                person = conn.execute(text("SELECT signature_image FROM person WHERE id = :pid"), {"pid": int(st["person_id"])}).mappings().first()
                sig = (person or {}).get("signature_image")
                if sig and not str(sig).startswith("data:image"):
                    src_abs = os.path.abspath(os.path.join(paths.server_root, str(sig)))
                    if os.path.exists(src_abs):
                        os.makedirs(paths.uploads_signatures_settlements, exist_ok=True)
                        dst_abs = os.path.join(paths.uploads_signatures_settlements, f"settlement_{settlement_id}_person_{int(st['person_id'])}.png")
                        shutil.copyfile(src_abs, dst_abs)
                        rel = os.path.relpath(dst_abs, paths.server_root).replace("\\", "/")
                        conn.execute(text("UPDATE settlement SET sign_image_snapshot = :p WHERE id = :id"), {"p": rel, "id": settlement_id})
            except Exception:
                pass
            if amount_paid is not None and float(amount_paid) > 0:
                conn.execute(
                    text("INSERT INTO notification (person_id, type, title, body) VALUES (:pid, '工资发放', '工资已发放', :b)"),
                    {"pid": int(st["person_id"]), "b": f"已发放金额：{float(amount_paid)}"},
                )
    return "ok"


def push_notify(ids: Optional[List[int]]) -> dict:
    engine = get_engine()
    with engine.begin() as conn:
        if ids:
            rows = conn.execute(
                text(
                    """
                    SELECT id, person_id, period_start, period_end, total_hours
                    FROM settlement WHERE status='待确认' AND id = ANY(:ids)
                    """
                ),
                {"ids": ids},
            ).mappings().all()
        else:
            rows = conn.execute(
                text(
                    """
                    SELECT id, person_id, period_start, period_end, total_hours
                    FROM settlement WHERE status='待确认'
                    """
                )
            ).mappings().all()
        for r in rows:
            conn.execute(
                text("INSERT INTO notification (person_id, type, title, body) VALUES (:pid, '结算待确认', :t, :b)"),
                {"pid": int(r["person_id"]), "t": f"{r['period_start']}～{r['period_end']} 结算单待确认", "b": f"工时：{float(r['total_hours'] or 0)}，请到「我的薪资」确认。"},
            )
    return {"ok": True, "count": len(rows)}


def slip_html(*, settlement_id: int, actor: Dict[str, Any]) -> Union[Tuple[str, str], str]:
    engine = get_engine()
    with engine.connect() as conn:
        s = conn.execute(
            text(
                """
                SELECT s.*, p.name as person_name, p.work_no
                FROM settlement s JOIN person p ON s.person_id=p.id
                WHERE s.id = :id
                """
            ),
            {"id": settlement_id},
        ).mappings().first()
    if not s:
        return "not_found"
    if actor.get("workerId") and int(s["person_id"]) != int(actor["workerId"]):
        return "forbidden"
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><title>工资条-{s['period_start']}</title><style>
body{{font-family:sans-serif;max-width:400px;margin:24px auto;padding:16px;border:1px solid #eee;border-radius:8px;}}
h3{{margin:0 0 16px;border-bottom:1px solid #eee;padding-bottom:8px;}}
table{{width:100%;border-collapse:collapse;}}
th,td{{text-align:left;padding:8px 0;border-bottom:1px solid #f0f0f0;}}
.foot{{margin-top:16px;font-size:12px;color:#666;}}
</style></head><body>
<h3>电子工资条</h3>
<p><strong>{s.get('person_name','')}</strong> {('工号：'+s['work_no']) if s.get('work_no') else ''}</p>
<table>
  <tr><th>结算周期</th><td>{s['period_start']} 至 {s['period_end']}</td></tr>
  <tr><th>工时</th><td>{s.get('total_hours',0) or 0}</td></tr>
  <tr><th>应发金额</th><td>{s.get('amount_due',0) or 0}</td></tr>
  <tr><th>已发金额</th><td>{s.get('amount_paid',0) or 0}</td></tr>
  <tr><th>状态</th><td>{s.get('status','')}</td></tr>
</table>
<div class="foot">Digital Labor</div>
</body></html>"""
    filename = f"工资条_{s['period_start']}_{s.get('person_name') or s['id']}.html"
    return html, filename


def salary_list(*, filters: Dict[str, Any], limit: int, offset: int) -> dict:
    person_id = filters.get("person_id")
    org_id = filters.get("org_id")
    month = filters.get("month")
    where = []
    params: Dict[str, Any] = {"limit": limit, "offset": offset}
    if person_id:
        where.append("s.person_id = :pid")
        params["pid"] = int(person_id)
    if org_id:
        where.append("p.org_id = :oid")
        params["oid"] = int(org_id)
    if month:
        where.append("CAST(s.period_start AS TEXT) LIKE :m")
        params["m"] = f"{month}%"
    where_sql = (" WHERE " + " AND ".join(where)) if where else ""
    engine = get_engine()
    with engine.connect() as conn:
        total = conn.execute(text(f"SELECT COUNT(*) FROM settlement s JOIN person p ON s.person_id=p.id{where_sql}"), params).scalar_one()
        rows = conn.execute(
            text(
                f"""
                SELECT s.*, p.name as person_name, p.work_no
                FROM settlement s JOIN person p ON s.person_id=p.id
                {where_sql}
                ORDER BY s.period_start DESC, s.id DESC
                LIMIT :limit OFFSET :offset
                """
            ),
            params,
        ).mappings().all()
    return {"list": [dict(r) for r in rows], "total": int(total)}

