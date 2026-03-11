"""FastAPI 应用入口."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.api.v1.ws import router as ws_router
from app.config import settings
from app.models.base import init_db

# 导入所有模型以确保 SQLAlchemy 正确注册关系映射
# noqa: F401 - 导入是为了注册模型，不是直接使用
from app.models import category, merchant, order, order_item_option, product, product_option, user


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理."""
    # 启动时初始化数据库
    await init_db()
    yield
    # 关闭时的清理工作


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="餐饮点单商家管理后台 API",
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_hosts_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
app.include_router(ws_router)


@app.get("/health")
async def health_check():
    """健康检查端点."""
    return {"status": "ok", "version": settings.VERSION}
