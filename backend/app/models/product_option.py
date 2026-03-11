"""商品选项模型."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.product import Product


class ProductOption(Base):
    """商品选项模型（如"辣度"、"配料"）."""

    __tablename__ = "product_options"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    product_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)  # 如"辣度"
    is_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # 是否必选
    is_multiple: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # 是否多选
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # 关系
    product: Mapped["Product"] = relationship("Product", back_populates="options")
    values: Mapped[list["ProductOptionValue"]] = relationship(
        "ProductOptionValue", back_populates="option", cascade="all, delete-orphan", lazy="selectin"
    )


class ProductOptionValue(Base):
    """商品选项值模型（如"微辣"、"不要香菜"）."""

    __tablename__ = "product_option_values"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    option_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("product_options.id", ondelete="CASCADE"), nullable=False, index=True
    )
    value: Mapped[str] = mapped_column(String(50), nullable=False)  # 如"微辣"
    extra_price: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # 额外价格（分）
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # 关系
    option: Mapped["ProductOption"] = relationship("ProductOption", back_populates="values")
