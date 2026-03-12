"""API v1 路由聚合."""

from fastapi import APIRouter

from app.api.v1 import auth, categories, merchant, orders, products, upload

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["认证"])
api_router.include_router(products.router, prefix="/products", tags=["商品"])
api_router.include_router(categories.router, prefix="/categories", tags=["分类"])
api_router.include_router(orders.router, prefix="/orders", tags=["订单"])
api_router.include_router(merchant.router, prefix="/merchant", tags=["商家"])
api_router.include_router(upload.router, prefix="/upload", tags=["上传"])
