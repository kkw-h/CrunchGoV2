"""商家接口测试."""

import pytest
from httpx import AsyncClient

from app.models.merchant import Merchant


class TestMerchantEndpoints:
    """商家端点测试类."""

    class TestGetProfile:
        """获取商家信息测试."""

        async def test_get_profile_success(
            self, client: AsyncClient, test_merchant: Merchant, merchant_headers: dict
        ):
            """测试获取商家信息成功."""
            response = await client.get(
                "/api/v1/merchant/profile",
                headers=merchant_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == test_merchant.id
            assert data["name"] == test_merchant.name
            assert data["address"] == test_merchant.address
            assert data["phone"] == test_merchant.phone
            assert "business_hours" in data
            assert "open" in data["business_hours"]
            assert "close" in data["business_hours"]

        async def test_get_profile_without_auth(self, client: AsyncClient):
            """测试未认证访问."""
            response = await client.get("/api/v1/merchant/profile")
            assert response.status_code == 401

    class TestUpdateProfile:
        """更新商家信息测试."""

        async def test_update_profile_success(
            self, client: AsyncClient, test_merchant: Merchant, merchant_headers: dict
        ):
            """测试更新商家信息成功."""
            response = await client.put(
                "/api/v1/merchant/profile",
                headers=merchant_headers,
                json={
                    "name": "新商家名称",
                    "address": "新地址",
                    "phone": "13900139000",
                    "business_hours": {
                        "open": "08:00",
                        "close": "23:00"
                    }
                }
            )
            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "新商家名称"
            assert data["address"] == "新地址"
            assert data["phone"] == "13900139000"
            assert data["business_hours"]["open"] == "08:00"
            assert data["business_hours"]["close"] == "23:00"

        async def test_update_profile_partial(
            self, client: AsyncClient, test_merchant: Merchant, merchant_headers: dict
        ):
            """测试部分更新商家信息."""
            response = await client.put(
                "/api/v1/merchant/profile",
                headers=merchant_headers,
                json={"name": "仅更新名称"}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "仅更新名称"
            # 其他字段应保持不变
            assert data["address"] == test_merchant.address

    class TestGetSettings:
        """获取商家设置测试."""

        async def test_get_settings_success(
            self, client: AsyncClient, test_merchant: Merchant, merchant_headers: dict
        ):
            """测试获取商家设置成功."""
            response = await client.get(
                "/api/v1/merchant/settings",
                headers=merchant_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert "pickup_code" in data
            assert "prefix" in data["pickup_code"]
            assert "daily_reset" in data["pickup_code"]
            assert "auto_print_order" in data

    class TestUpdateSettings:
        """更新商家设置测试."""

        async def test_update_settings_success(
            self, client: AsyncClient, test_merchant: Merchant, merchant_headers: dict
        ):
            """测试更新商家设置成功."""
            response = await client.put(
                "/api/v1/merchant/settings",
                headers=merchant_headers,
                json={
                    "pickup_code": {
                        "prefix": "B",
                        "daily_reset": False
                    },
                    "auto_print_order": True
                }
            )
            assert response.status_code == 200
            data = response.json()
            assert data["pickup_code"]["prefix"] == "B"
            assert data["pickup_code"]["daily_reset"] is False
            assert data["auto_print_order"] is True

    class TestGetWechatConfig:
        """获取微信小程序配置测试."""

        async def test_get_wechat_config_success(
            self, client: AsyncClient, test_merchant: Merchant, merchant_headers: dict
        ):
            """测试获取微信小程序配置成功."""
            response = await client.get(
                "/api/v1/merchant/wechat",
                headers=merchant_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert "app_id" in data

    class TestUpdateWechatConfig:
        """更新微信小程序配置测试."""

        async def test_update_wechat_config_success(
            self, client: AsyncClient, test_merchant: Merchant, merchant_headers: dict
        ):
            """测试更新微信小程序配置成功."""
            response = await client.put(
                "/api/v1/merchant/wechat",
                headers=merchant_headers,
                json={
                    "app_id": "new_app_id",
                    "app_secret": "new_app_secret"
                }
            )
            assert response.status_code == 200
            data = response.json()
            assert data["app_id"] == "new_app_id"
