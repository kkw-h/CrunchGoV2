"""API 依赖注入."""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.models.base import get_db
from app.models.merchant import Merchant
from app.models.user import User

# HTTP Bearer 安全方案
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User | Merchant:
    """获取当前用户 (支持微信用户和商家).

    优先查询微信用户，如果不存在则查询商家。
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供认证令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的令牌内容",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 先查询微信用户
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user:
        return user

    # 再查询商家
    result = await db.execute(select(Merchant).where(Merchant.id == user_id))
    merchant = result.scalar_one_or_none()
    if merchant:
        return merchant

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="用户不存在",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_merchant(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Merchant:
    """获取当前商家 (仅商家可访问)."""
    user = await get_current_user(credentials, db)

    if not isinstance(user, Merchant):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="仅商家可访问",
        )

    return user


async def get_current_user_optional(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User | None:
    """获取当前用户 (可选，未登录返回 None).

    仅返回微信用户，用于小程序端不需要强制登录的场景。
    """
    if credentials is None:
        return None

    try:
        payload = decode_token(credentials.credentials)
        if payload is None:
            return None

        user_id = payload.get("sub")
        if user_id is None:
            return None

        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
    except Exception:
        return None


# 依赖别名
CurrentUser = Annotated[User | Merchant, Depends(get_current_user)]
CurrentMerchant = Annotated[Merchant, Depends(get_current_merchant)]
CurrentUserOptional = Annotated[User | None, Depends(get_current_user_optional)]
DBSession = Annotated[AsyncSession, Depends(get_db)]
