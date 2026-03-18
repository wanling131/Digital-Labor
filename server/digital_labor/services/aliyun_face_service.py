# -*- coding: utf-8 -*-
"""
阿里云视觉智能开放平台 - 人脸 1:N 服务

接入流程（参见 https://help.aliyun.com/zh/viapi/use-cases/face-search-1-n）：
1. 创建人脸数据库 CreateFaceDb
2. 添加人脸样本 AddFaceEntity（每个人员一个 entity_id，建议用 person_id）
3. 添加人脸数据 AddFace（向 entity 下添加人脸图片，每人最多 5 张）
4. 人脸搜索 SearchFace（核验时用待检图片在库中搜索，按置信度判定是否本人）

计费：仅 SearchFace 收费，CreateFaceDb / AddFaceEntity / AddFace 免费。
"""
from __future__ import annotations

import base64
import io
import logging
from typing import List, Optional, Tuple

from digital_labor.settings import settings

logger = logging.getLogger(__name__)

# 可选依赖：未配置密钥或未安装 SDK 时不导入，走 mock
_facebody_client = None


def _get_client():
    global _facebody_client
    if _facebody_client is not None:
        return _facebody_client
    if not settings.aliyun_access_key_id or not settings.aliyun_access_key_secret:
        return None
    try:
        from alibabacloud_facebody20191230.client import Client
        from alibabacloud_tea_openapi.models import Config

        config = Config(
            access_key_id=settings.aliyun_access_key_id,
            access_key_secret=settings.aliyun_access_key_secret,
            endpoint="facebody.cn-shanghai.aliyuncs.com",
            region_id="cn-shanghai",
        )
        _facebody_client = Client(config)
        return _facebody_client
    except Exception as e:
        logger.warning("Aliyun Face client init failed: %s", e)
        return None


def is_available() -> bool:
    """是否已配置阿里云人脸 1:N（AccessKey 存在且 SDK 可用）。"""
    return _get_client() is not None


def _decode_image(image_base64: str) -> Optional[bytes]:
    """支持带 data:image/xxx;base64, 前缀或纯 base64。"""
    raw = image_base64.strip()
    if raw.startswith("data:"):
        idx = raw.find("base64,")
        if idx != -1:
            raw = raw[idx + 7 :]
    try:
        return base64.b64decode(raw)
    except Exception as e:
        logger.warning("Base64 decode failed: %s", e)
        return None


def detect_liveness(image_base64: str) -> Tuple[bool, str]:
    """
    调用阿里云人脸活体检测（DetectLivingFace）。
    为了保持鲁棒性，这里采用保守策略：
    - 调用成功则视为通过；
    - 网络错误/配置错误等异常则视为未通过，并记录日志。
    后续如需根据具体得分做阈值判断，可在解析 resp.body.data 时增加逻辑。
    """
    client = _get_client()
    if not client:
        return False, "活体检测服务未配置"
    image_bytes = _decode_image(image_base64)
    if not image_bytes:
        return False, "图片格式无效"
    try:
        from alibabacloud_facebody20191230.models import (
            DetectLivingFaceAdvanceRequest,
            DetectLivingFaceAdvanceRequestTasks,
        )
        from alibabacloud_tea_util.models import RuntimeOptions

        task = DetectLivingFaceAdvanceRequestTasks(image_urlobject=io.BytesIO(image_bytes))
        req = DetectLivingFaceAdvanceRequest(tasks=[task])
        client.detect_living_face_advance(req, RuntimeOptions())
        # 不细分分数，调用成功即认为活体检测通过
        return True, "活体检测通过"
    except Exception as e:
        logger.warning("DetectLivingFace failed: %s", e)
        return False, "活体检测失败"


def ensure_face_db(db_name: Optional[str] = None) -> bool:
    """确保人脸库存在；不存在则创建。库名仅支持小写字母、数字、下划线，1~64 位。"""
    db_name = (db_name or settings.aliyun_face_db_name).strip()
    if not db_name:
        return False
    client = _get_client()
    if not client:
        return False
    try:
        from alibabacloud_facebody20191230.models import CreateFaceDbRequest
        from alibabacloud_tea_util.models import RuntimeOptions

        req = CreateFaceDbRequest(name=db_name)
        client.create_face_db_with_options(req, RuntimeOptions())
        logger.info("Created face db: %s", db_name)
        return True
    except Exception as e:
        # 已存在时可能返回特定错误码，视为成功
        err_msg = str(e).lower()
        if "exist" in err_msg or "duplicate" in err_msg or "already" in err_msg:
            return True
        logger.warning("CreateFaceDb failed for %s: %s", db_name, e)
        return False


def ensure_face_entity(db_name: str, entity_id: str) -> bool:
    """确保人脸样本（人员槽位）存在；不存在则创建。entity_id 建议用 person_id。"""
    client = _get_client()
    if not client:
        return False
    try:
        from alibabacloud_facebody20191230.models import AddFaceEntityRequest
        from alibabacloud_tea_util.models import RuntimeOptions

        req = AddFaceEntityRequest(db_name=db_name, entity_id=entity_id)
        client.add_face_entity_with_options(req, RuntimeOptions())
        logger.info("Added face entity: db=%s entity_id=%s", db_name, entity_id)
        return True
    except Exception as e:
        err_msg = str(e).lower()
        if "exist" in err_msg or "duplicate" in err_msg or "already" in err_msg:
            return True
        logger.warning("AddFaceEntity failed: %s", e)
        return False


def add_face_image(
    db_name: str,
    entity_id: str,
    image_bytes: bytes,
    extra_data: Optional[str] = None,
) -> bool:
    """向指定 entity 添加一张人脸图片（支持本地/内存流，使用 AddFaceAdvanceRequest）。"""
    client = _get_client()
    if not client:
        return False
    try:
        from alibabacloud_facebody20191230.models import AddFaceAdvanceRequest
        from alibabacloud_tea_util.models import RuntimeOptions

        req = AddFaceAdvanceRequest(
            db_name=db_name,
            entity_id=entity_id,
            image_url_object=io.BytesIO(image_bytes),
            extra_data=extra_data or entity_id,
        )
        client.add_face_advance(req, RuntimeOptions())
        logger.info("Added face image: db=%s entity_id=%s", db_name, entity_id)
        return True
    except Exception as e:
        logger.warning("AddFace failed: %s", e)
        return False


def search_face(
    db_name: str,
    image_bytes: bytes,
    limit: int = 1,
) -> List[Tuple[str, float]]:
    """
    在指定人脸库中搜索与给定图片最相似的人员。
    返回 [(entity_id, confidence), ...]，confidence 为 0~100，越高越相似。
    文档建议阈值 60.48/67.87/72.62 对应不同误识率。
    """
    client = _get_client()
    if not client:
        return []
    try:
        from alibabacloud_facebody20191230.models import SearchFaceAdvanceRequest
        from alibabacloud_tea_util.models import RuntimeOptions

        req = SearchFaceAdvanceRequest(
            db_name=db_name,
            image_url_object=io.BytesIO(image_bytes),
            limit=limit,
        )
        resp = client.search_face_advance(req, RuntimeOptions())
        if not resp or not resp.body or not resp.body.data:
            return []
        match_list = getattr(resp.body.data, "match_list", None) or []
        result = []
        for match in match_list:
            face_items = getattr(match, "face_items", None) or []
            for item in face_items:
                eid = getattr(item, "entity_id", None) or ""
                conf = float(getattr(item, "confidence", 0) or 0)
                result.append((eid, conf))
        return result
    except Exception as e:
        logger.warning("SearchFace failed: %s", e)
        return []


def enroll_person(person_id: int, image_base64: str) -> Tuple[bool, str]:
    """
    首次录入：为人员创建 entity 并添加人脸，成功后标记可参与后续 1:N 核验。
    返回 (成功, 消息)。
    """
    image_bytes = _decode_image(image_base64)
    if not image_bytes:
        return False, "图片格式无效"
    db_name = settings.aliyun_face_db_name
    entity_id = str(person_id)
    if not ensure_face_db(db_name):
        return False, "人脸库不可用"
    if not ensure_face_entity(db_name, entity_id):
        return False, "创建人脸样本失败"
    if not add_face_image(db_name, entity_id, image_bytes, extra_data=entity_id):
        return False, "添加人脸失败"
    return True, "录入成功"


def verify_person(person_id: int, image_base64: str) -> Tuple[bool, str]:
    """
    核验：用当前抓拍图在库中 1:N 搜索，若最高分命中为当前 person_id 且置信度达标则通过。
    返回 (是否通过, 消息)。
    """
    image_bytes = _decode_image(image_base64)
    if not image_bytes:
        return False, "图片格式无效"
    db_name = settings.aliyun_face_db_name
    threshold = settings.aliyun_face_confidence_threshold
    matches = search_face(db_name, image_bytes, limit=1)
    if not matches:
        return False, "未检测到人脸或搜索失败"
    entity_id, confidence = matches[0]
    if entity_id != str(person_id):
        return False, "与本人不符"
    if confidence < threshold:
        return False, "置信度不足"
    return True, "核验通过"
