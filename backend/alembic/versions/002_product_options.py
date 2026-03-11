"""Add product options support.

Revision ID: 002
Revises: 001
Create Date: 2025-03-11 15:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 商品选项表
    op.create_table(
        "product_options",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("product_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),  # 如"辣度"
        sa.Column("is_required", sa.Boolean(), default=False, nullable=False),  # 是否必选
        sa.Column("is_multiple", sa.Boolean(), default=False, nullable=False),  # 是否多选
        sa.Column("sort_order", sa.Integer(), default=0, nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_product_options_product_id"), "product_options", ["product_id"], unique=False
    )

    # 商品选项值表
    op.create_table(
        "product_option_values",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("option_id", sa.String(length=36), nullable=False),
        sa.Column("value", sa.String(length=50), nullable=False),  # 如"微辣"
        sa.Column("extra_price", sa.Integer(), default=0, nullable=False),  # 额外价格（分）
        sa.Column("sort_order", sa.Integer(), default=0, nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["option_id"], ["product_options.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_product_option_values_option_id"),
        "product_option_values",
        ["option_id"],
        unique=False,
    )

    # 订单项选项表（记录用户选择了什么）
    op.create_table(
        "order_item_options",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("order_item_id", sa.String(length=36), nullable=False),
        sa.Column("option_name", sa.String(length=50), nullable=False),  # 选项名称快照
        sa.Column("option_value", sa.String(length=50), nullable=False),  # 选项值快照
        sa.Column("extra_price", sa.Integer(), default=0, nullable=False),  # 额外价格快照
        sa.ForeignKeyConstraint(["order_item_id"], ["order_items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_order_item_options_order_item_id"),
        "order_item_options",
        ["order_item_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_order_item_options_order_item_id"), table_name="order_item_options"
    )
    op.drop_table("order_item_options")
    op.drop_index(
        op.f("ix_product_option_values_option_id"), table_name="product_option_values"
    )
    op.drop_table("product_option_values")
    op.drop_index(op.f("ix_product_options_product_id"), table_name="product_options")
    op.drop_table("product_options")
