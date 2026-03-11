from __future__ import annotations


def health_payload() -> dict:
    # 与旧 Node：GET /api/health 返回 { ok: true }
    return {"ok": True}


def api_root_payload() -> dict:
    # 与旧 Node：GET /api 返回元信息
    return {"name": "Digital Labor", "api": "v1", "docs": "接口说明见 server/docs/API.md"}

