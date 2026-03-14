from __future__ import annotations

from dataclasses import dataclass
import time
from typing import Any, Dict, List, Optional, Set, Union

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from digital_labor.auth.passwords import hash_password, is_bcrypt_hash, verify_password
from digital_labor.db import get_engine


# 简单 TTL 缓存（进程内），用于热点接口减压；可在后续替换为 Redis
_CACHE_TTL_SECONDS = 60
_cache: Dict[str, tuple[float, Any]] = {}


def _cache_get(key: str) -> Any | None:
    v = _cache.get(key)
    if not v:
        return None
    exp, data = v
    if exp < time.time():
        _cache.pop(key, None)
        return None
    return data


def _cache_set(key: str, data: Any, ttl: int = _CACHE_TTL_SECONDS) -> None:
    _cache[key] = (time.time() + ttl, data)


def _cache_invalidate_prefix(prefix: str) -> None:
    for k in list(_cache.keys()):
        if k.startswith(prefix):
            _cache.pop(k, None)


# 菜单与权限常量保持与现有 FastAPI controller 一致
FULL_MENUS: List[Dict[str, Any]] = [
    {"path": "/pc/dashboard", "label": "工作台"},
    {
        "path": "/pc/personnel",
        "label": "人员档案及实名中心",
        "children": [
            {"path": "/pc/personnel/archive", "label": "人员档案"},
            {"path": "/pc/personnel/certification", "label": "认证管理"},
            {"path": "/pc/personnel/status", "label": "状态管理"},
        ],
    },
    {
        "path": "/pc/contract",
        "label": "电子合同及签约中心",
        "children": [
            {"path": "/pc/contract/template", "label": "合同模板"},
            {"path": "/pc/contract/initiate", "label": "合同发起"},
            {"path": "/pc/contract/status", "label": "签约状态"},
            {"path": "/pc/contract/archive", "label": "合同归档"},
        ],
    },
    {
        "path": "/pc/attendance",
        "label": "考勤与工时管理",
        "children": [
            {"path": "/pc/attendance/import", "label": "考勤数据接入"},
            {"path": "/pc/attendance/report", "label": "工时报表"},
        ],
    },
    {
        "path": "/pc/settlement",
        "label": "智能结算中心",
        "children": [
            {"path": "/pc/settlement/generate", "label": "结算单生成与确认"},
            {"path": "/pc/settlement/analysis", "label": "薪资报表与成本分析"},
        ],
    },
    {
        "path": "/pc/site",
        "label": "项目现场管理",
        "children": [
            {"path": "/pc/site/departure", "label": "离场登记"},
            {"path": "/pc/site/realtime", "label": "在岗人员实时看板"},
        ],
    },
    {
        "path": "/pc/system",
        "label": "系统管理",
        "children": [
            {"path": "/pc/system/users", "label": "用户管理"},
            {"path": "/pc/system/organization", "label": "组织管理"},
            {"path": "/pc/system/job-title", "label": "工种配置"},
            {"path": "/pc/system/permissions", "label": "权限分配"},
            {"path": "/pc/system/logs", "label": "操作日志"},
        ],
    },
]


def _collect_paths(menus: List[Dict[str, Any]], out: Optional[List[str]] = None) -> List[str]:
    out = out or []
    for m in menus:
        p = m.get("path")
        if p and p not in out:
            out.append(p)
        if m.get("children"):
            _collect_paths(m["children"], out)
    return out


ALL_PATHS = _collect_paths(FULL_MENUS)
USER_HIDDEN_PATHS = {"/pc/system/users", "/pc/system/permissions", "/pc/system/logs"}


def org_tree() -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT id, parent_id, name, type, sort, manager, created_at FROM org ORDER BY sort, id")).mappings().all()
        counts = conn.execute(text("SELECT org_id, COUNT(*) as n FROM person WHERE org_id IS NOT NULL GROUP BY org_id")).mappings().all()

    person_count_by_org: Dict[int, int] = {int(r["org_id"]): int(r["n"]) for r in counts if r["org_id"] is not None}
    org_rows = [dict(r) for r in rows]

    children_map: Dict[int, List[Dict[str, Any]]] = {}
    for r in org_rows:
        pid = int(r["parent_id"] or 0)
        children_map.setdefault(pid, []).append(r)

    def descendant_ids(oid: int) -> List[int]:
        ids = [oid]
        for c in children_map.get(oid, []):
            ids.extend(descendant_ids(int(c["id"])))
        return ids

    def build(parent_id: int = 0) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        for r in children_map.get(parent_id, []):
            dids = descendant_ids(int(r["id"]))
            member_count = sum(person_count_by_org.get(i, 0) for i in dids)
            out.append({**r, "manager": r.get("manager") or "", "memberCount": member_count, "children": build(int(r["id"]))})
        return out

    return {"tree": build(0)}


def org_create(body: Dict[str, Any]) -> int:
    name = (body.get("name") or "").strip()
    if not name:
        raise ValueError("name 必填")
    engine = get_engine()
    with engine.begin() as conn:
        params = {
            "p": int(body.get("parent_id") or 0),
            "n": name,
            "t": body.get("type") or "company",
            "s": int(body.get("sort") or 0),
            "m": body.get("manager"),
        }
        if engine.dialect.name == "sqlite":
            r = conn.execute(
                text("INSERT INTO org (parent_id, name, type, sort, manager) VALUES (:p, :n, :t, :s, :m)"),
                params,
            )
            return int(r.lastrowid or 0)
        r = conn.execute(
            text("INSERT INTO org (parent_id, name, type, sort, manager) VALUES (:p, :n, :t, :s, :m) RETURNING id"),
            params,
        ).mappings().first()
        return int(r["id"])


def org_update(org_id: int, patch: Dict[str, Any]) -> None:
    updates = []
    params: Dict[str, Any] = {"id": org_id}
    for k in ("name", "type", "sort", "manager"):
        if k in patch:
            updates.append(f"{k} = :{k}")
            params[k] = patch.get(k)
    if not updates:
        raise ValueError("无有效字段")
    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(text(f"UPDATE org SET {', '.join(updates)} WHERE id = :id"), params)


def org_delete(org_id: int) -> str:
    engine = get_engine()
    with engine.connect() as conn:
        child = conn.execute(text("SELECT 1 FROM org WHERE parent_id = :id LIMIT 1"), {"id": org_id}).first()
    if child:
        return "has_child"
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM org WHERE id = :id"), {"id": org_id})
    return "ok"


def user_list() -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT u.id, u.username, u.name, u.org_id, u.role, u.enabled, u.created_at, o.name as org_name
                FROM "user" u LEFT JOIN org o ON u.org_id=o.id
                ORDER BY u.id
                """
            )
        ).mappings().all()
    return {"list": [dict(r) for r in rows]}


def user_create(body: Dict[str, Any]) -> Union[str, int]:
    if not body.get("username") or not body.get("password"):
        raise ValueError("用户名和密码必填")
    engine = get_engine()
    try:
        with engine.begin() as conn:
            params = {
                "u": body["username"],
                "p": hash_password(body["password"]),
                "n": body.get("name"),
                "o": body.get("org_id"),
                "r": body.get("role") or "admin",
            }
            if engine.dialect.name == "sqlite":
                rr = conn.execute(
                    text('INSERT INTO "user" (username, password_hash, name, org_id, role) VALUES (:u, :p, :n, :o, :r)'),
                    params,
                )
                r = {"id": int(rr.lastrowid or 0)}
            else:
                r = conn.execute(
                    text(
                        """
                        INSERT INTO "user" (username, password_hash, name, org_id, role)
                        VALUES (:u, :p, :n, :o, :r)
                        RETURNING id
                        """
                    ),
                    params,
                ).mappings().first()
    except IntegrityError:
        return "duplicate"
    return int(r["id"])


def user_update(user_id: int, patch: Dict[str, Any]) -> None:
    updates = []
    params: Dict[str, Any] = {"id": user_id}
    if "name" in patch:
        updates.append("name = :name")
        params["name"] = patch.get("name")
    if "org_id" in patch:
        updates.append("org_id = :org_id")
        params["org_id"] = patch.get("org_id")
    if "role" in patch:
        updates.append("role = :role")
        params["role"] = patch.get("role")
    if "enabled" in patch:
        updates.append("enabled = :enabled")
        params["enabled"] = 1 if patch.get("enabled") else 0
    if "password" in patch and patch.get("password"):
        updates.append("password_hash = :password")
        params["password"] = hash_password(patch["password"])
    if not updates:
        raise ValueError("无有效字段")
    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(text('UPDATE "user" SET ' + ", ".join(updates) + " WHERE id = :id"), params)


def seed_role_menu_if_empty() -> None:
    engine = get_engine()
    with engine.begin() as conn:
        n = conn.execute(text("SELECT COUNT(*) FROM role_menu")).scalar_one()
        if int(n) > 0:
            return
        for p in ALL_PATHS:
            conn.execute(text("INSERT INTO role_menu (role_code, menu_path) VALUES ('admin', :p) ON CONFLICT DO NOTHING"), {"p": p})
        for p in [p for p in ALL_PATHS if p not in USER_HIDDEN_PATHS]:
            conn.execute(text("INSERT INTO role_menu (role_code, menu_path) VALUES ('user', :p) ON CONFLICT DO NOTHING"), {"p": p})


def seed_role_permission_if_empty() -> None:
    engine = get_engine()
    with engine.connect() as conn:
        n = conn.execute(text("SELECT COUNT(*) FROM role_permission")).scalar_one()
        if int(n) > 0:
            return
    default_user_perms = [
        "person:view", "person:add", "person:edit", "person:export", "person:import", "person:batch_status",
        "contract:view", "contract:add", "contract:edit",
        "settlement:view", "settlement:generate", "settlement:confirm",
        "attendance:view", "attendance:import", "attendance:log",
        "site:view", "site:edit", "data:view", "system:org",
    ]
    engine = get_engine()
    try:
        with engine.begin() as conn:
            for k in default_user_perms:
                conn.execute(text("INSERT INTO role_permission (role_code, permission_key) VALUES ('user', :k)"), {"k": k})
    except Exception:  # noqa: BLE001  # unique violation if already seeded
        pass


def my_menu(user_id: int) -> dict:
    seed_role_menu_if_empty()
    engine = get_engine()
    with engine.connect() as conn:
        role = conn.execute(text('SELECT role FROM "user" WHERE id = :id AND enabled = 1'), {"id": user_id}).scalar() or "user"
        rows = conn.execute(text("SELECT menu_path FROM role_menu WHERE role_code = :r"), {"r": role}).mappings().all()
    allowed: Set[str] = {r["menu_path"] for r in rows}

    def filter_by_allowed(menus: List[Dict[str, Any]], allowed_set: Set[str]) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        for m in menus:
            children = m.get("children")
            if children:
                fc = filter_by_allowed(children, allowed_set)
                if fc or (m.get("path") in allowed_set):
                    out.append({**m, "children": fc})
            else:
                if m.get("path") in allowed_set:
                    out.append(m)
        return out

    def filter_by_role(menus: List[Dict[str, Any]], role_code: str) -> List[Dict[str, Any]]:
        if role_code == "admin":
            return menus
        out: List[Dict[str, Any]] = []
        for m in menus:
            children = m.get("children")
            if children:
                fc = [c for c in children if c.get("path") not in USER_HIDDEN_PATHS]
                if fc:
                    out.append({**m, "children": fc})
            else:
                if m.get("path") not in USER_HIDDEN_PATHS:
                    out.append(m)
        return out

    menus = filter_by_allowed(FULL_MENUS, allowed) if allowed else filter_by_role(FULL_MENUS, role)
    return {"menus": menus}


def all_menus() -> dict:
    seed_role_menu_if_empty()
    return {"menus": FULL_MENUS}


def roles_summary() -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(text('SELECT role, COUNT(*) as n FROM "user" GROUP BY role')).mappings().all()
    counts = {r["role"]: int(r["n"]) for r in rows}
    return {
        "list": [
            {"code": "admin", "name": "管理员", "desc": "拥有全部菜单与功能", "userCount": counts.get("admin", 0)},
            {"code": "user", "name": "业务员", "desc": "不含用户管理、权限分配、操作日志", "userCount": counts.get("user", 0)},
        ]
    }


def role_menus(code: str) -> dict:
    seed_role_menu_if_empty()
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT menu_path FROM role_menu WHERE role_code = :c"), {"c": code}).mappings().all()
    return {"paths": [r["menu_path"] for r in rows]}


def role_menus_save(code: str, paths: List[str]) -> dict:
    valid = set(ALL_PATHS)
    to_insert = [p for p in paths if p in valid]
    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM role_menu WHERE role_code = :c"), {"c": code})
        for p in to_insert:
            conn.execute(text("INSERT INTO role_menu (role_code, menu_path) VALUES (:c, :p)"), {"c": code, "p": p})
    return {"ok": True, "count": len(to_insert)}


ALL_PERMISSION_KEYS = [
    "person:view",
    "person:add",
    "person:edit",
    "person:delete",
    "person:export",
    "person:import",
    "person:batch_status",
    "contract:view",
    "contract:add",
    "contract:edit",
    "settlement:view",
    "settlement:generate",
    "settlement:confirm",
    "attendance:view",
    "attendance:import",
    "attendance:log",
    "site:view",
    "site:edit",
    "data:view",
    "system:user",
    "system:org",
    "system:permission",
    "system:log",
]


def role_permissions(code: str) -> dict:
    if code == "admin":
        return {"keys": ALL_PERMISSION_KEYS}
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT permission_key FROM role_permission WHERE role_code = :c"), {"c": code}).mappings().all()
    return {"keys": [r["permission_key"] for r in rows]}


def role_permissions_save(code: str, keys: List[str]) -> dict:
    valid = set(ALL_PERMISSION_KEYS)
    to_insert = [k for k in keys if k in valid]
    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM role_permission WHERE role_code = :c"), {"c": code})
        for k in to_insert:
            conn.execute(text("INSERT INTO role_permission (role_code, permission_key) VALUES (:c, :k)"), {"c": code, "k": k})
    _cache_invalidate_prefix("my_permissions:")
    return {"ok": True, "count": len(to_insert)}


def all_permissions() -> dict:
    groups = [
        {"name": "人员管理", "keys": ["person:view", "person:add", "person:edit", "person:delete", "person:export", "person:import", "person:batch_status"]},
        {"name": "合同管理", "keys": ["contract:view", "contract:add", "contract:edit"]},
        {"name": "结算管理", "keys": ["settlement:view", "settlement:generate", "settlement:confirm"]},
        {"name": "考勤管理", "keys": ["attendance:view", "attendance:import", "attendance:log"]},
        {"name": "现场管理", "keys": ["site:view", "site:edit"]},
        {"name": "数据报表", "keys": ["data:view"]},
        {"name": "系统管理", "keys": ["system:user", "system:org", "system:permission", "system:log"]},
    ]
    return {"groups": groups, "allKeys": ALL_PERMISSION_KEYS}


def my_permissions(user_id: int) -> dict:
    cached = _cache_get(f"my_permissions:{user_id}")
    if cached is not None:
        return cached
    seed_role_permission_if_empty()
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(text('SELECT role, org_id FROM "user" WHERE id = :id AND enabled = 1'), {"id": user_id}).mappings().first()
        role = (row or {}).get("role") or "user"
        org_id = (row or {}).get("org_id")
        if role == "admin":
            data = {"permissions": ALL_PERMISSION_KEYS, "org_id": org_id, "role": role}
            _cache_set(f"my_permissions:{user_id}", data)
            return data
        perms = conn.execute(text("SELECT permission_key FROM role_permission WHERE role_code = :r"), {"r": role}).mappings().all()
    data = {"permissions": [p["permission_key"] for p in perms], "org_id": org_id, "role": role}
    _cache_set(f"my_permissions:{user_id}", data)
    return data


def op_log_list(limit: int, offset: int) -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        total = conn.execute(text("SELECT COUNT(*) FROM op_log")).scalar_one()
        rows = conn.execute(text("SELECT * FROM op_log ORDER BY id DESC LIMIT :l OFFSET :o"), {"l": limit, "o": offset}).mappings().all()
    return {"list": [dict(r) for r in rows], "total": int(total)}


def my_profile(user_id: int) -> dict:
    """
    当前登录用户的个人资料（管理端）。
    """
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(
            text(
                """
                SELECT u.id, u.username, u.name, u.org_id, u.role, u.enabled, u.created_at, o.name AS org_name
                FROM "user" u LEFT JOIN org o ON u.org_id = o.id
                WHERE u.id = :id
                """
            ),
            {"id": user_id},
        ).mappings().first()
    if not row:
        return {}
    return dict(row)


def profile_update(user_id: int, patch: Dict[str, Any]) -> None:
    """
    更新当前用户的个人资料（目前仅支持 name）。
    """
    updates = []
    params: Dict[str, Any] = {"id": user_id}
    if "name" in patch:
        updates.append("name = :name")
        params["name"] = patch.get("name")
    if not updates:
        raise ValueError("无有效字段")
    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(text('UPDATE "user" SET ' + ", ".join(updates) + " WHERE id = :id"), params)


def change_password(user_id: int, old_password: str, new_password: str) -> str:
    """
    修改当前用户密码。支持旧明文存储的渐进迁移。
    返回:
      - "ok" 正常修改
      - "bad_old_password" 旧密码不匹配
      - "no_user" 用户不存在
    """
    if not new_password:
        raise ValueError("新密码不能为空")
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(
            text('SELECT password_hash FROM "user" WHERE id = :id'),
            {"id": user_id},
        ).mappings().first()
    if not row:
        return "no_user"
    current = (row or {}).get("password_hash") or ""
    if is_bcrypt_hash(current):
        if not verify_password(old_password, current):
            return "bad_old_password"
    else:
        if str(current) != str(old_password):
            return "bad_old_password"
    with engine.begin() as conn:
        conn.execute(
            text('UPDATE "user" SET password_hash = :p WHERE id = :id'),
            {"p": hash_password(new_password), "id": user_id},
        )
    return "ok"


@dataclass
class UserImportResult:
    count: int
    errors: List[str]


def import_users_from_excel(data: bytes) -> UserImportResult:
    try:
        import openpyxl  # type: ignore
    except Exception as e:  # noqa: BLE001
        raise RuntimeError("缺少依赖 openpyxl，无法解析 Excel") from e

    import io

    wb = openpyxl.load_workbook(io.BytesIO(data), data_only=True)
    ws = wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return UserImportResult(count=0, errors=[])

    header = [str(h or "").strip() for h in rows[0]]

    def _find(patterns: List[str]) -> int:
        for i, h in enumerate(header):
            for p in patterns:
                if p.lower() in h.lower():
                    return i
        return -1

    username_idx = _find(["用户名", "username", "账号"])
    password_idx = _find(["密码", "password"])
    name_idx = _find(["姓名", "name"])
    org_idx = _find(["组织", "org", "组织ID"])
    role_idx = _find(["角色", "role"])
    if username_idx < 0 or password_idx < 0:
        raise ValueError("Excel 需包含「用户名」列和「密码」列")

    engine = get_engine()
    count = 0
    errors: List[str] = []
    with engine.begin() as conn:
        for i in range(1, len(rows)):
            r = rows[i]
            username = str(r[username_idx] or "").strip()
            password = str(r[password_idx] or "").strip()
            if not username or not password:
                errors.append(f"第 {i + 1} 行：用户名或密码为空")
                continue

            name = str(r[name_idx]).strip() if name_idx >= 0 and r[name_idx] is not None else None
            org_id = None
            if org_idx >= 0 and r[org_idx] is not None:
                try:
                    org_id = int(str(r[org_idx]).strip())
                except Exception:  # noqa: BLE001
                    org_id = None
            role_raw = str(r[role_idx]).strip() if role_idx >= 0 and r[role_idx] is not None else "admin"
            role_val = "admin" if ("admin" in role_raw.lower() or "管理员" in role_raw) else "user"

            try:
                conn.execute(
                    text(
                        """
                        INSERT INTO "user" (username, password_hash, name, org_id, role)
                        VALUES (:u, :p, :n, :o, :r)
                        """
                    ),
                    {"u": username, "p": hash_password(password), "n": name, "o": org_id, "r": role_val},
                )
                count += 1
            except Exception as e:  # noqa: BLE001
                if "unique" in str(e).lower():
                    errors.append(f"第 {i + 1} 行：用户名 {username} 已存在")
                else:
                    errors.append(f"第 {i + 1} 行：{e}")

    return UserImportResult(count=count, errors=errors)

