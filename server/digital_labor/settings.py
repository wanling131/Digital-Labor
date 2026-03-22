from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv


load_dotenv()


_DEFAULT_JWT_SECRET = "labor-secret-change-in-prod"


@dataclass(frozen=True)
class Settings:
    port: int = int(os.getenv("PORT", "3000"))
    jwt_secret: str = os.getenv("JWT_SECRET", _DEFAULT_JWT_SECRET)
    token_version: str = os.getenv("TOKEN_VERSION", "1")
    encryption_key: str = os.getenv("ENCRYPTION_KEY", "")
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@localhost:5432/digital_labor",
    )

    # token 兼容 Node 端配置
    access_token_expiry_seconds: int = 2 * 60 * 60
    refresh_threshold_seconds: int = 30 * 60

    # CORS: 逗号分隔的允许来源，生产环境应配置具体域名
    cors_allow_origins: str = os.getenv("CORS_ALLOW_ORIGINS", "*")

    # 是否使用 httpOnly cookie 存储 token（更安全，防 XSS 窃取）
    use_httponly_cookie: bool = os.getenv("USE_HTTPONLY_COOKIE", "false").lower() in ("true", "1")

    # P2 系统嵌入：API 路由前缀，如 /labor 使接口变为 /labor/api/auth 等
    labor_api_prefix: str = os.getenv("LABOR_API_PREFIX", "").rstrip("/")

    # 阿里云人脸 1:N（视觉智能开放平台 facebody）
    # 使用 ALIBABA_CLOUD_ACCESS_KEY_ID / ALIBABA_CLOUD_ACCESS_KEY_SECRET，与阿里云文档一致；
    # 也可使用 ALIYUN_ACCESS_KEY_ID / ALIYUN_ACCESS_KEY_SECRET 兼容旧配置
    aliyun_access_key_id: str = (
        os.getenv("ALIBABA_CLOUD_ACCESS_KEY_ID") or os.getenv("ALIYUN_ACCESS_KEY_ID") or ""
    )
    aliyun_access_key_secret: str = (
        os.getenv("ALIBABA_CLOUD_ACCESS_KEY_SECRET") or os.getenv("ALIYUN_ACCESS_KEY_SECRET") or ""
    )
    aliyun_face_db_name: str = os.getenv("ALIYUN_FACE_DB_NAME", "digital_labor_face")
    # 人脸搜索置信度阈值 0~100，文档建议 60.48/67.87/72.62 对应不同误识率
    try:
        _aliyun_face_threshold_raw = os.getenv("ALIYUN_FACE_CONFIDENCE_THRESHOLD", "60.48")
        aliyun_face_confidence_threshold: float = float(_aliyun_face_threshold_raw)
    except ValueError:
        # 环境变量配置错误时回退到安全默认值，避免应用在导入阶段崩溃
        aliyun_face_confidence_threshold = 60.48

    # Redis 缓存配置
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # 工人端演示密码（仅开发环境使用，生产环境应禁用或设置强密码）
    # 设置为空字符串可禁用演示密码登录
    worker_demo_password: str = os.getenv("WORKER_DEMO_PASSWORD", "")


settings = Settings()


def _validate_prod_secrets() -> None:
    """生产环境启动时校验敏感配置，避免使用默认/空值。"""
    env = os.getenv("ENV", "").strip().lower()
    if env != "prod" and env != "production":
        return
    
    errors = []
    
    if not settings.jwt_secret or settings.jwt_secret == _DEFAULT_JWT_SECRET:
        errors.append(
            "JWT_SECRET 环境变量必须设置且不能使用默认值。"
            "请生成随机密钥：openssl rand -hex 32"
        )
    
    if not settings.encryption_key:
        errors.append(
            "ENCRYPTION_KEY 环境变量必须设置用于加密敏感数据。"
            "请生成随机密钥：openssl rand -hex 32"
        )
    
    if settings.database_url and "postgres:postgres@" in settings.database_url:
        errors.append(
            "DATABASE_URL 包含默认密码，生产环境必须使用强密码。"
        )
    
    if settings.cors_allow_origins == "*":
        errors.append(
            "CORS_ALLOW_ORIGINS 设置为 '*' 允许所有来源，生产环境应配置具体域名。"
        )
    
    if errors:
        raise RuntimeError(
            "生产环境安全配置检查失败：\n" + "\n".join(f"  - {e}" for e in errors)
        )


# 模块加载时自动执行生产环境安全检查
_validate_prod_secrets()

