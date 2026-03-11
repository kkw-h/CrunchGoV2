"""重置并添加测试数据脚本."""

import asyncio
import sys
import uuid
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import AsyncSessionLocal, init_db
from app.models.category import Category
from app.models.product import Product
from app.models.product_option import ProductOption, ProductOptionValue


async def clear_existing_data(db: AsyncSession):
    """清空现有商品数据."""
    print("清空现有数据...")

    # 导入订单相关模型
    from app.models.order_item_option import OrderItemOption
    from app.models.order import Order, OrderItem

    # 删除订单项选项
    await db.execute(delete(OrderItemOption))
    # 删除订单项
    await db.execute(delete(OrderItem))
    # 删除订单
    await db.execute(delete(Order))

    # 删除选项值
    await db.execute(delete(ProductOptionValue))
    # 删除选项
    await db.execute(delete(ProductOption))
    # 删除商品
    await db.execute(delete(Product))
    # 删除分类
    await db.execute(delete(Category))

    await db.commit()
    print("✓ 现有数据已清空")


async def create_categories(db: AsyncSession) -> list[Category]:
    """创建测试分类."""
    print("创建分类...")

    categories_data = [
        {"id": str(uuid.uuid4()), "name": "热销推荐", "sort_order": 1},
        {"id": str(uuid.uuid4()), "name": "主食", "sort_order": 2},
        {"id": str(uuid.uuid4()), "name": "小吃", "sort_order": 3},
        {"id": str(uuid.uuid4()), "name": "饮品", "sort_order": 4},
        {"id": str(uuid.uuid4()), "name": "甜点", "sort_order": 5},
    ]

    categories = []
    for data in categories_data:
        category = Category(**data)
        db.add(category)
        categories.append(category)

    await db.commit()
    for cat in categories:
        await db.refresh(cat)

    print(f"✓ 创建了 {len(categories)} 个分类")
    return categories


async def create_products(db: AsyncSession, categories: list[Category]):
    """创建测试商品."""
    print("创建商品...")

    # 热销推荐
    hot_category = next(c for c in categories if c.name == "热销推荐")
    # 主食
    main_category = next(c for c in categories if c.name == "主食")
    # 小吃
    snack_category = next(c for c in categories if c.name == "小吃")
    # 饮品
    drink_category = next(c for c in categories if c.name == "饮品")
    # 甜点
    dessert_category = next(c for c in categories if c.name == "甜点")

    products_data = [
        # 热销推荐
        {
            "name": "招牌牛肉面",
            "description": "精选上等牛肉，慢火炖煮3小时，汤鲜味美",
            "price": 2800,  # 28元
            "stock": 100,
            "is_available": True,
            "sort_order": 1,
            "category_id": hot_category.id,
            "options": [
                {
                    "name": "面条粗细",
                    "is_required": True,
                    "is_multiple": False,
                    "sort_order": 1,
                    "values": [
                        {"value": "细面", "extra_price": 0, "sort_order": 1},
                        {"value": "粗面", "extra_price": 0, "sort_order": 2},
                        {"value": "宽面", "extra_price": 100, "sort_order": 3},
                    ],
                },
                {
                    "name": "辣度",
                    "is_required": True,
                    "is_multiple": False,
                    "sort_order": 2,
                    "values": [
                        {"value": "不辣", "extra_price": 0, "sort_order": 1},
                        {"value": "微辣", "extra_price": 0, "sort_order": 2},
                        {"value": "中辣", "extra_price": 0, "sort_order": 3},
                        {"value": "特辣", "extra_price": 0, "sort_order": 4},
                    ],
                },
                {
                    "name": "加料",
                    "is_required": False,
                    "is_multiple": True,
                    "sort_order": 3,
                    "values": [
                        {"value": "加牛肉", "extra_price": 800, "sort_order": 1},
                        {"value": "加蛋", "extra_price": 200, "sort_order": 2},
                        {"value": "加青菜", "extra_price": 100, "sort_order": 3},
                    ],
                },
            ],
        },
        {
            "name": "秘制红烧肉饭",
            "description": "肥瘦相间，入口即化，配秘制酱汁",
            "price": 3200,
            "stock": 80,
            "is_available": True,
            "sort_order": 2,
            "category_id": hot_category.id,
            "options": [
                {
                    "name": "米饭分量",
                    "is_required": True,
                    "is_multiple": False,
                    "sort_order": 1,
                    "values": [
                        {"value": "标准", "extra_price": 0, "sort_order": 1},
                        {"value": "大份", "extra_price": 300, "sort_order": 2},
                    ],
                },
            ],
        },
        # 主食
        {
            "name": "扬州炒饭",
            "description": "经典扬州炒饭，配料丰富",
            "price": 2200,
            "stock": 50,
            "is_available": True,
            "sort_order": 1,
            "category_id": main_category.id,
            "options": [
                {
                    "name": "加料",
                    "is_required": False,
                    "is_multiple": True,
                    "sort_order": 1,
                    "values": [
                        {"value": "虾仁", "extra_price": 500, "sort_order": 1},
                        {"value": "叉烧", "extra_price": 400, "sort_order": 2},
                        {"value": "蛋", "extra_price": 200, "sort_order": 3},
                    ],
                },
            ],
        },
        {
            "name": "宫保鸡丁盖饭",
            "description": "经典川菜，麻辣鲜香",
            "price": 2400,
            "stock": 60,
            "is_available": True,
            "sort_order": 2,
            "category_id": main_category.id,
            "options": [
                {
                    "name": "辣度",
                    "is_required": True,
                    "is_multiple": False,
                    "sort_order": 1,
                    "values": [
                        {"value": "微辣", "extra_price": 0, "sort_order": 1},
                        {"value": "中辣", "extra_price": 0, "sort_order": 2},
                        {"value": "特辣", "extra_price": 0, "sort_order": 3},
                    ],
                },
            ],
        },
        {
            "name": "日式豚骨拉面",
            "description": "浓郁豚骨汤底，搭配叉烧和溏心蛋",
            "price": 3500,
            "stock": 40,
            "is_available": True,
            "sort_order": 3,
            "category_id": main_category.id,
            "options": [
                {
                    "name": "面条硬度",
                    "is_required": True,
                    "is_multiple": False,
                    "sort_order": 1,
                    "values": [
                        {"value": "软", "extra_price": 0, "sort_order": 1},
                        {"value": "普通", "extra_price": 0, "sort_order": 2},
                        {"value": "硬", "extra_price": 0, "sort_order": 3},
                    ],
                },
                {
                    "name": "加料",
                    "is_required": False,
                    "is_multiple": True,
                    "sort_order": 2,
                    "values": [
                        {"value": "叉烧", "extra_price": 600, "sort_order": 1},
                        {"value": "溏心蛋", "extra_price": 300, "sort_order": 2},
                        {"value": "海苔", "extra_price": 200, "sort_order": 3},
                    ],
                },
            ],
        },
        {
            "name": "意大利肉酱面",
            "description": "经典意式肉酱，浓郁番茄风味",
            "price": 3000,
            "stock": 0,  # 无库存
            "is_available": True,
            "sort_order": 4,
            "category_id": main_category.id,
            "options": [],
        },
        {
            "name": "泰式冬阴功汤面",
            "description": "酸辣开胃，香茅风味",
            "price": 2600,
            "stock": 30,
            "is_available": False,  # 已下架
            "sort_order": 5,
            "category_id": main_category.id,
            "options": [],
        },
        # 小吃
        {
            "name": "脆皮炸鸡",
            "description": "外酥里嫩，金黄诱人",
            "price": 1800,
            "stock": 100,
            "is_available": True,
            "sort_order": 1,
            "category_id": snack_category.id,
            "options": [
                {
                    "name": "口味",
                    "is_required": True,
                    "is_multiple": False,
                    "sort_order": 1,
                    "values": [
                        {"value": "原味", "extra_price": 0, "sort_order": 1},
                        {"value": "香辣", "extra_price": 0, "sort_order": 2},
                        {"value": "蜂蜜芥末", "extra_price": 100, "sort_order": 3},
                    ],
                },
                {
                    "name": "分量",
                    "is_required": True,
                    "is_multiple": False,
                    "sort_order": 2,
                    "values": [
                        {"value": "小份(3块)", "extra_price": 0, "sort_order": 1},
                        {"value": "中份(5块)", "extra_price": 800, "sort_order": 2},
                        {"value": "大份(8块)", "extra_price": 1500, "sort_order": 3},
                    ],
                },
            ],
        },
        {
            "name": "薯条",
            "description": "金黄酥脆，停不下来",
            "price": 1200,
            "stock": 150,
            "is_available": True,
            "sort_order": 2,
            "category_id": snack_category.id,
            "options": [
                {
                    "name": "蘸酱",
                    "is_required": False,
                    "is_multiple": True,
                    "sort_order": 1,
                    "values": [
                        {"value": "番茄酱", "extra_price": 0, "sort_order": 1},
                        {"value": "蛋黄酱", "extra_price": 100, "sort_order": 2},
                        {"value": "芝士酱", "extra_price": 200, "sort_order": 3},
                    ],
                },
            ],
        },
        {
            "name": "盐酥鸡",
            "description": "台湾经典小吃，香酥可口",
            "price": 1500,
            "stock": 80,
            "is_available": True,
            "sort_order": 3,
            "category_id": snack_category.id,
            "options": [],
        },
        {
            "name": "凉拌黄瓜",
            "description": "清爽解腻，开胃小菜",
            "price": 800,
            "stock": 0,  # 无库存
            "is_available": True,
            "sort_order": 4,
            "category_id": snack_category.id,
            "options": [],
        },
        # 饮品
        {
            "name": "珍珠奶茶",
            "description": "Q弹珍珠，香浓奶茶",
            "price": 1500,
            "stock": 200,
            "is_available": True,
            "sort_order": 1,
            "category_id": drink_category.id,
            "options": [
                {
                    "name": "糖度",
                    "is_required": True,
                    "is_multiple": False,
                    "sort_order": 1,
                    "values": [
                        {"value": "无糖", "extra_price": 0, "sort_order": 1},
                        {"value": "微糖", "extra_price": 0, "sort_order": 2},
                        {"value": "半糖", "extra_price": 0, "sort_order": 3},
                        {"value": "正常", "extra_price": 0, "sort_order": 4},
                        {"value": "多糖", "extra_price": 0, "sort_order": 5},
                    ],
                },
                {
                    "name": "冰度",
                    "is_required": True,
                    "is_multiple": False,
                    "sort_order": 2,
                    "values": [
                        {"value": "去冰", "extra_price": 0, "sort_order": 1},
                        {"value": "微冰", "extra_price": 0, "sort_order": 2},
                        {"value": "少冰", "extra_price": 0, "sort_order": 3},
                        {"value": "正常", "extra_price": 0, "sort_order": 4},
                    ],
                },
                {
                    "name": "加料",
                    "is_required": False,
                    "is_multiple": True,
                    "sort_order": 3,
                    "values": [
                        {"value": "椰果", "extra_price": 200, "sort_order": 1},
                        {"value": "布丁", "extra_price": 300, "sort_order": 2},
                        {"value": "红豆", "extra_price": 200, "sort_order": 3},
                    ],
                },
            ],
        },
        {
            "name": "鲜榨橙汁",
            "description": "100%纯果汁，维C满满",
            "price": 1800,
            "stock": 50,
            "is_available": True,
            "sort_order": 2,
            "category_id": drink_category.id,
            "options": [
                {
                    "name": "温度",
                    "is_required": True,
                    "is_multiple": False,
                    "sort_order": 1,
                    "values": [
                        {"value": "常温", "extra_price": 0, "sort_order": 1},
                        {"value": "加冰", "extra_price": 0, "sort_order": 2},
                    ],
                },
            ],
        },
        {
            "name": "可乐",
            "description": "畅爽气泡，经典味道",
            "price": 800,
            "stock": 300,
            "is_available": True,
            "sort_order": 3,
            "category_id": drink_category.id,
            "options": [
                {
                    "name": "规格",
                    "is_required": True,
                    "is_multiple": False,
                    "sort_order": 1,
                    "values": [
                        {"value": "小杯", "extra_price": 0, "sort_order": 1},
                        {"value": "中杯", "extra_price": 200, "sort_order": 2},
                        {"value": "大杯", "extra_price": 500, "sort_order": 3},
                    ],
                },
            ],
        },
        {
            "name": "冰美式咖啡",
            "description": "提神醒脑，浓郁咖啡香",
            "price": 1600,
            "stock": 100,
            "is_available": True,
            "sort_order": 4,
            "category_id": drink_category.id,
            "options": [
                {
                    "name": "浓度",
                    "is_required": True,
                    "is_multiple": False,
                    "sort_order": 1,
                    "values": [
                        {"value": "标准", "extra_price": 0, "sort_order": 1},
                        {"value": "加浓", "extra_price": 300, "sort_order": 2},
                    ],
                },
            ],
        },
        # 甜点
        {
            "name": "提拉米苏",
            "description": "意式经典，咖啡与芝士的完美融合",
            "price": 2800,
            "stock": 30,
            "is_available": True,
            "sort_order": 1,
            "category_id": dessert_category.id,
            "options": [],
        },
        {
            "name": "芒果班戟",
            "description": "新鲜芒果，香甜可口",
            "price": 2200,
            "stock": 25,
            "is_available": True,
            "sort_order": 2,
            "category_id": dessert_category.id,
            "options": [],
        },
        {
            "name": "红豆汤圆",
            "description": "暖心甜品，软糯香甜",
            "price": 1200,
            "stock": 40,
            "is_available": True,
            "sort_order": 3,
            "category_id": dessert_category.id,
            "options": [
                {
                    "name": "温度",
                    "is_required": True,
                    "is_multiple": False,
                    "sort_order": 1,
                    "values": [
                        {"value": "热", "extra_price": 0, "sort_order": 1},
                        {"value": "温", "extra_price": 0, "sort_order": 2},
                        {"value": "冰", "extra_price": 0, "sort_order": 3},
                    ],
                },
            ],
        },
        {
            "name": "抹茶千层",
            "description": "层层叠叠，抹茶清香",
            "price": 2600,
            "stock": 0,  # 无库存
            "is_available": True,
            "sort_order": 4,
            "category_id": dessert_category.id,
            "options": [],
        },
        {
            "name": "北海道芝士蛋糕",
            "description": "轻乳酪蛋糕，入口即化",
            "price": 2400,
            "stock": 20,
            "is_available": False,  # 已下架
            "sort_order": 5,
            "category_id": dessert_category.id,
            "options": [],
        },
    ]

    for product_data in products_data:
        options_data = product_data.pop("options", [])
        product_data["id"] = str(uuid.uuid4())

        product = Product(**product_data)
        db.add(product)
        await db.flush()  # 确保 product.id 可用

        # 创建选项
        for option_data in options_data:
            values_data = option_data.pop("values", [])
            option_data["id"] = str(uuid.uuid4())

            option = ProductOption(
                product_id=product.id,
                **option_data
            )
            db.add(option)
            await db.flush()  # 确保 option.id 可用

            # 创建选项值
            for value_data in values_data:
                value_data["id"] = str(uuid.uuid4())
                value = ProductOptionValue(
                    option_id=option.id,
                    **value_data
                )
                db.add(value)

    await db.commit()
    print(f"✓ 创建了 {len(products_data)} 个商品")

    # 统计信息
    available_count = sum(1 for p in products_data if p["is_available"] and p["stock"] > 0)
    print(f"  - 可售商品: {available_count}")
    print(f"  - 无库存商品: {sum(1 for p in products_data if p['stock'] == 0)}")
    print(f"  - 已下架商品: {sum(1 for p in products_data if not p['is_available'])}")


async def main():
    """主函数."""
    print("=" * 50)
    print("开始重置测试数据")
    print("=" * 50)

    # 初始化数据库
    await init_db()

    async with AsyncSessionLocal() as db:
        # 清空现有数据
        await clear_existing_data(db)

        # 创建分类
        categories = await create_categories(db)

        # 创建商品
        await create_products(db, categories)

    print("=" * 50)
    print("测试数据重置完成！")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
