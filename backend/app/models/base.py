"""数据库基础配置."""

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    """声明式基类."""

    pass


# 创建异步引擎
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.PROJECT_NAME == "CrunchGo",  # 开发环境打印 SQL
    future=True,
)

# 创建异步会话工厂
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """获取数据库会话."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """初始化数据库 (创建所有表)."""
    import logging

    logger = logging.getLogger(__name__)

    # 导入所有模型以确保它们被注册到 Base.metadata
    # noqa: F401 - 导入是为了注册模型，不是直接使用
    from app.models.category import Category  # noqa: F401
    from app.models.merchant import Merchant  # noqa: F401
    from app.models.order import Order, OrderItem  # noqa: F401
    from app.models.order_item_option import OrderItemOption  # noqa: F401
    from app.models.product import Product  # noqa: F401
    from app.models.product_option import ProductOption, ProductOptionValue  # noqa: F401
    from app.models.user import User  # noqa: F401

    try:
        async with engine.begin() as conn:
            # 开发环境可以使用，生产环境建议使用 Alembic
            # await conn.run_sync(Base.metadata.create_all)
            pass
        logger.info("数据库连接成功")
    except Exception as e:
        logger.warning(f"数据库连接失败: {e}")
        logger.warning("请确保 PostgreSQL 已启动: docker-compose up -d")
