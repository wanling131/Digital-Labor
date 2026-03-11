from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv


load_dotenv()


@dataclass(frozen=True)
class Settings:
    port: int = int(os.getenv("PORT", "3000"))
    jwt_secret: str = os.getenv("JWT_SECRET", "labor-secret-change-in-prod")
    token_version: str = os.getenv("TOKEN_VERSION", "1")
    encryption_key: str = os.getenv("ENCRYPTION_KEY", "")
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@localhost:5432/digital_labor",
    )

    # token 兼容 Node 端配置
    access_token_expiry_seconds: int = 2 * 60 * 60
    refresh_threshold_seconds: int = 30 * 60


settings = Settings()

