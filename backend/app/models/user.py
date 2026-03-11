"""用户模型 (微信小程序用户)."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.order import Order


class User(Base):
    """微信小程序用户模型."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)

    # 微信 OpenID (唯一标识)
    openid: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )

    # 微信 UnionID (多应用互通)
    unionid: Mapped[str | None] = mapped_column(
        String(50), unique=True, nullable=True
    )

    # 用户信息 (小程序授权获取)
    nickname: Mapped[str | None] = mapped_column(String(50), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # 用户状态
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    # 登录统计
    login_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # 关系
    orders: Mapped[list["Order"]] = relationship("Order", back_populates="user")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, openid={self.openid}, nickname={self.nickname})>"
