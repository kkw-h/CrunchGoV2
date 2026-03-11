"""数据库种子数据脚本."""

import asyncio
import uuid
from datetime import time

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.base import AsyncSessionLocal

# 导入所有模型以确保正确注册
from app.models.category import Category
from app.models.merchant import Merchant
from app.models.order import Order, OrderItem  # noqa: F401
from app.models.order_item_option import OrderItemOption  # noqa: F401
from app.models.product import Product
from app.models.product_option import ProductOption, ProductOptionValue


async def create_merchant(session: AsyncSession) -> Merchant:
    """创建商家账户."""
    merchant = Merchant(
        id=str(uuid.uuid4()),
        name="美味小厨",
        address="北京市朝阳区美食街88号",
        phone="13800138000",
        business_hours_open=time(9, 0),
        business_hours_close=time(22, 0),
        username="admin",
        hashed_password=get_password_hash("admin123"),
        pickup_code_prefix="",
        pickup_code_daily_reset=True,
        pickup_code_counter=0,
        auto_print_order=False,
    )
    session.add(merchant)
    await session.commit()
    print(f"✓ 创建商家: {merchant.name} (用户名: admin, 密码: admin123)")
    return merchant


async def create_categories(session: AsyncSession) -> dict[str, Category]:
    """创建商品分类."""
    categories_data = [
        ("热销推荐", 1),
        ("主食", 2),
        ("小吃", 3),
        ("饮品", 4),
        ("甜点", 5),
    ]

    categories = {}
    for name, sort_order in categories_data:
        category = Category(
            id=str(uuid.uuid4()),
            name=name,
            sort_order=sort_order,
        )
        session.add(category)
        categories[name] = category

    await session.commit()
    print(f"✓ 创建 {len(categories)} 个分类")
    return categories


async def create_products(
    session: AsyncSession, categories: dict[str, Category]
) -> list[Product]:
    """创建商品数据."""
    products_data = [
        # 热销推荐
        {
            "name": "招牌牛肉面",
            "description": "秘制汤底，精选牛腩，搭配手工面条",
            "price": 2800,  # 28元
            "stock": 100,
            "category": "热销推荐",
            "sort_order": 1,
            "options": [
                {
                    "name": "辣度",
                    "is_required": True,
                    "is_multiple": False,
                    "values": [
                        ("不辣", 0),
                        ("微辣", 0),
                        ("中辣", 0),
                        ("特辣", 0),
                    ],
                },
                {
                    "name": "加料",
                    "is_required": False,
                    "is_multiple": True,
                    "values": [
                        ("加牛肉", 500),
                        ("加蛋", 200),
                        ("加青菜", 100),
                    ],
                },
            ],
        },
        {
            "name": "宫保鸡丁饭",
            "description": "经典川菜，鸡肉鲜嫩，花生酥脆",
            "price": 2200,  # 22元
            "stock": 80,
            "category": "热销推荐",
            "sort_order": 2,
            "options": [
                {
                    "name": "辣度",
                    "is_required": True,
                    "is_multiple": False,
                    "values": [
                        ("不辣", 0),
                        ("微辣", 0),
                        ("中辣", 0),
                    ],
                },
            ],
        },
        {
            "name": "红烧排骨饭",
            "description": "秘制红烧汁，肉质软烂入味",
            "price": 2600,  # 26元
            "stock": 60,
            "category": "热销推荐",
            "sort_order": 3,
        },
        # 主食
        {
            "name": "扬州炒饭",
            "description": "经典扬州风味，配料丰富",
            "price": 1800,  # 18元
            "stock": 50,
            "category": "主食",
            "sort_order": 1,
        },
        {
            "name": "蛋炒饭",
            "description": "简单美味，家常味道",
            "price": 1200,  # 12元
            "stock": 100,
            "category": "主食",
            "sort_order": 2,
        },
        {
            "name": "青菜肉丝面",
            "description": "清淡爽口，营养均衡",
            "price": 1500,  # 15元
            "stock": 80,
            "category": "主食",
            "sort_order": 3,
            "options": [
                {
                    "name": "面条类型",
                    "is_required": True,
                    "is_multiple": False,
                    "values": [
                        ("细面", 0),
                        ("粗面", 0),
                        ("刀削面", 200),
                    ],
                },
            ],
        },
        # 小吃
        {
            "name": "炸鸡块",
            "description": "外酥里嫩，金黄诱人",
            "price": 1200,  # 12元
            "stock": 100,
            "category": "小吃",
            "sort_order": 1,
        },
        {
            "name": "薯条",
            "description": "香脆可口，配番茄酱",
            "price": 800,  # 8元
            "stock": 150,
            "category": "小吃",
            "sort_order": 2,
        },
        {
            "name": "煎饺",
            "description": "皮薄馅大，底部金黄",
            "price": 1000,  # 10元
            "stock": 80,
            "category": "小吃",
            "sort_order": 3,
            "options": [
                {
                    "name": "馅料",
                    "is_required": True,
                    "is_multiple": False,
                    "values": [
                        ("猪肉白菜", 0),
                        ("韭菜鸡蛋", 0),
                        ("三鲜", 100),
                    ],
                },
            ],
        },
        {
            "name": "凉拌黄瓜",
            "description": "清爽开胃，解腻良品",
            "price": 600,  # 6元
            "stock": 50,
            "category": "小吃",
            "sort_order": 4,
        },
        # 饮品
        {
            "name": "鲜榨橙汁",
            "description": "100%纯果汁，无添加",
            "price": 1200,  # 12元
            "stock": 30,
            "category": "饮品",
            "sort_order": 1,
        },
        {
            "name": "酸梅汤",
            "description": "古法熬制，消暑解渴",
            "price": 800,  # 8元
            "stock": 50,
            "category": "饮品",
            "sort_order": 2,
        },
        {
            "name": "可乐",
            "description": "冰爽可口",
            "price": 500,  # 5元
            "stock": 200,
            "category": "饮品",
            "sort_order": 3,
        },
        {
            "name": "豆浆",
            "description": "现磨豆浆，营养健康",
            "price": 400,  # 4元
            "stock": 100,
            "category": "饮品",
            "sort_order": 4,
            "options": [
                {
                    "name": "甜度",
                    "is_required": True,
                    "is_multiple": False,
                    "values": [
                        ("无糖", 0),
                        ("少糖", 0),
                        ("正常", 0),
                    ],
                },
                {
                    "name": "温度",
                    "is_required": True,
                    "is_multiple": False,
                    "values": [
                        ("热", 0),
                        ("温", 0),
                        ("冰", 0),
                    ],
                },
            ],
        },
        # 甜点
        {
            "name": "红豆沙",
            "description": "软糯香甜，传统甜品",
            "price": 800,  # 8元
            "stock": 40,
            "category": "甜点",
            "sort_order": 1,
        },
        {
            "name": "绿豆沙",
            "description": "清热解暑，夏日首选",
            "price": 800,  # 8元
            "stock": 40,
            "category": "甜点",
            "sort_order": 2,
        },
    ]

    products = []
    for data in products_data:
        category_name = data.pop("category")
        options_data = data.pop("options", [])

        product = Product(
            id=str(uuid.uuid4()),
            category_id=categories[category_name].id,
            is_available=True,
            **data,
        )
        session.add(product)
        products.append(product)

        # 创建商品选项
        for option_data in options_data:
            values_data = option_data.pop("values")
            option = ProductOption(
                id=str(uuid.uuid4()),
                product_id=product.id,
                **option_data,
            )
            session.add(option)

            for value_name, extra_price in values_data:
                value = ProductOptionValue(
                    id=str(uuid.uuid4()),
                    option_id=option.id,
                    value=value_name,
                    extra_price=extra_price,
                )
                session.add(value)

    await session.commit()
    print(f"✓ 创建 {len(products)} 个商品")
    return products


async def seed():
    """执行种子数据."""
    async with AsyncSessionLocal() as session:
        try:
            # 检查是否已有数据
            from sqlalchemy import select
            result = await session.execute(select(Merchant))
            if result.scalars().first():
                print("数据库已有数据，跳过种子数据")
                return

            print("开始创建种子数据...")

            # 创建商家
            await create_merchant(session)

            # 创建分类
            categories = await create_categories(session)

            # 创建商品
            await create_products(session, categories)

            print("\n✅ 种子数据创建成功！")
            print("\n登录信息:")
            print("  用户名: admin")
            print("  密码: admin123")

        except Exception as e:
            await session.rollback()
            print(f"❌ 创建种子数据失败: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(seed())
