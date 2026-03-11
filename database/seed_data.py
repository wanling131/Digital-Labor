from __future__ import annotations

import datetime as dt
import random
from typing import List

from sqlalchemy import Engine, text


def _ensure_org(engine: Engine) -> None:
    with engine.begin() as conn:
        n = conn.execute(text("SELECT COUNT(*) FROM org")).scalar_one()
        if int(n) > 0:
            return

        # 简化版组织结构：公司 -> 项目部 -> 两个标段 -> 若干班组
        company_id = conn.execute(
            text(
                "INSERT INTO org (parent_id, name, type, sort, manager) VALUES (0, '某某建设集团有限公司', 'company', 0, '张总') RETURNING id"
            )
        ).scalar_one()
        proj1 = conn.execute(
            text(
                "INSERT INTO org (parent_id, name, type, sort, manager) VALUES (:p, '东区项目部', 'project', 0, '李明') RETURNING id"
            ),
            {"p": company_id},
        ).scalar_one()
        proj2 = conn.execute(
            text(
                "INSERT INTO org (parent_id, name, type, sort, manager) VALUES (:p, '西区项目部', 'project', 1, '陈刚') RETURNING id"
            ),
            {"p": company_id},
        ).scalar_one()

        seg1 = conn.execute(
            text(
                "INSERT INTO org (parent_id, name, type, sort, manager) VALUES (:p, 'A 标段', 'segment', 0, '王建') RETURNING id"
            ),
            {"p": proj1},
        ).scalar_one()
        seg2 = conn.execute(
            text(
                "INSERT INTO org (parent_id, name, type, sort, manager) VALUES (:p, 'B 标段', 'segment', 1, NULL) RETURNING id"
            ),
            {"p": proj1},
        ).scalar_one()

        # 班组
        for name, sort in [
            ("钢筋班组", 0),
            ("木工班组", 1),
            ("混凝土班组", 2),
            ("架子工班组", 3),
        ]:
            conn.execute(
                text(
                    "INSERT INTO org (parent_id, name, type, sort, manager) VALUES (:p, :n, 'team', :s, NULL)"
                ),
                {"p": seg1, "n": name, "s": sort},
            )


def _ensure_users(engine: Engine) -> None:
    with engine.begin() as conn:
        # admin 用户在建表脚本或 init 脚本中创建；此处补充两个示例用户
        n = conn.execute(text('SELECT COUNT(*) FROM "user" WHERE username IN (\'manager1\', \'manager2\')')).scalar()
        if int(n or 0) >= 2:
            return

        proj_ids = conn.execute(
            text("SELECT id FROM org WHERE type = 'project' ORDER BY id")
        ).scalars().all()
        proj1 = proj_ids[0] if proj_ids else None
        proj2 = proj_ids[1] if len(proj_ids) > 1 else None

        try:
            if proj1:
                conn.execute(
                    text(
                        'INSERT INTO "user" (username, password_hash, name, org_id, role) VALUES (:u, :p, :n, :o, :r)'
                    ),
                    {"u": "manager1", "p": "admin123", "n": "东区项目经理", "o": proj1, "r": "admin"},
                )
            if proj2:
                conn.execute(
                    text(
                        'INSERT INTO "user" (username, password_hash, name, org_id, role) VALUES (:u, :p, :n, :o, :r)'
                    ),
                    {"u": "manager2", "p": "admin123", "n": "西区项目经理", "o": proj2, "r": "user"},
                )
        except Exception as e:  # noqa: BLE001
            if "unique" not in str(e).lower():
                raise


SURNAMES = ["王", "李", "张", "刘", "陈", "杨", "黄", "赵", "周", "吴", "徐", "孙", "马", "朱", "胡", "郭", "何", "林", "高", "罗"]
GIVEN = ["伟", "强", "磊", "洋", "勇", "军", "杰", "涛", "明", "超", "秀英", "敏", "静", "丽"]


def _random_name() -> str:
    return random.choice(SURNAMES) + random.choice(GIVEN)


def _random_mobile() -> str:
    prefix = random.choice(["138", "139", "150", "151", "152", "153", "156", "158", "159", "176", "178", "188"])
    return prefix + str(random.randint(0, 99999999)).zfill(8)


def _ensure_persons(engine: Engine, min_count: int = 20) -> None:
    with engine.begin() as conn:
        n = conn.execute(text("SELECT COUNT(*) FROM person")).scalar_one()
        if int(n) >= min_count:
            return

        team_ids = conn.execute(text("SELECT id FROM org WHERE type = 'team' ORDER BY id")).scalars().all()
        if not team_ids:
            team_ids = [None]

        statuses = ["预注册", "已实名", "已签约", "已进场", "已进场", "已离场"]
        now = dt.datetime.now()
        created_ids: List[int] = []

        for i in range(1, min_count + 1):
            name = _random_name()
            org_id = team_ids[(i - 1) % len(team_ids)]
            status = statuses[(i - 1) % len(statuses)]
            contract_signed = 1 if status in ("已签约", "已进场", "已离场") else 0
            on_site = 1 if status == "已进场" else 0
            created_at = now - dt.timedelta(days=random.randint(0, 90))

            r = conn.execute(
                text(
                    """
                    INSERT INTO person (org_id, work_no, name, mobile, status, contract_signed, on_site, created_at)
                    VALUES (:org_id, :work_no, :name, :mobile, :status, :contract_signed, :on_site, :created_at)
                    RETURNING id
                    """
                ),
                {
                    "org_id": org_id,
                    "work_no": f"W{1000 + i}",
                    "name": name,
                    "mobile": _random_mobile(),
                    "status": status,
                    "contract_signed": contract_signed,
                    "on_site": on_site,
                    "created_at": created_at,
                },
            ).scalar_one()
            created_ids.append(int(r))


def _ensure_attendance(engine: Engine, days: int = 10) -> None:
    with engine.begin() as conn:
        person_ids = conn.execute(text("SELECT id FROM person ORDER BY id LIMIT 100")).scalars().all()
        if not person_ids:
            return

        today = dt.date.today()
        for pid in person_ids:
            for d in range(days):
                work_date = today - dt.timedelta(days=d)
                existing = conn.execute(
                    text("SELECT 1 FROM attendance WHERE person_id = :pid AND work_date = :d"),
                    {"pid": pid, "d": work_date},
                ).first()
                if existing:
                    continue
                hours = random.choice([0, 4, 8])
                conn.execute(
                    text(
                        """
                        INSERT INTO attendance (person_id, org_id, work_date, hours)
                        VALUES (:pid, NULL, :d, :h)
                        """
                    ),
                    {"pid": pid, "d": work_date, "h": hours},
                )


def seed_minimal(engine: Engine) -> None:
    """
    为临时环境补充最小可用数据：
    - org：至少一棵公司/项目/标段/班组树
    - user：在 admin 之外维护两名管理用户
    - person：至少若干条人员档案
    - attendance：为这些人员生成最近若干天的考勤
    """

    _ensure_org(engine)
    _ensure_users(engine)
    _ensure_persons(engine, min_count=30)
    _ensure_attendance(engine, days=15)

