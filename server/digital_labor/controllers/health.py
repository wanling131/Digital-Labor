from __future__ import annotations

from fastapi import APIRouter

from digital_labor.services.health_service import api_root_payload, health_payload
from digital_labor.web.response import ok


router = APIRouter()


@router.get("/api/health")
def health():
    return ok(health_payload())


@router.get("/api")
def api_root():
    return ok(api_root_payload())

