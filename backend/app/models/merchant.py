"""商家模型."""

from datetime import datetime, time
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Integer, String, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    pass


class Merchant(Base):
    """商家(店铺)模型."""

    __tablename__ = "merchants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # 营业时间
    business_hours_open: Mapped[time] = mapped_column(
        Time, default=time(9, 0), nullable=False
    )
    business_hours_close: Mapped[time] = mapped_column(
        Time, default=time(22, 0), nullable=False
    )

    # 登录凭证
    username: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    # 排队规则配置
    # 取餐码前缀，如 "A" 表示堂食，"B" 表示外带，空字符串表示纯数字
    pickup_code_prefix: Mapped[str] = mapped_column(String(5), default="", nullable=False)
    # 是否每天重置取餐码
    pickup_code_daily_reset: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # 当前取餐码计数器 (用于生成下一个取餐码)
    pickup_code_counter: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # 计数器最后重置日期
    pickup_code_last_reset: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # 其他配置
    auto_print_order: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # 常用订单备注 (JSON 格式存储数组)
    quick_remarks: Mapped[str | None] = mapped_column(String(1000), default="[]", nullable=True)

    # 微信小程序配置
    wechat_app_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    wechat_app_secret: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    def is_business_hours(self, check_time: time | None = None) -> bool:
        """检查给定时间是否在营业时间内."""
        if check_time is None:
            check_time = datetime.now().time()

        if self.business_hours_open <= self.business_hours_close:
            return self.business_hours_open <= check_time <= self.business_hours_close
        else:
            # 跨午夜的情况 (如 22:00 - 02:00)
            return check_time >= self.business_hours_open or check_time <= self.business_hours_close
