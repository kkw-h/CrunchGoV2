"""集成测试 - 完整业务流程."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.models.merchant import Merchant
from app.models.product import Product
from app.models.user import User


class TestFullOrderWorkflow:
    """完整订单流程测试."""

    async def test_complete_order_workflow(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_merchant: Merchant,
        merchant_headers: dict,
    ):
        """测试完整订单流程：创建分类->创建商品->下单->状态流转->完成."""

        # 1. 商家创建分类
        cat_response = await client.post(
            "/api/v1/categories",
            headers=merchant_headers,
            json={"name": "主食", "sort_order": 0}
        )
        assert cat_response.status_code == 201
        category_id = cat_response.json()["id"]

        # 2. 商家创建商品
        prod_response = await client.post(
            "/api/v1/products",
            headers=merchant_headers,
            json={
                "name": "招牌牛肉面",
                "description": "精选牛肉，熬制6小时",
                "price": 2800,  # 28元
                "stock": 100,
                "is_available": True,
                "sort_order": 0,
                "category_id": category_id
            }
        )
        assert prod_response.status_code == 201
        product_id = prod_response.json()["id"]

        # 3. 为商品添加选项
        opt_response = await client.post(
            f"/api/v1/products/{product_id}/options",
            headers=merchant_headers,
            json={
                "name": "面条粗细",
                "is_required": True,
                "is_multiple": False,
                "sort_order": 0,
                "values": [
                    {"value": "细面", "extra_price": 0, "sort_order": 0},
                    {"value": "粗面", "extra_price": 0, "sort_order": 1}
                ]
            }
        )
        assert opt_response.status_code == 200
        option_id = opt_response.json()["id"]
        value_id = opt_response.json()["values"][0]["id"]

        # 4. 用户微信登录
        wx_response = await client.post(
            "/api/v1/auth/wx-login",
            json={"code": "test_login_code"}
        )
        assert wx_response.status_code == 200
        user_token = wx_response.json()["access_token"]
        user_headers = {"Authorization": f"Bearer {user_token}"}

        # 5. 用户浏览商品列表
        list_response = await client.get(
            "/api/v1/products",
            headers=user_headers
        )
        assert list_response.status_code == 200
        products = list_response.json()["items"]
        assert len(products) > 0

        # 6. 用户查看商品详情
        detail_response = await client.get(
            f"/api/v1/products/{product_id}",
            headers=user_headers
        )
        assert detail_response.status_code == 200
        assert detail_response.json()["name"] == "招牌牛肉面"

        # 7. 用户创建订单
        order_response = await client.post(
            "/api/v1/orders",
            headers=user_headers,
            json={
                "customer_name": "张三",
                "customer_phone": "13800138000",
                "note": "多加葱花",
                "items": [
                    {
                        "product_id": product_id,
                        "quantity": 2,
                        "options": [
                            {"option_id": option_id, "value_id": value_id}
                        ]
                    }
                ]
            }
        )
        assert order_response.status_code == 201
        order_data = order_response.json()
        order_id = order_data["id"]
        pickup_code = order_data["pickup_code"]
        assert order_data["status"] == "pending"
        assert order_data["total_amount"] == 5600  # 28 * 2 = 56元

        # 8. 商家查看订单队列
        queue_response = await client.get(
            "/api/v1/orders/queue",
            headers=merchant_headers
        )
        assert queue_response.status_code == 200
        queue_data = queue_response.json()
        assert len(queue_data["pending"]) > 0

        # 9. 商家更新订单状态为制作中
        preparing_response = await client.patch(
            f"/api/v1/orders/{order_id}/status",
            headers=merchant_headers,
            json={"status": "preparing"}
        )
        assert preparing_response.status_code == 200
        assert preparing_response.json()["status"] == "preparing"

        # 10. 商家叫号
        call_response = await client.post(
            f"/api/v1/orders/{order_id}/call",
            headers=merchant_headers
        )
        assert call_response.status_code == 200
        assert pickup_code in call_response.json()["message"]

        # 11. 商家查看更新后的队列
        queue_response2 = await client.get(
            "/api/v1/orders/queue",
            headers=merchant_headers
        )
        assert queue_response2.status_code == 200

        # 12. 商家更新订单状态为已完成
        complete_response = await client.patch(
            f"/api/v1/orders/{order_id}/status",
            headers=merchant_headers,
            json={"status": "completed"}
        )
        assert complete_response.status_code == 200
        assert complete_response.json()["status"] == "completed"
        assert complete_response.json()["completed_at"] is not None

        # 13. 商家查看订单列表（包含已完成订单）
        orders_response = await client.get(
            "/api/v1/orders",
            headers=merchant_headers,
            params={"status": "completed"}
        )
        assert orders_response.status_code == 200
        completed_orders = orders_response.json()["items"]
        assert any(o["id"] == order_id for o in completed_orders)

    async def test_order_cancellation_workflow(
        self,
        client: AsyncClient,
        test_user: User,
        test_product: Product,
        test_merchant: Merchant,
        merchant_headers: dict,
    ):
        """测试订单取消流程."""
        from app.core.security import create_access_token

        user_token = create_access_token(test_user.id)
        user_headers = {"Authorization": f"Bearer {user_token}"}

        original_stock = test_product.stock

        # 1. 用户创建订单
        order_response = await client.post(
            "/api/v1/orders",
            headers=user_headers,
            json={
                "customer_name": "李四",
                "customer_phone": "13900139000",
                "items": [
                    {
                        "product_id": test_product.id,
                        "quantity": 5,
                        "options": []
                    }
                ]
            }
        )
        assert order_response.status_code == 201
        order_id = order_response.json()["id"]

        # 2. 商家取消订单
        cancel_response = await client.post(
            f"/api/v1/orders/{order_id}/cancel",
            headers=merchant_headers
        )
        assert cancel_response.status_code == 200
        assert cancel_response.json()["status"] == "cancelled"

        # 3. 验证订单详情
        detail_response = await client.get(
            f"/api/v1/orders/{order_id}",
            headers=merchant_headers
        )
        assert detail_response.status_code == 200
        assert detail_response.json()["status"] == "cancelled"


class TestErrorScenarios:
    """错误场景测试."""

    async def test_access_other_users_order(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_merchant: Merchant,
        test_product: Product,
    ):
        """测试用户无法访问其他用户的订单详情（通过 user_id 过滤）."""
        from app.core.security import create_access_token
        from datetime import datetime
        import uuid
        from app.models.order import Order, OrderItem, OrderStatus
        from app.models.user import User

        # 创建两个用户
        user1 = User(
            id=str(uuid.uuid4()),
            openid="user1_openid",
            nickname="用户1",
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        user2 = User(
            id=str(uuid.uuid4()),
            openid="user2_openid",
            nickname="用户2",
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db_session.add_all([user1, user2])
        await db_session.flush()

        # 创建订单（属于 user1）
        order = Order(
            id=str(uuid.uuid4()),
            order_number="202403110003",
            pickup_code="A003",
            status=OrderStatus.PENDING,
            total_amount=1000,
            user_id=user1.id,
            customer_name="顾客1",
            customer_phone="13800138000",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db_session.add(order)
        await db_session.flush()

        order_item = OrderItem(
            id=str(uuid.uuid4()),
            order_id=order.id,
            product_id=test_product.id,
            product_name=test_product.name,
            product_price=test_product.price,
            quantity=1,
        )
        db_session.add(order_item)
        await db_session.commit()

        # user2 尝试查看订单列表（应该看不到 user1 的订单）
        user2_token = create_access_token(user2.id)
        user2_headers = {"Authorization": f"Bearer {user2_token}"}

        response = await client.get(
            "/api/v1/orders",
            headers=user2_headers
        )
        assert response.status_code == 200
        orders = response.json()["items"]
        assert not any(o["id"] == order.id for o in orders)

    async def test_invalid_order_status_transitions(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_order,
        merchant_headers: dict,
    ):
        """测试无效的状态转换."""
        from app.models.order import OrderStatus

        # 尝试将待制作订单直接改为已完成（应该失败）
        assert test_order.status == OrderStatus.PENDING

        response = await client.patch(
            f"/api/v1/orders/{test_order.id}/status",
            headers=merchant_headers,
            json={"status": "completed"}
        )
        assert response.status_code == 400
        assert "不能从" in response.json()["detail"]

    async def test_create_order_with_unavailable_product(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        test_product: Product,
    ):
        """测试创建订单时商品已下架."""
        from app.core.security import create_access_token

        # 将商品下架
        test_product.is_available = False
        await db_session.commit()

        user_token = create_access_token(test_user.id)
        user_headers = {"Authorization": f"Bearer {user_token}"}

        response = await client.post(
            "/api/v1/orders",
            headers=user_headers,
            json={
                "customer_name": "顾客",
                "items": [{"product_id": test_product.id, "quantity": 1, "options": []}]
            }
        )
        assert response.status_code == 400
        assert "下架" in response.json()["detail"]
