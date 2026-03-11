from __future__ import annotations

from fastapi import APIRouter, Request
from digital_labor.services.data_service import board_payload as svc_board_payload
from digital_labor.services.data_service import board_trend_payload as svc_board_trend_payload
from digital_labor.web.response import ok


router = APIRouter(prefix="/api/data")


@router.get("/board")
def board():
    return ok(svc_board_payload())


@router.get("/board/trend")
def board_trend(request: Request):
    days = int(request.query_params.get("days") or 30)
    return ok(svc_board_trend_payload(days))

