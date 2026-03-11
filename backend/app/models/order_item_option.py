"""订单项选项模型."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.order import OrderItem


class OrderItemOption(Base):
    """订单项选项（记录用户选择的选项）."""

    __tablename__ = "order_item_options"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    order_item_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("order_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    option_name: Mapped[str] = mapped_column(String(50), nullable=False)  # 选项名称快照
    option_value: Mapped[str] = mapped_column(String(50), nullable=False)  # 选项值快照
    extra_price: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # 额外价格快照

    # 关系
    order_item: Mapped["OrderItem"] = relationship("OrderItem", back_populates="selected_options")
