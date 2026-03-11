from __future__ import annotations

import os


def feature_status_payload() -> dict:
    # 兼容 Node：配置 ALIYUN_ACCESS_KEY_* 则标记为 aliyun，否则 mock
    face_verify = "aliyun" if os.getenv("ALIYUN_ACCESS_KEY_ID") and os.getenv("ALIYUN_ACCESS_KEY_SECRET") else "mock"
    return {"faceVerify": face_verify}

