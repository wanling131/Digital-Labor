from __future__ import annotations

import datetime as dt
import random
from typing import List

from sqlalchemy import Engine, text

try:
    import bcrypt
except ImportError:
    print("Warning: bcrypt not installed, using plain text password (not recommended for production)")
    bcrypt = None


def _insert_id(engine: Engine, conn, sql_with_returning: str, sql_no_returning: str, params=None) -> int:
    params = params or {}
    if engine.dialect.name == "sqlite":
        r = conn.execute(text(sql_no_returning), params)
        return int(r.lastrowid or 0)
    return int(conn.execute(text(sql_with_returning), params).scalar_one())


def _ensure_org(engine: Engine) -> None:
    with engine.begin() as conn:
        n = conn.execute(text("SELECT COUNT(*) FROM org")).scalar_one()
        if int(n) > 0:
            return

        # 简化版组织结构：公司 -> 项目部 -> 两个标段 -> 若干班组
        company_id = _insert_id(
            engine,
            conn,
            "INSERT INTO org (parent_id, name, type, sort, manager) VALUES (0, '某某建设集团有限公司', 'company', 0, '张总') RETURNING id",
            "INSERT INTO org (parent_id, name, type, sort, manager) VALUES (0, '某某建设集团有限公司', 'company', 0, '张总')",
        )
        proj1 = _insert_id(
            engine,
            conn,
            "INSERT INTO org (parent_id, name, type, sort, manager) VALUES (:p, '东区项目部', 'project', 0, '李明') RETURNING id",
            "INSERT INTO org (parent_id, name, type, sort, manager) VALUES (:p, '东区项目部', 'project', 0, '李明')",
            {"p": company_id},
        )
        proj2 = _insert_id(
            engine,
            conn,
            "INSERT INTO org (parent_id, name, type, sort, manager) VALUES (:p, '西区项目部', 'project', 1, '陈刚') RETURNING id",
            "INSERT INTO org (parent_id, name, type, sort, manager) VALUES (:p, '西区项目部', 'project', 1, '陈刚')",
            {"p": company_id},
        )

        seg1 = _insert_id(
            engine,
            conn,
            "INSERT INTO org (parent_id, name, type, sort, manager) VALUES (:p, 'A 标段', 'segment', 0, '王建') RETURNING id",
            "INSERT INTO org (parent_id, name, type, sort, manager) VALUES (:p, 'A 标段', 'segment', 0, '王建')",
            {"p": proj1},
        )
        seg2 = _insert_id(
            engine,
            conn,
            "INSERT INTO org (parent_id, name, type, sort, manager) VALUES (:p, 'B 标段', 'segment', 1, NULL) RETURNING id",
            "INSERT INTO org (parent_id, name, type, sort, manager) VALUES (:p, 'B 标段', 'segment', 1, NULL)",
            {"p": proj1},
        )

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

        # 对密码进行哈希处理
        password = "admin123"
        if bcrypt:
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        else:
            password_hash = password

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
                    {"u": "manager1", "p": password_hash, "n": "东区项目经理", "o": proj1, "r": "admin"},
                )
            if proj2:
                conn.execute(
                    text(
                        'INSERT INTO "user" (username, password_hash, name, org_id, role) VALUES (:u, :p, :n, :o, :r)'
                    ),
                    {"u": "manager2", "p": password_hash, "n": "西区项目经理", "o": proj2, "r": "user"},
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
        # 检查演示账号是否存在
        demo_account = conn.execute(text("SELECT id FROM person WHERE mobile = :m"), {"m": "13800138000"}).scalar_one_or_none()
        if not demo_account:
            # 创建演示账号
            team_ids = conn.execute(text("SELECT id FROM org WHERE type = 'team' ORDER BY id")).scalars().all()
            org_id = team_ids[0] if team_ids else None
            now = dt.datetime.now()
            params = {
                "org_id": org_id,
                "work_no": "W1000",
                "name": "演示用户",
                "mobile": "13800138000",
                "status": "已进场",
                "contract_signed": 1,
                "on_site": 1,
                "created_at": now - dt.timedelta(days=30),
            }
            _insert_id(
                engine,
                conn,
                """
                INSERT INTO person (org_id, work_no, name, mobile, status, contract_signed, on_site, created_at)
                VALUES (:org_id, :work_no, :name, :mobile, :status, :contract_signed, :on_site, :created_at)
                RETURNING id
                """,
                """
                INSERT INTO person (org_id, work_no, name, mobile, status, contract_signed, on_site, created_at)
                VALUES (:org_id, :work_no, :name, :mobile, :status, :contract_signed, :on_site, :created_at)
                """,
                params,
            )

        n = conn.execute(text("SELECT COUNT(*) FROM person")).scalar_one()
        if int(n) >= min_count:
            return

        team_ids = conn.execute(text("SELECT id FROM org WHERE type = 'team' ORDER BY id")).scalars().all()
        if not team_ids:
            team_ids = [None]

        statuses = ["预注册", "已实名", "已签约", "已进场", "已进场", "已离场"]
        now = dt.datetime.now()
        created_ids: List[int] = []

        # 从1开始，避免与演示账号冲突
        for i in range(1, min_count + 1):
            name = _random_name()
            org_id = team_ids[(i - 1) % len(team_ids)]
            status = statuses[(i - 1) % len(statuses)]
            contract_signed = 1 if status in ("已签约", "已进场", "已离场") else 0
            on_site = 1 if status == "已进场" else 0
            created_at = now - dt.timedelta(days=random.randint(0, 90))

            params = {
                "org_id": org_id,
                "work_no": f"W{1000 + i}",
                "name": name,
                "mobile": _random_mobile(),
                "status": status,
                "contract_signed": contract_signed,
                "on_site": on_site,
                "created_at": created_at,
            }
            pid = _insert_id(
                engine,
                conn,
                """
                INSERT INTO person (org_id, work_no, name, mobile, status, contract_signed, on_site, created_at)
                VALUES (:org_id, :work_no, :name, :mobile, :status, :contract_signed, :on_site, :created_at)
                RETURNING id
                """,
                """
                INSERT INTO person (org_id, work_no, name, mobile, status, contract_signed, on_site, created_at)
                VALUES (:org_id, :work_no, :name, :mobile, :status, :contract_signed, :on_site, :created_at)
                """,
                params,
            )
            created_ids.append(int(pid))


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


def _ensure_job_titles(engine: Engine) -> None:
    with engine.begin() as conn:
        n = conn.execute(text("SELECT COUNT(*) FROM job_title_config")).scalar_one()
        if int(n) > 0:
            return

        # 初始化工种配置
        root_id = _insert_id(
            engine,
            conn,
            "INSERT INTO job_title_config (code, name, parent_id, sort) VALUES ('root', '工种分类', NULL, 0) RETURNING id",
            "INSERT INTO job_title_config (code, name, parent_id, sort) VALUES ('root', '工种分类', NULL, 0)",
        )

        # 一级工种
        craft_id = _insert_id(
            engine,
            conn,
            "INSERT INTO job_title_config (code, name, parent_id, sort) VALUES ('craft', '木工', :p, 0) RETURNING id",
            "INSERT INTO job_title_config (code, name, parent_id, sort) VALUES ('craft', '木工', :p, 0)",
            {"p": root_id},
        )
        steel_id = _insert_id(
            engine,
            conn,
            "INSERT INTO job_title_config (code, name, parent_id, sort) VALUES ('steel', '钢筋工', :p, 1) RETURNING id",
            "INSERT INTO job_title_config (code, name, parent_id, sort) VALUES ('steel', '钢筋工', :p, 1)",
            {"p": root_id},
        )
        concrete_id = _insert_id(
            engine,
            conn,
            "INSERT INTO job_title_config (code, name, parent_id, sort) VALUES ('concrete', '混凝土工', :p, 2) RETURNING id",
            "INSERT INTO job_title_config (code, name, parent_id, sort) VALUES ('concrete', '混凝土工', :p, 2)",
            {"p": root_id},
        )
        scaffold_id = _insert_id(
            engine,
            conn,
            "INSERT INTO job_title_config (code, name, parent_id, sort) VALUES ('scaffold', '架子工', :p, 3) RETURNING id",
            "INSERT INTO job_title_config (code, name, parent_id, sort) VALUES ('scaffold', '架子工', :p, 3)",
            {"p": root_id},
        )

        # 二级工种
        # 木工子类
        conn.execute(
            text("INSERT INTO job_title_config (code, name, parent_id, sort) VALUES (:c, :n, :p, :s)"),
            {"c": "carpenter", "n": "模板工", "p": craft_id, "s": 0}
        )
        conn.execute(
            text("INSERT INTO job_title_config (code, name, parent_id, sort) VALUES (:c, :n, :p, :s)"),
            {"c": "joiner", "n": "细木工", "p": craft_id, "s": 1}
        )
        # 钢筋工子类
        conn.execute(
            text("INSERT INTO job_title_config (code, name, parent_id, sort) VALUES (:c, :n, :p, :s)"),
            {"c": "steel_fixer", "n": "钢筋绑扎工", "p": steel_id, "s": 0}
        )
        conn.execute(
            text("INSERT INTO job_title_config (code, name, parent_id, sort) VALUES (:c, :n, :p, :s)"),
            {"c": "steel_cutter", "n": "钢筋切割工", "p": steel_id, "s": 1}
        )


def seed_minimal(engine: Engine) -> None:
    """
    为临时环境补充最小可用数据：
    - org：至少一棵公司/项目/标段/班组树
    - user：在 admin 之外维护两名管理用户
    - person：至少若干条人员档案
    - attendance：为这些人员生成最近若干天的考勤
    - job_title_config：工种配置
    """

    _ensure_org(engine)
    _ensure_job_titles(engine)
    _ensure_users(engine)
    _ensure_persons(engine, min_count=30)
    _ensure_attendance(engine, days=15)


if __name__ == "__main__":
    import sys
    import os
    # 添加server目录到Python路径
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'server'))
    
    from digital_labor.db import get_engine
    engine = get_engine()
    seed_minimal(engine)
    print("Seed data completed successfully!")

