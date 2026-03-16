from __future__ import annotations

import datetime as dt
from typing import Any, Dict

from sqlalchemy import text

from digital_labor.db import get_engine


def board_payload() -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        r = conn.execute(
            text(
                """
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN status != '预注册' THEN 1 ELSE 0 END) as realName,
                       SUM(CASE WHEN contract_signed = 1 THEN 1 ELSE 0 END) as signed,
                       SUM(CASE WHEN on_site = 1 THEN 1 ELSE 0 END) as onSite,
                       SUM(CASE WHEN status = '预注册' THEN 1 ELSE 0 END) as pendingRealName
                FROM person
                """
            )
        ).mappings().first()
        total = int((r or {}).get("total") or 0)
        pending_real_name = int((r or {}).get("pendingrealname") or (r or {}).get("pendingRealName") or 0)

        if engine.dialect.name == "sqlite":
            contract_expiring = int(
                conn.execute(
                    text(
                        """
                        SELECT COUNT(*) FROM contract_instance
                        WHERE status='已签署' AND deadline IS NOT NULL
                          AND DATE(deadline) >= DATE('now') AND DATE(deadline) <= DATE('now', '+30 day')
                        """
                    )
                ).scalar_one()
            )
        else:
            contract_expiring = int(
                conn.execute(
                    text(
                        """
                        SELECT COUNT(*) FROM contract_instance
                        WHERE status='已签署' AND deadline IS NOT NULL
                          AND deadline >= CURRENT_DATE AND deadline <= CURRENT_DATE + INTERVAL '30 days'
                        """
                    )
                ).scalar_one()
            )

        pending_contract = int(conn.execute(text("SELECT COUNT(*) FROM contract_instance WHERE status='待签署'")).scalar_one())
        pending_settlement = int(conn.execute(text("SELECT COUNT(*) FROM settlement WHERE status='待确认'")).scalar_one())

        team_rank = conn.execute(
            text(
                """
                SELECT o.name, COUNT(*) as count
                FROM person p
                JOIN org o ON p.org_id=o.id
                WHERE o.type='team' AND p.on_site=1
                GROUP BY o.id, o.name
                ORDER BY count DESC
                LIMIT 6
                """
            )
        ).mappings().all()

        activities_from_person = conn.execute(
            text(
                """
                SELECT p.name, o.name as org_name, p.created_at
                FROM person p LEFT JOIN org o ON p.org_id=o.id
                ORDER BY p.created_at DESC
                LIMIT 3
                """
            )
        ).mappings().all()
        activities_from_contract = conn.execute(
            text(
                """
                SELECT p.name, c.title, c.signed_at as created_at
                FROM contract_instance c JOIN person p ON c.person_id=p.id
                WHERE c.status='已签署' AND c.signed_at IS NOT NULL
                ORDER BY c.signed_at DESC
                LIMIT 3
                """
            )
        ).mappings().all()

    def human_time(ts: Any) -> str:
        if not ts:
            return "—"
        try:
            if isinstance(ts, str):
                t = dt.datetime.fromisoformat(ts.replace("Z", "+00:00"))
            elif isinstance(ts, dt.datetime):
                t = ts
            else:
                return "—"
        except Exception:  # noqa: BLE001
            return "—"
        minutes = int((dt.datetime.now(t.tzinfo) - t).total_seconds() / 60)
        if minutes < 60:
            return f"{minutes}分钟前"
        if minutes < 1440:
            return f"{minutes // 60}小时前"
        return f"{minutes // 1440}天前"

    activities = (
        [{"type": "入职", "name": a["name"], "project": a.get("org_name") or "—", "created_at": a.get("created_at")} for a in activities_from_person]
        + [{"type": "签约", "name": a["name"], "project": a.get("title") or "—", "created_at": a.get("created_at")} for a in activities_from_contract]
    )
    activities.sort(key=lambda x: str(x.get("created_at") or ""), reverse=True)
    recent_activities = [{"type": a["type"], "name": a["name"], "project": a["project"], "time": human_time(a.get("created_at"))} for a in activities[:5]]

    real_name = int((r or {}).get("realname") or (r or {}).get("realName") or 0)
    signed = int((r or {}).get("signed") or 0)
    on_site = int((r or {}).get("onsite") or (r or {}).get("onSite") or 0)

    def rate(n: int) -> str:
        return f"{(n / total * 100):.1f}" if total else "0"

    return {
        "total": total,
        "realNameRate": rate(real_name),
        "signRate": rate(signed),
        "onSiteRate": rate(on_site),
        "totalChangePercent": "0",
        "realNameRateChange": "0",
        "signRateChange": "0",
        "onSiteRateChange": "0",
        "pendingRealName": pending_real_name,
        "contractExpiring": contract_expiring,
        "blacklistMatch": 0,
        "teamRank": [dict(x) for x in team_rank],
        "recentActivities": recent_activities,
        "todos": [
            {"title": "待审批合同", "count": pending_contract, "urgent": True},
            {"title": "待确认结算单", "count": pending_settlement, "urgent": True},
            {"title": "待认证人员", "count": pending_real_name, "urgent": False},
            {"title": "即将到期合同", "count": contract_expiring, "urgent": False},
            {"title": "考勤异常待处理", "count": 0, "urgent": True},
        ],
    }


def board_trend_payload(days: int) -> dict:
    if days < 7:
        days = 7
    if days > 90:
        days = 90
    end = dt.date.today()
    start = end - dt.timedelta(days=days)
    start_str = start.isoformat()
    end_str = end.isoformat()

    engine = get_engine()
    with engine.connect() as conn:
        is_sqlite = engine.dialect.name == "sqlite"
        date_expr_person = "DATE(created_at)" if is_sqlite else "created_at::date"
        date_expr_signed = "DATE(signed_at)" if is_sqlite else "signed_at::date"
        date_expr_att = "DATE(work_date)" if is_sqlite else "work_date"
        start_cmp = "DATE(:s)" if is_sqlite else "CAST(:s AS date)"
        end_cmp = "DATE(:e)" if is_sqlite else "CAST(:e AS date)"

        daily_person = conn.execute(
            text(
                f"""
                SELECT {date_expr_person} as date, COUNT(*) as count
                FROM person
                WHERE {date_expr_person} >= {start_cmp} AND {date_expr_person} <= {end_cmp}
                GROUP BY {date_expr_person}
                ORDER BY date
                """
            ),
            {"s": start_str, "e": end_str},
        ).mappings().all()
        daily_signed = conn.execute(
            text(
                f"""
                SELECT {date_expr_signed} as date, COUNT(*) as count
                FROM contract_instance
                WHERE status='已签署' AND signed_at IS NOT NULL
                  AND {date_expr_signed} >= {start_cmp} AND {date_expr_signed} <= {end_cmp}
                GROUP BY {date_expr_signed}
                ORDER BY date
                """
            ),
            {"s": start_str, "e": end_str},
        ).mappings().all()
        daily_att = conn.execute(
            text(
                f"""
                SELECT {date_expr_att} as date, COUNT(*) as count, SUM(hours) as total_hours
                FROM attendance
                WHERE {date_expr_att} >= {start_cmp} AND {date_expr_att} <= {end_cmp}
                GROUP BY {date_expr_att}
                ORDER BY date
                """
            ),
            {"s": start_str, "e": end_str},
        ).mappings().all()

    by_date: Dict[str, Dict[str, Any]] = {}
    d = start
    while d <= end:
        ds = d.isoformat()
        by_date[ds] = {"date": ds, "personCount": 0, "signedCount": 0, "attendanceCount": 0, "totalHours": 0}
        d += dt.timedelta(days=1)

    for r in daily_person:
        if str(r["date"]) in by_date:
            by_date[str(r["date"])]["personCount"] = int(r["count"] or 0)
    for r in daily_signed:
        if str(r["date"]) in by_date:
            by_date[str(r["date"])]["signedCount"] = int(r["count"] or 0)
    for r in daily_att:
        if str(r["date"]) in by_date:
            by_date[str(r["date"])]["attendanceCount"] = int(r["count"] or 0)
            by_date[str(r["date"])]["totalHours"] = float(r["total_hours"] or 0)

    trend = [by_date[k] for k in sorted(by_date.keys())]
    return {"trend": trend, "start": start_str, "end": end_str}

