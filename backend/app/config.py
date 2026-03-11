"""应用配置."""

from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置类."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # 应用基础配置
    PROJECT_NAME: str = "CrunchGo"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"

    # 安全配置
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 天
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 天
    ALGORITHM: str = "HS256"

    # 数据库配置
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/crunchgo"

    # CORS 配置 (逗号分隔的字符串)
    ALLOWED_HOSTS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # 商家配置
    PICKUP_CODE_PREFIX: str = ""  # 空字符串表示纯数字, 或 A/B 区分堂食外带
    PICKUP_CODE_DAILY_RESET: bool = True  # 每天重置取餐码

    # 微信小程序配置 (待实现)
    WECHAT_MINIAPP_ID: str = ""
    WECHAT_MINIAPP_SECRET: str = ""

    @property
    def allowed_hosts_list(self) -> List[str]:
        """获取允许的 CORS 域名列表."""
        if not self.ALLOWED_HOSTS:
            return []
        return [host.strip() for host in self.ALLOWED_HOSTS.split(",") if host.strip()]


@lru_cache
def get_settings() -> Settings:
    """获取配置单例."""
    return Settings()


settings = get_settings()
