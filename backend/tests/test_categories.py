"""分类接口测试."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category


class TestCategoryEndpoints:
    """分类端点测试类."""

    class TestListCategories:
        """获取分类列表测试."""

        async def test_list_categories_success(
            self, client: AsyncClient, test_category: Category, merchant_headers: dict
        ):
            """测试获取分类列表成功."""
            response = await client.get(
                "/api/v1/categories",
                headers=merchant_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert "items" in data
            assert "total" in data
            assert data["total"] >= 1
            assert any(item["id"] == test_category.id for item in data["items"])

        async def test_list_categories_without_auth(self, client: AsyncClient):
            """测试未认证访问."""
            response = await client.get("/api/v1/categories")
            assert response.status_code == 401

        async def test_list_categories_returns_product_count(
            self, client: AsyncClient, test_category: Category, merchant_headers: dict
        ):
            """测试返回商品数量."""
            response = await client.get(
                "/api/v1/categories",
                headers=merchant_headers
            )
            assert response.status_code == 200
            data = response.json()
            category_data = next(
                (item for item in data["items"] if item["id"] == test_category.id),
                None
            )
            assert category_data is not None
            assert "product_count" in category_data

    class TestCreateCategory:
        """创建分类测试."""

        async def test_create_category_success(
            self, client: AsyncClient, merchant_headers: dict
        ):
            """测试创建分类成功."""
            response = await client.post(
                "/api/v1/categories",
                headers=merchant_headers,
                json={"name": "新分类", "sort_order": 1}
            )
            assert response.status_code == 201
            data = response.json()
            assert data["name"] == "新分类"
            assert data["sort_order"] == 1
            assert "id" in data

        async def test_create_category_without_auth(self, client: AsyncClient):
            """测试未认证创建."""
            response = await client.post(
                "/api/v1/categories",
                json={"name": "新分类"}
            )
            assert response.status_code == 401

        async def test_create_category_missing_name(
            self, client: AsyncClient, merchant_headers: dict
        ):
            """测试缺少名称."""
            response = await client.post(
                "/api/v1/categories",
                headers=merchant_headers,
                json={"sort_order": 1}
            )
            assert response.status_code == 422

    class TestGetCategory:
        """获取分类详情测试."""

        async def test_get_category_success(
            self, client: AsyncClient, test_category: Category, merchant_headers: dict
        ):
            """测试获取分类详情成功."""
            response = await client.get(
                f"/api/v1/categories/{test_category.id}",
                headers=merchant_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == test_category.id
            assert data["name"] == test_category.name

        async def test_get_category_not_found(
            self, client: AsyncClient, merchant_headers: dict
        ):
            """测试获取不存在的分类."""
            response = await client.get(
                "/api/v1/categories/nonexistent-id",
                headers=merchant_headers
            )
            assert response.status_code == 404
            assert "不存在" in response.json()["detail"]

    class TestUpdateCategory:
        """更新分类测试."""

        async def test_update_category_success(
            self, client: AsyncClient, test_category: Category, merchant_headers: dict
        ):
            """测试更新分类成功."""
            response = await client.put(
                f"/api/v1/categories/{test_category.id}",
                headers=merchant_headers,
                json={"name": "更新后的分类名", "sort_order": 5}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "更新后的分类名"
            assert data["sort_order"] == 5
            assert data["id"] == test_category.id

        async def test_update_category_partial(
            self, client: AsyncClient, test_category: Category, merchant_headers: dict
        ):
            """测试部分更新."""
            response = await client.put(
                f"/api/v1/categories/{test_category.id}",
                headers=merchant_headers,
                json={"name": "仅更新名称"}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "仅更新名称"

        async def test_update_category_not_found(
            self, client: AsyncClient, merchant_headers: dict
        ):
            """测试更新不存在的分类."""
            response = await client.put(
                "/api/v1/categories/nonexistent-id",
                headers=merchant_headers,
                json={"name": "新名称"}
            )
            assert response.status_code == 404

    class TestDeleteCategory:
        """删除分类测试."""

        async def test_delete_category_success(
            self, client: AsyncClient, db_session: AsyncSession, merchant_headers: dict
        ):
            """测试删除分类成功."""
            # 先创建一个分类
            from datetime import datetime
            import uuid

            category = Category(
                id=str(uuid.uuid4()),
                name="待删除分类",
                sort_order=0,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db_session.add(category)
            await db_session.commit()

            response = await client.delete(
                f"/api/v1/categories/{category.id}",
                headers=merchant_headers
            )
            assert response.status_code == 204

        async def test_delete_category_with_products(
            self, client: AsyncClient, test_category: Category, test_product, merchant_headers: dict
        ):
            """测试删除有商品的分类."""
            response = await client.delete(
                f"/api/v1/categories/{test_category.id}",
                headers=merchant_headers
            )
            assert response.status_code == 400
            assert "存在商品" in response.json()["detail"]

        async def test_delete_category_not_found(
            self, client: AsyncClient, merchant_headers: dict
        ):
            """测试删除不存在的分类."""
            response = await client.delete(
                "/api/v1/categories/nonexistent-id",
                headers=merchant_headers
            )
            assert response.status_code == 404
