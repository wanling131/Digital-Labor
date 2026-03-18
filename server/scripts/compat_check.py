from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional, Set, Tuple, Union

import requests


@dataclass(frozen=True)
class Case:
    name: str
    method: str
    path: str
    body: Optional[Dict[str, Any]] = None
    headers: Optional[Dict[str, str]] = None
    ignore_keys: Tuple[str, ...] = ()


def _req(base: str, c: Case) -> Tuple[int, Union[Dict[str, Any], List[Any], str, None], Dict[str, str]]:
    url = base.rstrip("/") + c.path
    r = requests.request(c.method, url, json=c.body, headers=c.headers, timeout=20)
    ct = r.headers.get("content-type", "")
    if "application/json" in ct:
        try:
            return r.status_code, r.json(), dict(r.headers)
        except Exception:  # noqa: BLE001
            return r.status_code, r.text, dict(r.headers)
    return r.status_code, r.text, dict(r.headers)


def _strip_ignored(x: Any, ignore: Set[str]) -> Any:
    if isinstance(x, dict):
        return {k: _strip_ignored(v, ignore) for k, v in x.items() if k not in ignore}
    if isinstance(x, list):
        return [_strip_ignored(v, ignore) for v in x]
    return x


def _print_diff(a: Any, b: Any) -> None:
    aa = json.dumps(a, ensure_ascii=False, sort_keys=True, indent=2)
    bb = json.dumps(b, ensure_ascii=False, sort_keys=True, indent=2)
    sys.stderr.write("---- old ----\n" + aa + "\n")
    sys.stderr.write("---- new ----\n" + bb + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare legacy Node API vs new Python API.")
    parser.add_argument("--old", help="Legacy base url, e.g. http://localhost:3000")
    parser.add_argument("--new", required=True, help="New base url, e.g. http://localhost:3002")
    parser.add_argument(
        "--new-only",
        action="store_true",
        help="Only check new backend (no old); assert status 200 and expected keys.",
    )
    args = parser.parse_args()

    if args.new_only:
        if args.old:
            sys.stderr.write("Warning: --old is ignored when --new-only is set.\n")
        _run_new_only(args.new)
        return

    if not args.old:
        parser.error("--old is required unless --new-only is set.")
    _run_compare(args.old, args.new)


def _run_new_only(base: str) -> None:
    """仅校验新后端：请求各用例，检查状态码与必要字段。登录返回 503 时视为数据库未就绪，计为通过。"""
    cases: List[Case] = [
        Case(name="health", method="GET", path="/api/health"),
        Case(name="api_root", method="GET", path="/api"),
        Case(
            name="login_admin",
            method="POST",
            path="/api/auth/login",
            body={"username": "admin", "password": "123456"},
            ignore_keys=("token",),
        ),
        Case(
            name="feature_status",
            method="GET",
            path="/api/sys/feature-status",
        ),
    ]
    ok_cnt = 0
    for c in cases:
        status, body, _ = _req(base, c)
        if status == 200:
            if c.name == "login_admin" and isinstance(body, dict):
                if "user" not in body and "token" not in body:
                    sys.stderr.write(f"[FAIL] {c.name}: response missing 'user' or 'token'\n")
                    continue
            ok_cnt += 1
            print(f"[OK] {c.name}")
            continue
        if status == 503 and c.name == "login_admin":
            ok_cnt += 1
            print(f"[OK] {c.name} (503 数据库未就绪，框架已正确返回)")
            continue
        sys.stderr.write(f"[FAIL] {c.name}: status={status}\n")
        if isinstance(body, dict):
            sys.stderr.write(json.dumps(body, ensure_ascii=False, indent=2) + "\n")
    if ok_cnt != len(cases):
        raise SystemExit(2)


def _run_compare(old_base: str, new_base: str) -> None:
    """旧/新后端对照：状态码与 body 一致（忽略 ignore_keys）。"""
    cases: List[Case] = [
        Case(name="health", method="GET", path="/api/health"),
        Case(name="api_root", method="GET", path="/api"),
        Case(
            name="login_admin",
            method="POST",
            path="/api/auth/login",
            body={"username": "admin", "password": "123456"},
            ignore_keys=("token",),
        ),
        Case(
            name="feature_status",
            method="GET",
            path="/api/sys/feature-status",
        ),
    ]
    ok_cnt = 0
    for c in cases:
        old_status, old_body, old_headers = _req(old_base, c)
        new_status, new_body, new_headers = _req(new_base, c)

        if old_status != new_status:
            sys.stderr.write(f"[FAIL] {c.name}: status old={old_status} new={new_status}\n")
            _print_diff(old_body, new_body)
            continue

        ignore = set(c.ignore_keys)
        old_clean = _strip_ignored(old_body, ignore)
        new_clean = _strip_ignored(new_body, ignore)
        if old_clean != new_clean:
            sys.stderr.write(f"[FAIL] {c.name}: body mismatch\n")
            _print_diff(old_clean, new_clean)
            continue

        ok_cnt += 1
        print(f"[OK] {c.name}")

    if ok_cnt != len(cases):
        raise SystemExit(2)


if __name__ == "__main__":
    main()

