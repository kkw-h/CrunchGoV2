"""商品接口测试."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.models.product import Product


class TestProductEndpoints:
    """商品端点测试类."""

    class TestListProducts:
        """获取商品列表测试."""

        async def test_list_products_success(
            self, client: AsyncClient, test_product: Product, merchant_headers: dict
        ):
            """测试获取商品列表成功."""
            response = await client.get(
                "/api/v1/products",
                headers=merchant_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert "items" in data
            assert "total" in data
            assert data["total"] >= 1

        async def test_list_products_with_category_filter(
            self, client: AsyncClient, test_product: Product, merchant_headers: dict
        ):
            """测试按分类筛选."""
            response = await client.get(
                "/api/v1/products",
                headers=merchant_headers,
                params={"category_id": test_product.category_id}
            )
            assert response.status_code == 200
            data = response.json()
            assert all(
                item["category_id"] == test_product.category_id
                for item in data["items"]
            )

        async def test_list_products_with_availability_filter(
            self, client: AsyncClient, test_product: Product, merchant_headers: dict
        ):
            """测试按上架状态筛选."""
            response = await client.get(
                "/api/v1/products",
                headers=merchant_headers,
                params={"is_available": "true"}
            )
            assert response.status_code == 200
            data = response.json()
            assert all(item["is_available"] for item in data["items"])

        async def test_list_products_with_keyword_search(
            self, client: AsyncClient, test_product: Product, merchant_headers: dict
        ):
            """测试关键词搜索."""
            response = await client.get(
                "/api/v1/products",
                headers=merchant_headers,
                params={"keyword": "测试"}
            )
            assert response.status_code == 200
            data = response.json()
            assert len(data["items"]) > 0

        async def test_list_products_pagination(
            self, client: AsyncClient, merchant_headers: dict
        ):
            """测试分页."""
            response = await client.get(
                "/api/v1/products",
                headers=merchant_headers,
                params={"skip": 0, "limit": 5}
            )
            assert response.status_code == 200
            data = response.json()
            assert len(data["items"]) <= 5

    class TestCreateProduct:
        """创建商品测试."""

        async def test_create_product_success(
            self, client: AsyncClient, test_category: Category, merchant_headers: dict
        ):
            """测试创建商品成功."""
            response = await client.post(
                "/api/v1/products",
                headers=merchant_headers,
                json={
                    "name": "新商品",
                    "description": "商品描述",
                    "price": 1500,
                    "stock": 50,
                    "is_available": True,
                    "sort_order": 0,
                    "category_id": test_category.id
                }
            )
            assert response.status_code == 201
            data = response.json()
            assert data["name"] == "新商品"
            assert data["price"] == 1500
            assert data["category_id"] == test_category.id

        async def test_create_product_with_invalid_category(
            self, client: AsyncClient, merchant_headers: dict
        ):
            """测试使用无效分类创建商品."""
            response = await client.post(
                "/api/v1/products",
                headers=merchant_headers,
                json={
                    "name": "新商品",
                    "price": 1000,
                    "stock": 10,
                    "category_id": "invalid-category-id"
                }
            )
            assert response.status_code == 400
            assert "分类不存在" in response.json()["detail"]

        async def test_create_product_missing_required_fields(
            self, client: AsyncClient, merchant_headers: dict
        ):
            """测试缺少必填字段."""
            response = await client.post(
                "/api/v1/products",
                headers=merchant_headers,
                json={}
            )
            assert response.status_code == 422

    class TestGetProduct:
        """获取商品详情测试."""

        async def test_get_product_success(
            self, client: AsyncClient, test_product: Product, merchant_headers: dict
        ):
            """测试获取商品详情成功."""
            response = await client.get(
                f"/api/v1/products/{test_product.id}",
                headers=merchant_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == test_product.id
            assert data["name"] == test_product.name
            assert "options" in data
            assert "category" in data

        async def test_get_product_not_found(
            self, client: AsyncClient, merchant_headers: dict
        ):
            """测试获取不存在的商品."""
            response = await client.get(
                "/api/v1/products/nonexistent-id",
                headers=merchant_headers
            )
            assert response.status_code == 404

    class TestUpdateProduct:
        """更新商品测试."""

        async def test_update_product_success(
            self, client: AsyncClient, test_product: Product, merchant_headers: dict
        ):
            """测试更新商品成功."""
            response = await client.put(
                f"/api/v1/products/{test_product.id}",
                headers=merchant_headers,
                json={
                    "name": "更新后的商品名",
                    "price": 2000,
                    "stock": 80
                }
            )
            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "更新后的商品名"
            assert data["price"] == 2000
            assert data["stock"] == 80

        async def test_update_product_not_found(
            self, client: AsyncClient, merchant_headers: dict
        ):
            """测试更新不存在的商品."""
            response = await client.put(
                "/api/v1/products/nonexistent-id",
                headers=merchant_headers,
                json={"name": "新名称"}
            )
            assert response.status_code == 404

    class TestDeleteProduct:
        """删除商品测试."""

        async def test_delete_product_success(
            self, client: AsyncClient, db_session: AsyncSession,
            test_category: Category, merchant_headers: dict
        ):
            """测试删除商品成功."""
            from datetime import datetime
            import uuid

            # 创建一个新商品用于删除
            product = Product(
                id=str(uuid.uuid4()),
                name="待删除商品",
                description="将被删除",
                price=1000,
                stock=10,
                is_available=True,
                category_id=test_category.id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db_session.add(product)
            await db_session.commit()

            response = await client.delete(
                f"/api/v1/products/{product.id}",
                headers=merchant_headers
            )
            assert response.status_code == 204

        async def test_delete_product_not_found(
            self, client: AsyncClient, merchant_headers: dict
        ):
            """测试删除不存在的商品."""
            response = await client.delete(
                "/api/v1/products/nonexistent-id",
                headers=merchant_headers
            )
            assert response.status_code == 404

    class TestToggleProductStatus:
        """切换商品状态测试."""

        async def test_toggle_product_status(
            self, client: AsyncClient, test_product: Product, merchant_headers: dict
        ):
            """测试切换商品上下架状态."""
            original_status = test_product.is_available

            response = await client.patch(
                f"/api/v1/products/{test_product.id}/toggle-status",
                headers=merchant_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data["is_available"] == (not original_status)

    class TestUpdateStock:
        """更新库存测试."""

        async def test_update_stock_success(
            self, client: AsyncClient, test_product: Product, merchant_headers: dict
        ):
            """测试更新库存成功."""
            response = await client.patch(
                f"/api/v1/products/{test_product.id}/stock",
                headers=merchant_headers,
                params={"stock": 200}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["stock"] == 200

        async def test_update_stock_negative(
            self, client: AsyncClient, test_product: Product, merchant_headers: dict
        ):
            """测试更新库存为负数（应失败）."""
            response = await client.patch(
                f"/api/v1/products/{test_product.id}/stock",
                headers=merchant_headers,
                params={"stock": -1}
            )
            assert response.status_code == 422


class TestProductOptionEndpoints:
    """商品选项端点测试."""

    class TestCreateOption:
        """创建选项测试."""

        async def test_create_option_success(
            self, client: AsyncClient, test_product: Product, merchant_headers: dict
        ):
            """测试创建选项成功."""
            response = await client.post(
                f"/api/v1/products/{test_product.id}/options",
                headers=merchant_headers,
                json={
                    "name": "尺寸",
                    "is_required": True,
                    "is_multiple": False,
                    "sort_order": 0,
                    "values": [
                        {"value": "小份", "extra_price": 0, "sort_order": 0},
                        {"value": "大份", "extra_price": 500, "sort_order": 1}
                    ]
                }
            )
            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "尺寸"
            assert data["is_required"] is True
            assert len(data["values"]) == 2

        async def test_create_option_product_not_found(
            self, client: AsyncClient, merchant_headers: dict
        ):
            """测试为不存在的商品创建选项."""
            response = await client.post(
                "/api/v1/products/nonexistent-id/options",
                headers=merchant_headers,
                json={"name": "尺寸", "values": []}
            )
            assert response.status_code == 404

    class TestUpdateOption:
        """更新选项测试."""

        async def test_update_option_success(
            self, client: AsyncClient, test_product_with_options: Product, merchant_headers: dict
        ):
            """测试更新选项成功."""
            option = test_product_with_options.options[0]

            response = await client.put(
                f"/api/v1/products/{test_product_with_options.id}/options/{option.id}",
                headers=merchant_headers,
                json={"name": "更新后的辣度", "is_required": False}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "更新后的辣度"
            assert data["is_required"] is False

    class TestDeleteOption:
        """删除选项测试."""

        async def test_delete_option_success(
            self, client: AsyncClient, test_product_with_options: Product, merchant_headers: dict
        ):
            """测试删除选项成功."""
            option = test_product_with_options.options[0]

            response = await client.delete(
                f"/api/v1/products/{test_product_with_options.id}/options/{option.id}",
                headers=merchant_headers
            )
            assert response.status_code == 204

    class TestOptionValueEndpoints:
        """选项值端点测试."""

        async def test_create_option_value(
            self, client: AsyncClient, test_product_with_options: Product, merchant_headers: dict
        ):
            """测试创建选项值."""
            option = test_product_with_options.options[0]

            response = await client.post(
                f"/api/v1/products/{test_product_with_options.id}/options/{option.id}/values",
                headers=merchant_headers,
                json={"value": "超辣", "extra_price": 300, "sort_order": 3}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["value"] == "超辣"
            assert data["extra_price"] == 300

        async def test_update_option_value(
            self, client: AsyncClient, test_product_with_options: Product, merchant_headers: dict
        ):
            """测试更新选项值."""
            option = test_product_with_options.options[0]
            value = option.values[0]

            response = await client.put(
                f"/api/v1/products/{test_product_with_options.id}/options/{option.id}/values/{value.id}",
                headers=merchant_headers,
                json={"value": "微微辣", "extra_price": 50, "sort_order": 0}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["value"] == "微微辣"
            assert data["extra_price"] == 50

        async def test_delete_option_value(
            self, client: AsyncClient, test_product_with_options: Product, merchant_headers: dict
        ):
            """测试删除选项值."""
            option = test_product_with_options.options[0]
            value = option.values[0]

            response = await client.delete(
                f"/api/v1/products/{test_product_with_options.id}/options/{option.id}/values/{value.id}",
                headers=merchant_headers
            )
            assert response.status_code == 204
