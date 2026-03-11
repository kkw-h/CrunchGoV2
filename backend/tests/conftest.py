"""测试配置和共享夹具."""

import uuid
from datetime import datetime, time

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.security import get_password_hash, create_access_token
from app.main import app
from app.models.base import Base, get_db, AsyncSessionLocal
from app.models.category import Category
from app.models.merchant import Merchant
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.product_option import ProductOption, ProductOptionValue
from app.models.user import User

# 使用文件数据库以便多个连接共享
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

# 全局引擎
_engine = None


def get_engine():
    """获取或创建引擎."""
    global _engine
    if _engine is None:
        _engine = create_async_engine(
            TEST_DATABASE_URL,
            poolclass=NullPool,
            echo=False,
        )
    return _engine


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    """设置测试数据库."""
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session():
    """创建测试数据库会话."""
    engine = get_engine()
    async_session = sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

    async with async_session() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session):
    """创建测试HTTP客户端."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_merchant(db_session):
    """创建测试商家."""
    merchant = Merchant(
        id=str(uuid.uuid4()),
        username="test_merchant",
        hashed_password=get_password_hash("test_password"),
        name="测试商家",
        address="测试地址",
        phone="13800138000",
        business_hours_open=time(9, 0),
        business_hours_close=time(22, 0),
        pickup_code_prefix="A",
        pickup_code_daily_reset=True,
        auto_print_order=False,
        wechat_app_id="test_app_id",
        wechat_app_secret="test_app_secret",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db_session.add(merchant)
    await db_session.commit()
    await db_session.refresh(merchant)
    return merchant


@pytest_asyncio.fixture
async def test_user(db_session):
    """创建测试用户."""
    user = User(
        id=str(uuid.uuid4()),
        openid=f"test_openid_{uuid.uuid4().hex[:8]}",
        unionid=None,
        nickname="测试用户",
        avatar_url="https://example.com/avatar.jpg",
        phone="13900139000",
        is_active=True,
        login_count=1,
        last_login_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_category(db_session):
    """创建测试分类."""
    category = Category(
        id=str(uuid.uuid4()),
        name="测试分类",
        sort_order=0,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)
    return category


@pytest_asyncio.fixture
async def test_product(db_session, test_category):
    """创建测试商品."""
    product = Product(
        id=str(uuid.uuid4()),
        name="测试商品",
        description="这是一个测试商品",
        price=1000,
        stock=100,
        image_url="https://example.com/product.jpg",
        is_available=True,
        sort_order=0,
        category_id=test_category.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db_session.add(product)
    await db_session.commit()
    await db_session.refresh(product)
    return product


@pytest_asyncio.fixture
async def test_product_with_options(db_session, test_category):
    """创建带选项的测试商品."""
    product = Product(
        id=str(uuid.uuid4()),
        name="测试商品(带选项)",
        description="这是一个带选项的测试商品",
        price=2000,
        stock=50,
        image_url="https://example.com/product2.jpg",
        is_available=True,
        sort_order=0,
        category_id=test_category.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db_session.add(product)
    await db_session.flush()

    option = ProductOption(
        id=str(uuid.uuid4()),
        product_id=product.id,
        name="辣度",
        is_required=True,
        is_multiple=False,
        sort_order=0,
        created_at=datetime.utcnow(),
    )
    db_session.add(option)
    await db_session.flush()

    values = [
        ProductOptionValue(
            id=str(uuid.uuid4()),
            option_id=option.id,
            value="微辣",
            extra_price=0,
            sort_order=0,
            created_at=datetime.utcnow(),
        ),
        ProductOptionValue(
            id=str(uuid.uuid4()),
            option_id=option.id,
            value="中辣",
            extra_price=100,
            sort_order=1,
            created_at=datetime.utcnow(),
        ),
        ProductOptionValue(
            id=str(uuid.uuid4()),
            option_id=option.id,
            value="特辣",
            extra_price=200,
            sort_order=2,
            created_at=datetime.utcnow(),
        ),
    ]
    for v in values:
        db_session.add(v)

    await db_session.commit()
    await db_session.refresh(product)
    return product


@pytest_asyncio.fixture
async def test_order(db_session, test_user, test_product):
    """创建测试订单."""
    order = Order(
        id=str(uuid.uuid4()),
        order_number="202403110001",
        pickup_code="A001",
        status=OrderStatus.PENDING,
        total_amount=1000,
        user_id=test_user.id,
        customer_name="测试顾客",
        customer_phone="13700137000",
        customer_openid=test_user.openid,
        note="测试订单备注",
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
    await db_session.refresh(order)
    return order


@pytest.fixture
def merchant_token(test_merchant):
    """获取商家认证令牌."""
    return create_access_token(test_merchant.id)


@pytest.fixture
def user_token(test_user):
    """获取用户认证令牌."""
    return create_access_token(test_user.id)


@pytest.fixture
def merchant_headers(merchant_token):
    """获取商家认证头."""
    return {"Authorization": f"Bearer {merchant_token}"}


@pytest.fixture
def user_headers(user_token):
    """获取用户认证头."""
    return {"Authorization": f"Bearer {user_token}"}
