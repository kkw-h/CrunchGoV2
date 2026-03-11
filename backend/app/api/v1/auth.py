"""认证路由."""

from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import CurrentUser
from app.config import settings
from app.core.security import create_access_token, create_refresh_token, verify_password

router = APIRouter()

# 临时硬编码的商家账号
# TODO: 改为从数据库查询
FAKE_MERCHANT = {
    "id": "1",
    "username": "admin",
    "hashed_password": "$2b$12$ZHUth3FMSUMM3mmFVmyHkeNPg5SETKaxFUFe3RSTF9Jk1bLIlrl8G",  # admin123
}


@router.post("/login")
async def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    """商家登录."""
    # 验证用户名
    if form_data.username != FAKE_MERCHANT["username"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 验证密码
    if not verify_password(form_data.password, FAKE_MERCHANT["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 创建令牌
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=FAKE_MERCHANT["id"], expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(subject=FAKE_MERCHANT["id"])

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.post("/refresh")
async def refresh_token(refresh_token: str):
    """刷新访问令牌."""
    from app.core.security import decode_token

    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的刷新令牌",
        )

    user_id = payload.get("sub")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    new_access_token = create_access_token(subject=user_id, expires_delta=access_token_expires)

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.get("/me")
async def get_me(current_user: CurrentUser):
    """获取当前登录商家信息."""
    return current_user
