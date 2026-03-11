"""取餐码生成服务.

取餐码规则：
- 格式: [前缀] + 数字序号 (如: 001, A001, B001)
- 每天零点自动重置序号从 1 开始
- 支持配置前缀区分堂食/外带
- 原子操作避免并发重复
"""

from datetime import date, datetime
from typing import Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.merchant import Merchant


class PickupCodeService:
    """取餐码生成服务."""

    @staticmethod
    def format_pickup_code(counter: int, prefix: str = "") -> str:
        """格式化取餐码.

        Args:
            counter: 序号 (1, 2, 3...)
            prefix: 前缀 (如 "A", "B")

        Returns:
            格式化的取餐码 (如 "001", "A001")
        """
        return f"{prefix}{counter:03d}"

    @staticmethod
    def should_reset_counter(last_reset: datetime | None) -> bool:
        """检查是否需要重置计数器（跨天了）.

        Args:
            last_reset: 上次重置时间

        Returns:
            是否需要重置
        """
        if last_reset is None:
            return True

        today = date.today()
        last_reset_date = last_reset.date()

        return today > last_reset_date

    @classmethod
    async def generate_pickup_code(
        cls,
        db: AsyncSession,
        merchant_id: str,
    ) -> Tuple[str, int]:
        """生成新的取餐码.

        使用数据库行级锁确保并发安全.

        Args:
            db: 数据库会话
            merchant_id: 商家ID

        Returns:
            (取餐码, 序号)

        Raises:
            ValueError: 商家不存在
        """
        # 使用 FOR UPDATE 锁定商家记录
        result = await db.execute(
            select(Merchant)
            .where(Merchant.id == merchant_id)
            .with_for_update()
        )
        merchant = result.scalar_one_or_none()

        if merchant is None:
            raise ValueError(f"商家不存在: {merchant_id}")

        # 检查是否需要重置计数器
        if merchant.pickup_code_daily_reset and cls.should_reset_counter(
            merchant.pickup_code_last_reset
        ):
            merchant.pickup_code_counter = 0
            merchant.pickup_code_last_reset = datetime.utcnow()

        # 递增计数器
        merchant.pickup_code_counter += 1
        counter = merchant.pickup_code_counter

        # 生成取餐码
        pickup_code = cls.format_pickup_code(
            counter, merchant.pickup_code_prefix
        )

        await db.flush()

        return pickup_code, counter

    @classmethod
    async def get_current_pickup_code_info(
        cls,
        db: AsyncSession,
        merchant_id: str,
    ) -> dict:
        """获取当前取餐码配置信息.

        Args:
            db: 数据库会话
            merchant_id: 商家ID

        Returns:
            取餐码配置信息
        """
        result = await db.execute(
            select(Merchant).where(Merchant.id == merchant_id)
        )
        merchant = result.scalar_one_or_none()

        if merchant is None:
            raise ValueError(f"商家不存在: {merchant_id}")

        return {
            "prefix": merchant.pickup_code_prefix,
            "daily_reset": merchant.pickup_code_daily_reset,
            "current_counter": merchant.pickup_code_counter,
            "last_reset": merchant.pickup_code_last_reset,
            "next_pickup_code": cls.format_pickup_code(
                merchant.pickup_code_counter + 1, merchant.pickup_code_prefix
            ),
        }

    @classmethod
    async def reset_counter(
        cls,
        db: AsyncSession,
        merchant_id: str,
    ) -> None:
        """手动重置取餐码计数器.

        Args:
            db: 数据库会话
            merchant_id: 商家ID
        """
        result = await db.execute(
            select(Merchant).where(Merchant.id == merchant_id)
        )
        merchant = result.scalar_one_or_none()

        if merchant is None:
            raise ValueError(f"商家不存在: {merchant_id}")

        merchant.pickup_code_counter = 0
        merchant.pickup_code_last_reset = datetime.utcnow()
        await db.flush()
