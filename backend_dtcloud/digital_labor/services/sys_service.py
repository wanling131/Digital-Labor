from __future__ import annotations

def feature_status_payload() -> dict:
    # 阿里云人脸 1:N 可用（AccessKey 已配置且 SDK 正常）则返回 aliyun，否则 mock
    try:
        from digital_labor.services.aliyun_face_service import is_available
        face_verify = "aliyun" if is_available() else "mock"
    except Exception:
        face_verify = "mock"
    return {"faceVerify": face_verify}

