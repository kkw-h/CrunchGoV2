"""订单接口测试."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.merchant import Merchant
from app.models.order import Order, OrderStatus
from app.models.product import Product
from app.models.product_option import ProductOption, ProductOptionValue
from app.models.user import User


class TestOrderEndpoints:
    """订单端点测试类."""

    class TestListOrders:
        """获取订单列表测试."""

        async def test_list_orders_success(
            self, client: AsyncClient, test_order: Order, merchant_headers: dict
        ):
            """测试获取订单列表成功."""
            response = await client.get(
                "/api/v1/orders",
                headers=merchant_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert "items" in data
            assert "total" in data
            assert "page" in data
            assert "page_size" in data

        async def test_list_orders_with_status_filter(
            self, client: AsyncClient, test_order: Order, merchant_headers: dict
        ):
            """测试按状态筛选订单."""
            response = await client.get(
                "/api/v1/orders",
                headers=merchant_headers,
                params={"status": "pending"}
            )
            assert response.status_code == 200
            data = response.json()
            assert all(item["status"] == "pending" for item in data["items"])

        async def test_list_orders_with_pickup_code_filter(
            self, client: AsyncClient, test_order: Order, merchant_headers: dict
        ):
            """测试按取餐码筛选."""
            response = await client.get(
                "/api/v1/orders",
                headers=merchant_headers,
                params={"pickup_code": test_order.pickup_code}
            )
            assert response.status_code == 200
            data = response.json()
            assert len(data["items"]) >= 1

        async def test_list_orders_pagination(
            self, client: AsyncClient, merchant_headers: dict
        ):
            """测试分页."""
            response = await client.get(
                "/api/v1/orders",
                headers=merchant_headers,
                params={"page": 1, "page_size": 10}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["page"] == 1
            assert data["page_size"] == 10

        async def test_list_orders_as_user(
            self, client: AsyncClient, test_order: Order, user_headers: dict
        ):
            """测试用户只能看到自己的订单."""
            response = await client.get(
                "/api/v1/orders",
                headers=user_headers
            )
            assert response.status_code == 200
            data = response.json()
            # 用户只能看到自己的订单
            for item in data["items"]:
                assert item["user_id"] == test_order.user_id

    class TestGetQueue:
        """获取排队队列测试."""

        async def test_get_queue_success(
            self, client: AsyncClient, merchant_headers: dict
        ):
            """测试获取队列成功."""
            response = await client.get(
                "/api/v1/orders/queue",
                headers=merchant_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert "pending" in data
            assert "preparing" in data
            assert "ready" in data
            assert isinstance(data["pending"], list)
            assert isinstance(data["preparing"], list)
            assert isinstance(data["ready"], list)

    class TestCreateOrder:
        """创建订单测试."""

        async def test_create_order_success(
            self,
            client: AsyncClient,
            test_user: User,
            test_product: Product,
            user_headers: dict
        ):
            """测试创建订单成功."""
            response = await client.post(
                "/api/v1/orders",
                headers=user_headers,
                json={
                    "customer_name": "顾客姓名",
                    "customer_phone": "13800138000",
                    "note": "不要辣椒",
                    "items": [
                        {
                            "product_id": test_product.id,
                            "quantity": 2,
                            "options": []
                        }
                    ]
                }
            )
            assert response.status_code == 201
            data = response.json()
            assert data["customer_name"] == "顾客姓名"
            assert data["status"] == "pending"
            assert len(data["items"]) == 1
            assert "pickup_code" in data
            assert "order_number" in data

        async def test_create_order_with_options(
            self,
            client: AsyncClient,
            test_user: User,
            test_product_with_options: Product,
            user_headers: dict
        ):
            """测试创建带选项的订单."""
            option = test_product_with_options.options[0]
            value = option.values[0]

            response = await client.post(
                "/api/v1/orders",
                headers=user_headers,
                json={
                    "customer_name": "顾客姓名",
                    "customer_phone": "13800138000",
                    "items": [
                        {
                            "product_id": test_product_with_options.id,
                            "quantity": 1,
                            "options": [
                                {
                                    "option_id": option.id,
                                    "value_id": value.id
                                }
                            ]
                        }
                    ]
                }
            )
            assert response.status_code == 201
            data = response.json()
            assert len(data["items"]) == 1
            assert len(data["items"][0]["selected_options"]) == 1

        async def test_create_order_unauthenticated(
            self, client: AsyncClient, test_product: Product
        ):
            """测试未认证创建订单."""
            response = await client.post(
                "/api/v1/orders",
                json={
                    "customer_name": "顾客",
                    "items": [{"product_id": test_product.id, "quantity": 1, "options": []}]
                }
            )
            assert response.status_code == 401

        async def test_create_order_product_not_found(
            self, client: AsyncClient, test_user: User, user_headers: dict
        ):
            """测试创建订单时商品不存在."""
            response = await client.post(
                "/api/v1/orders",
                headers=user_headers,
                json={
                    "customer_name": "顾客",
                    "items": [{"product_id": "invalid-id", "quantity": 1, "options": []}]
                }
            )
            assert response.status_code == 400

        async def test_create_order_insufficient_stock(
            self,
            client: AsyncClient,
            test_user: User,
            test_product: Product,
            user_headers: dict
        ):
            """测试库存不足."""
            response = await client.post(
                "/api/v1/orders",
                headers=user_headers,
                json={
                    "customer_name": "顾客",
                    "items": [{"product_id": test_product.id, "quantity": 9999, "options": []}]
                }
            )
            assert response.status_code == 400
            assert "库存不足" in response.json()["detail"]

        async def test_create_order_missing_required_option(
            self,
            client: AsyncClient,
            test_user: User,
            test_product_with_options: Product,
            user_headers: dict
        ):
            """测试缺少必选项."""
            response = await client.post(
                "/api/v1/orders",
                headers=user_headers,
                json={
                    "customer_name": "顾客",
                    "items": [
                        {
                            "product_id": test_product_with_options.id,
                            "quantity": 1,
                            "options": []  # 缺少必选项
                        }
                    ]
                }
            )
            assert response.status_code == 400
            assert "必选项" in response.json()["detail"]

    class TestGetOrder:
        """获取订单详情测试."""

        async def test_get_order_success(
            self, client: AsyncClient, test_order: Order, merchant_headers: dict
        ):
            """测试获取订单详情成功."""
            response = await client.get(
                f"/api/v1/orders/{test_order.id}",
                headers=merchant_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == test_order.id
            assert data["order_number"] == test_order.order_number
            assert "items" in data

        async def test_get_order_not_found(
            self, client: AsyncClient, merchant_headers: dict
        ):
            """测试获取不存在的订单."""
            response = await client.get(
                "/api/v1/orders/nonexistent-id",
                headers=merchant_headers
            )
            assert response.status_code == 404

    class TestUpdateOrder:
        """更新订单测试."""

        async def test_update_order_success(
            self, client: AsyncClient, test_order: Order, merchant_headers: dict
        ):
            """测试更新订单成功."""
            response = await client.put(
                f"/api/v1/orders/{test_order.id}",
                headers=merchant_headers,
                json={
                    "customer_name": "更新后的姓名",
                    "note": "更新后的备注"
                }
            )
            assert response.status_code == 200
            data = response.json()
            assert data["customer_name"] == "更新后的姓名"
            assert data["note"] == "更新后的备注"

        async def test_update_completed_order_fails(
            self,
            client: AsyncClient,
            db_session: AsyncSession,
            test_order: Order,
            merchant_headers: dict
        ):
            """测试更新已完成订单失败."""
            # 先将订单状态改为已完成
            test_order.status = OrderStatus.COMPLETED
            await db_session.commit()

            response = await client.put(
                f"/api/v1/orders/{test_order.id}",
                headers=merchant_headers,
                json={"customer_name": "新姓名"}
            )
            assert response.status_code == 400
            assert "已完成" in response.json()["detail"]

    class TestUpdateOrderStatus:
        """更新订单状态测试."""

        async def test_update_status_to_preparing(
            self, client: AsyncClient, test_order: Order, merchant_headers: dict
        ):
            """测试更新状态为制作中."""
            response = await client.patch(
                f"/api/v1/orders/{test_order.id}/status",
                headers=merchant_headers,
                json={"status": "preparing"}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "preparing"

        async def test_update_status_to_ready(
            self,
            client: AsyncClient,
            db_session: AsyncSession,
            test_order: Order,
            merchant_headers: dict
        ):
            """测试更新状态为待取餐."""
            # 先将状态改为制作中
            test_order.status = OrderStatus.PREPARING
            await db_session.commit()

            response = await client.patch(
                f"/api/v1/orders/{test_order.id}/status",
                headers=merchant_headers,
                json={"status": "ready"}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "ready"

        async def test_update_status_to_completed(
            self,
            client: AsyncClient,
            db_session: AsyncSession,
            test_order: Order,
            merchant_headers: dict
        ):
            """测试更新状态为已完成."""
            # 先将状态改为待取餐
            test_order.status = OrderStatus.READY
            await db_session.commit()

            response = await client.patch(
                f"/api/v1/orders/{test_order.id}/status",
                headers=merchant_headers,
                json={"status": "completed"}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "completed"
            assert data["completed_at"] is not None

        async def test_invalid_status_transition(
            self,
            client: AsyncClient,
            db_session: AsyncSession,
            test_order: Order,
            merchant_headers: dict
        ):
            """测试无效状态转换."""
            # 先将状态改为已完成
            test_order.status = OrderStatus.COMPLETED
            await db_session.commit()

            response = await client.patch(
                f"/api/v1/orders/{test_order.id}/status",
                headers=merchant_headers,
                json={"status": "pending"}
            )
            assert response.status_code == 400
            assert "不能从" in response.json()["detail"]

    class TestCallOrder:
        """叫号测试."""

        async def test_call_order_success(
            self,
            client: AsyncClient,
            db_session: AsyncSession,
            test_order: Order,
            merchant_headers: dict
        ):
            """测试叫号成功."""
            # 将订单状态改为制作中
            test_order.status = OrderStatus.PREPARING
            await db_session.commit()

            response = await client.post(
                f"/api/v1/orders/{test_order.id}/call",
                headers=merchant_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert "pickup_code" in data
            assert data["pickup_code"] == test_order.pickup_code
            assert "请取餐码" in data["message"]

        async def test_call_order_not_preparing(
            self,
            client: AsyncClient,
            db_session: AsyncSession,
            test_order: Order,
            merchant_headers: dict
        ):
            """测试非制作中订单不能叫号."""
            test_order.status = OrderStatus.PENDING
            await db_session.commit()

            response = await client.post(
                f"/api/v1/orders/{test_order.id}/call",
                headers=merchant_headers
            )
            assert response.status_code == 400
            assert "制作中" in response.json()["detail"]

    class TestCancelOrder:
        """取消订单测试."""

        async def test_cancel_order_success(
            self, client: AsyncClient, test_order: Order, merchant_headers: dict
        ):
            """测试取消订单成功."""
            response = await client.post(
                f"/api/v1/orders/{test_order.id}/cancel",
                headers=merchant_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "cancelled"

        async def test_cancel_order_restores_stock(
            self,
            client: AsyncClient,
            db_session: AsyncSession,
            test_product: Product,
            test_user: User,
            merchant_headers: dict
        ):
            """测试取消订单恢复库存."""
            from datetime import datetime
            import uuid
            from app.models.order import OrderItem

            # 创建订单并扣减库存
            original_stock = test_product.stock
            order = Order(
                id=str(uuid.uuid4()),
                order_number="202403110002",
                pickup_code="A002",
                status=OrderStatus.PENDING,
                total_amount=test_product.price * 2,
                user_id=test_user.id,
                customer_name="顾客",
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
                quantity=2,
            )
            db_session.add(order_item)
            test_product.stock -= 2
            await db_session.commit()

            assert test_product.stock == original_stock - 2

            # 取消订单
            response = await client.post(
                f"/api/v1/orders/{order.id}/cancel",
                headers=merchant_headers
            )
            assert response.status_code == 200

            # 验证库存已恢复
            await db_session.refresh(test_product)
            assert test_product.stock == original_stock

        async def test_cancel_completed_order_fails(
            self,
            client: AsyncClient,
            db_session: AsyncSession,
            test_order: Order,
            merchant_headers: dict
        ):
            """测试取消已完成订单失败."""
            test_order.status = OrderStatus.COMPLETED
            await db_session.commit()

            response = await client.post(
                f"/api/v1/orders/{test_order.id}/cancel",
                headers=merchant_headers
            )
            assert response.status_code == 400
