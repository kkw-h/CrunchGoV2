"""订单 schema."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class OrderStatus(str, Enum):
    """订单状态."""

    PENDING = "pending"  # 待制作
    PREPARING = "preparing"  # 制作中
    READY = "ready"  # 待取餐
    COMPLETED = "completed"  # 已完成
    CANCELLED = "cancelled"  # 已取消


class OrderItemOptionResponse(BaseModel):
    """订单项选项响应 schema."""

    id: str
    option_name: str
    option_value: str
    extra_price: int

    class Config:
        from_attributes = True


class OrderItemOptionCreate(BaseModel):
    """创建订单项选项 schema."""

    option_id: str = Field(..., description="选项ID")
    value_id: str = Field(..., description="选项值ID")


class OrderItemBase(BaseModel):
    """订单项基础 schema."""

    product_id: str = Field(..., description="商品ID")
    quantity: int = Field(..., ge=1, description="数量")


class OrderItemCreate(OrderItemBase):
    """创建订单项 schema."""

    options: list[OrderItemOptionCreate] = Field(default=[], description="选择的选项")


class OrderItemResponse(BaseModel):
    """订单项响应 schema."""

    id: str
    product_id: str | None
    product_name: str
    product_price: int  # 分
    quantity: int
    selected_options: list[OrderItemOptionResponse] = []

    @property
    def subtotal(self) -> int:
        """计算小计."""
        return self.product_price * self.quantity

    class Config:
        from_attributes = True


class OrderBase(BaseModel):
    """订单基础 schema."""

    customer_name: str | None = Field(None, max_length=50, description="顾客姓名")
    customer_phone: str | None = Field(None, max_length=20, description="顾客电话")
    note: str | None = Field(None, max_length=500, description="订单备注")


class OrderCreate(OrderBase):
    """创建订单 schema."""

    items: list[OrderItemCreate] = Field(..., min_length=1, description="订单项")

    @field_validator("items")
    @classmethod
    def validate_items(cls, v: list[OrderItemCreate]) -> list[OrderItemCreate]:
        """验证订单项不为空."""
        if not v:
            raise ValueError("订单至少需要一件商品")
        return v


class OrderUpdate(BaseModel):
    """更新订单 schema."""

    customer_name: str | None = Field(None, max_length=50)
    customer_phone: str | None = Field(None, max_length=20)
    note: str | None = Field(None, max_length=500)


class OrderStatusUpdate(BaseModel):
    """更新订单状态 schema."""

    status: OrderStatus = Field(..., description="新状态")


class OrderResponse(OrderBase):
    """订单响应 schema."""

    id: str
    order_number: str
    pickup_code: str
    status: OrderStatus
    total_amount: int  # 分
    items: list[OrderItemResponse]
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None

    class Config:
        from_attributes = True


class OrderListResponse(BaseModel):
    """订单列表响应 schema."""

    items: list[OrderResponse]
    total: int
    page: int
    page_size: int


class QueueResponse(BaseModel):
    """排队队列响应 schema."""

    pending: list[OrderResponse]  # 待制作
    preparing: list[OrderResponse]  # 制作中
    ready: list[OrderResponse]  # 待取餐


class OrderQueryParams(BaseModel):
    """订单查询参数."""

    status: OrderStatus | None = None
    pickup_code: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
