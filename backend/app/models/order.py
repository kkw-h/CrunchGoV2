"""订单模型."""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.order_item_option import OrderItemOption
    from app.models.product import Product
    from app.models.user import User


class OrderStatus(str, Enum):
    """订单状态枚举."""

    PENDING = "pending"  # 待制作
    PREPARING = "preparing"  # 制作中
    READY = "ready"  # 待取餐
    COMPLETED = "completed"  # 已完成
    CANCELLED = "cancelled"  # 已取消


class Order(Base):
    """订单模型."""

    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    # 订单编号 (如: 202403110001)
    order_number: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True
    )
    # 取餐码 (如: 001, A001)
    pickup_code: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    status: Mapped[OrderStatus] = mapped_column(
        SQLEnum(OrderStatus), default=OrderStatus.PENDING, nullable=False, index=True
    )

    # 金额 (以分为单位)
    total_amount: Mapped[int] = mapped_column(Integer, nullable=False)

    # 关联用户 (微信小程序端)
    user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True, index=True
    )

    # 顾客信息 (微信小程序端)
    customer_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    customer_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    customer_openid: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # 订单备注
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # 关系
    user: Mapped["User | None"] = relationship("User", back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan"
    )

    def get_total_yuan(self) -> float:
        """获取以元为单位的总金额."""
        return self.total_amount / 100

    def can_transition_to(self, new_status: OrderStatus) -> bool:
        """检查状态转换是否合法."""
        transitions = {
            OrderStatus.PENDING: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
            OrderStatus.PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
            OrderStatus.READY: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
            OrderStatus.COMPLETED: [],
            OrderStatus.CANCELLED: [],
        }
        return new_status in transitions.get(self.status, [])


class OrderItem(Base):
    """订单项模型."""

    __tablename__ = "order_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)

    # 外键
    order_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("orders.id"), nullable=False, index=True
    )
    product_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("products.id"), nullable=True
    )

    # 商品快照 (防止商品信息修改后订单显示不一致)
    product_name: Mapped[str] = mapped_column(String(100), nullable=False)
    product_price: Mapped[int] = mapped_column(Integer, nullable=False)  # 分
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    # 关系
    order: Mapped["Order"] = relationship("Order", back_populates="items")
    product: Mapped["Product | None"] = relationship("Product", back_populates="order_items")
    selected_options: Mapped[list["OrderItemOption"]] = relationship(
        "OrderItemOption", back_populates="order_item", cascade="all, delete-orphan", lazy="selectin"
    )

    @property
    def subtotal(self) -> int:
        """计算小计金额 (分)."""
        return self.product_price * self.quantity

    def get_subtotal_yuan(self) -> float:
        """获取以元为单位的小计."""
        return self.subtotal / 100
