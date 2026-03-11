# 后端接口测试

## 测试结构

```
tests/
├── conftest.py          # 测试配置和共享夹具
├── test_auth.py         # 认证接口测试
├── test_categories.py   # 分类接口测试
├── test_products.py     # 商品接口测试
├── test_orders.py       # 订单接口测试
├── test_merchant.py     # 商家接口测试
└── test_integration.py  # 集成测试
```

## 运行测试

### 运行所有测试
```bash
uv run pytest tests/
```

### 运行特定测试文件
```bash
uv run pytest tests/test_auth.py -v
```

### 运行特定测试类
```bash
uv run pytest tests/test_auth.py::TestAuthEndpoints -v
```

### 运行特定测试方法
```bash
uv run pytest tests/test_auth.py::TestAuthEndpoints::TestMerchantLogin::test_login_success -v
```

### 使用脚本运行测试
```bash
python scripts/run_tests.py
```

## 测试覆盖范围

### 认证接口 (test_auth.py)
- 微信小程序登录
- 商家登录
- 令牌刷新
- 获取当前用户信息

### 分类接口 (test_categories.py)
- 获取分类列表
- 创建分类
- 获取分类详情
- 更新分类
- 删除分类

### 商品接口 (test_products.py)
- 获取商品列表
- 创建商品
- 获取商品详情
- 更新商品
- 删除商品
- 切换商品状态
- 更新库存
- 商品选项管理
- 选项值管理

### 订单接口 (test_orders.py)
- 获取订单列表
- 获取排队队列
- 创建订单
- 获取订单详情
- 更新订单
- 更新订单状态
- 叫号
- 取消订单

### 商家接口 (test_merchant.py)
- 获取商家信息
- 更新商家信息
- 获取商家设置
- 更新商家设置
- 获取微信小程序配置
- 更新微信小程序配置

### 集成测试 (test_integration.py)
- 完整订单流程
- 订单取消流程
- 权限验证
- 错误场景

## 测试夹具

### 数据库夹具
- `db_session`: 数据库会话
- `client`: HTTP 客户端

### 数据夹具
- `test_merchant`: 测试商家
- `test_user`: 测试用户
- `test_category`: 测试分类
- `test_product`: 测试商品
- `test_product_with_options`: 带选项的测试商品
- `test_order`: 测试订单

### 认证夹具
- `merchant_token`: 商家令牌
- `user_token`: 用户令牌
- `merchant_headers`: 商家请求头
- `user_headers`: 用户请求头

## 注意事项

1. 测试使用 SQLite 内存数据库
2. 每个测试函数运行前会清理数据库
3. 认证测试使用 JWT 令牌
4. WebSocket 功能在测试中会被模拟

## 添加新测试

创建测试文件时，遵循以下模式：

```python
"""模块测试."""

import pytest
from httpx import AsyncClient

class TestEndpointName:
    """端点测试类."""

    class TestSubFeature:
        """子功能测试."""

        async def test_case_name(self, client: AsyncClient, ...):
            """测试用例描述."""
            response = await client.get("/api/v1/...")
            assert response.status_code == 200
```
