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


settings = Settings()


def _validate_prod_secrets() -> None:
    """生产环境启动时校验敏感配置，避免使用默认/空值。"""
    env = os.getenv("ENV", "").strip().lower()
    if env != "prod" and env != "production":
        return
    if not settings.jwt_secret or settings.jwt_secret == _DEFAULT_JWT_SECRET:
        raise RuntimeError(
            "生产环境必须设置 JWT_SECRET 环境变量，且不能使用默认值。"
            "请生成随机密钥并配置：export JWT_SECRET='your-secure-random-secret'"
        )

