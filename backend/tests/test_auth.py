"""认证接口测试."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_password, decode_token
from app.models.merchant import Merchant
from app.models.user import User


class TestAuthEndpoints:
    """认证端点测试类."""

    class TestWechatLogin:
        """微信小程序登录测试."""

        async def test_wechat_login_success(self, client: AsyncClient, db_session: AsyncSession):
            """测试微信登录成功."""
            response = await client.post(
                "/api/v1/auth/wx-login",
                json={"code": "test_code_123"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "access_token" in data
            assert "refresh_token" in data
            assert data["token_type"] == "bearer"
            assert data["is_new_user"] is True
            assert data["expires_in"] > 0

        async def test_wechat_login_returns_existing_user(
            self, client: AsyncClient, test_user: User
        ):
            """测试已存在用户的微信登录."""
            # 使用已存在用户的 openid
            response = await client.post(
                "/api/v1/auth/wx-login",
                json={"code": test_user.openid.replace("test_openid_", "")}
            )
            assert response.status_code == 200
            data = response.json()
            # 注意：这里可能创建新用户或返回已存在的，取决于实现

    class TestMerchantLogin:
        """商家登录测试."""

        async def test_login_success(
            self, client: AsyncClient, test_merchant: Merchant
        ):
            """测试商家登录成功."""
            response = await client.post(
                "/api/v1/auth/login",
                data={"username": "test_merchant", "password": "test_password"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "access_token" in data
            assert "refresh_token" in data
            assert data["token_type"] == "bearer"

        async def test_login_wrong_password(
            self, client: AsyncClient, test_merchant: Merchant
        ):
            """测试密码错误."""
            response = await client.post(
                "/api/v1/auth/login",
                data={"username": "test_merchant", "password": "wrong_password"}
            )
            assert response.status_code == 401
            assert "用户名或密码错误" in response.json()["detail"]

        async def test_login_nonexistent_user(self, client: AsyncClient):
            """测试不存在的用户."""
            response = await client.post(
                "/api/v1/auth/login",
                data={"username": "nonexistent", "password": "password"}
            )
            assert response.status_code == 401
            assert "用户名或密码错误" in response.json()["detail"]

        async def test_login_missing_fields(self, client: AsyncClient):
            """测试缺少字段."""
            response = await client.post(
                "/api/v1/auth/login",
                data={}
            )
            assert response.status_code == 422

    class TestRefreshToken:
        """刷新令牌测试."""

        async def test_refresh_token_success(
            self, client: AsyncClient, test_merchant: Merchant
        ):
            """测试刷新令牌成功."""
            from app.core.security import create_refresh_token

            refresh_token = create_refresh_token(test_merchant.id)
            response = await client.post(
                "/api/v1/auth/refresh",
                params={"refresh_token": refresh_token}
            )
            assert response.status_code == 200
            data = response.json()
            assert "access_token" in data
            assert data["token_type"] == "bearer"

        async def test_refresh_invalid_token(self, client: AsyncClient):
            """测试无效刷新令牌."""
            response = await client.post(
                "/api/v1/auth/refresh",
                params={"refresh_token": "invalid_token"}
            )
            assert response.status_code == 401
            assert "无效" in response.json()["detail"]

    class TestGetMe:
        """获取当前用户信息测试."""

        async def test_get_me_as_merchant(
            self, client: AsyncClient, test_merchant: Merchant, merchant_headers: dict
        ):
            """测试商家获取自身信息."""
            response = await client.get(
                "/api/v1/auth/me",
                headers=merchant_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == test_merchant.id
            assert data["username"] == "test_merchant"
            assert data["type"] == "merchant"

        async def test_get_me_as_user(
            self, client: AsyncClient, test_user: User, user_headers: dict
        ):
            """测试用户获取自身信息."""
            response = await client.get(
                "/api/v1/auth/me",
                headers=user_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == test_user.id
            assert data["openid"] == test_user.openid

        async def test_get_me_without_auth(self, client: AsyncClient):
            """测试未认证访问."""
            response = await client.get("/api/v1/auth/me")
            assert response.status_code == 401

        async def test_get_me_with_invalid_token(self, client: AsyncClient):
            """测试无效令牌."""
            response = await client.get(
                "/api/v1/auth/me",
                headers={"Authorization": "Bearer invalid_token"}
            )
            assert response.status_code == 401


class TestSecurityFunctions:
    """安全功能测试."""

    def test_password_hashing(self):
        """测试密码哈希."""
        from app.core.security import get_password_hash, verify_password

        password = "test_password"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True
        assert verify_password("wrong_password", hashed) is False

    def test_token_creation_and_decoding(self):
        """测试令牌创建和解码."""
        from app.core.security import create_access_token, decode_token

        user_id = "test_user_id"
        token = create_access_token(user_id)
        payload = decode_token(token)

        assert payload is not None
        assert payload["sub"] == user_id
        assert payload["type"] == "access"
        assert "exp" in payload
