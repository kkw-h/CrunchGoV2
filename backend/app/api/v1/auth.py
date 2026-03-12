"""认证路由."""

import uuid
from datetime import datetime, timedelta
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, DBSession
from app.config import settings
from app.core.security import create_access_token, create_refresh_token, verify_password
from app.models.merchant import Merchant
from app.models.user import User
from app.schemas.auth import (
    UserInfoResponse,
    UserProfileUpdate,
    WechatLoginRequest,
    WechatLoginResponse,
)

router = APIRouter()


async def get_wechat_session(code: str) -> dict:
    """通过微信 code 获取 session 信息 (openid, session_key).

    Args:
        code: 小程序登录临时 code

    Returns:
        包含 openid 和 session_key 的字典

    Raises:
        HTTPException: 微信接口调用失败
    """
    # 获取微信小程序配置
    # TODO: 从商家配置中获取，或环境变量
    app_id = settings.WECHAT_MINIAPP_ID or ""
    app_secret = settings.WECHAT_MINIAPP_SECRET or ""

    if not app_id or not app_secret:
        # 开发环境返回模拟数据
        # 使用固定 openid 避免每次创建新用户，如需测试多用户可临时修改此处
        return {
            "openid": "mock_openid_development_user",
            "session_key": "mock_session_key",
        }

    url = "https://api.weixin.qq.com/sns/jscode2session"
    params = {
        "appid": app_id,
        "secret": app_secret,
        "js_code": code,
        "grant_type": "authorization_code",
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        data = response.json()

    if "errcode" in data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"微信登录失败: {data.get('errmsg', '未知错误')}",
        )

    return data


@router.post("/wx-login", response_model=WechatLoginResponse)
async def wechat_login(
    data: WechatLoginRequest,
    db: DBSession,
):
    """微信小程序静默登录.

    1. 通过 code 换取 openid
    2. 查询或创建用户
    3. 返回 JWT token
    """
    # 获取微信 session
    session_data = await get_wechat_session(data.code)
    openid = session_data.get("openid")

    if not openid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="获取 openid 失败",
        )

    # 查询用户
    result = await db.execute(select(User).where(User.openid == openid))
    user = result.scalar_one_or_none()
    is_new_user = False

    if user is None:
        # 创建新用户
        user = User(
            id=str(uuid.uuid4()),
            openid=openid,
            unionid=session_data.get("unionid"),
            is_active=True,
            login_count=1,
            last_login_at=datetime.utcnow(),
        )
        db.add(user)
        is_new_user = True
    else:
        # 更新登录信息
        user.login_count += 1
        user.last_login_at = datetime.utcnow()

    await db.commit()

    # 创建 JWT token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.id, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(subject=user.id)

    return WechatLoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        is_new_user=is_new_user,
    )


@router.post("/login")
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: DBSession,
):
    """商家登录 (后台管理)."""
    # 查询商家
    result = await db.execute(
        select(Merchant).where(Merchant.username == form_data.username)
    )
    merchant = result.scalar_one_or_none()

    if merchant is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 验证密码
    if not verify_password(form_data.password, merchant.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 创建令牌
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=merchant.id, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(subject=merchant.id)

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
    new_access_token = create_access_token(
        subject=user_id, expires_delta=access_token_expires
    )

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.get("/me", response_model=UserInfoResponse)
async def get_me(current_user: CurrentUser):
    """获取当前登录用户信息.

    支持两种用户类型：
    - 微信小程序用户 (User)
    - 商家管理员 (Merchant)
    """
    # 如果是微信用户
    if isinstance(current_user, User):
        return UserInfoResponse(
            id=current_user.id,
            openid=current_user.openid,
            nickname=current_user.nickname,
            avatar_url=current_user.avatar_url,
            phone=current_user.phone,
        )

    # 如果是商家（返回简化信息）
    return {
        "id": current_user.id,
        "username": current_user.username,
        "name": current_user.name,
        "type": "merchant",
    }


@router.patch("/me", response_model=UserInfoResponse)
async def update_me(
    data: UserProfileUpdate,
    current_user: CurrentUser,
    db: DBSession,
):
    """更新当前用户信息（仅微信小程序用户）."""
    # 仅支持微信用户更新
    if not isinstance(current_user, User):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="商家用户不能通过此接口更新信息",
        )

    # 更新字段
    if data.nickname is not None:
        current_user.nickname = data.nickname
    if data.avatar_url is not None:
        current_user.avatar_url = data.avatar_url
    if data.phone is not None:
        current_user.phone = data.phone

    await db.commit()
    await db.refresh(current_user)

    return UserInfoResponse(
        id=current_user.id,
        openid=current_user.openid,
        nickname=current_user.nickname,
        avatar_url=current_user.avatar_url,
        phone=current_user.phone,
    )
