"""商家路由."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DBSession
from app.models.merchant import Merchant
from app.schemas import (
    MerchantProfile,
    MerchantProfileUpdate,
    MerchantSettings,
    MerchantSettingsUpdate,
    PickupCodeSettings,
    WechatConfig,
    WechatConfigUpdate,
)

router = APIRouter()


def time_to_str(t) -> str:
    """时间转为字符串."""
    return t.strftime("%H:%M") if t else "09:00"


def str_to_time(s: str):
    """字符串转为时间."""
    from datetime import time as dt_time
    parts = s.split(":")
    hour = int(parts[0])
    minute = int(parts[1]) if len(parts) > 1 else 0
    return dt_time(hour, minute)


@router.get("/profile", response_model=MerchantProfile)
async def get_profile(
    db: DBSession,
):
    """获取商家信息."""
    # 临时返回第一个商家，实际应该根据 current_user 获取
    result = await db.execute(select(Merchant).limit(1))
    merchant = result.scalar_one_or_none()

    if merchant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="商家不存在",
        )

    return MerchantProfile(
        id=merchant.id,
        name=merchant.name,
        address=merchant.address,
        phone=merchant.phone,
        business_hours={
            "open": time_to_str(merchant.business_hours_open),
            "close": time_to_str(merchant.business_hours_close),
        },
        created_at=merchant.created_at.isoformat(),
        updated_at=merchant.updated_at.isoformat(),
    )


@router.put("/profile", response_model=MerchantProfile)
async def update_profile(
    data: MerchantProfileUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    """更新商家信息."""
    result = await db.execute(select(Merchant).limit(1))
    merchant = result.scalar_one_or_none()

    if merchant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="商家不存在",
        )

    update_data = data.model_dump(exclude_unset=True)

    if "name" in update_data and update_data["name"]:
        merchant.name = update_data["name"]
    if "address" in update_data:
        merchant.address = update_data["address"]
    if "phone" in update_data:
        merchant.phone = update_data["phone"]
    if "business_hours" in update_data and update_data["business_hours"]:
        hours = update_data["business_hours"]
        merchant.business_hours_open = str_to_time(hours["open"])
        merchant.business_hours_close = str_to_time(hours["close"])

    await db.commit()
    await db.refresh(merchant)

    return MerchantProfile(
        id=merchant.id,
        name=merchant.name,
        address=merchant.address,
        phone=merchant.phone,
        business_hours={
            "open": time_to_str(merchant.business_hours_open),
            "close": time_to_str(merchant.business_hours_close),
        },
        created_at=merchant.created_at.isoformat(),
        updated_at=merchant.updated_at.isoformat(),
    )


@router.get("/settings", response_model=MerchantSettings)
async def get_settings(
    db: DBSession,
):
    """获取商家设置 (排队规则等)."""
    result = await db.execute(select(Merchant).limit(1))
    merchant = result.scalar_one_or_none()

    if merchant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="商家不存在",
        )

    return MerchantSettings(
        pickup_code=PickupCodeSettings(
            prefix=merchant.pickup_code_prefix,
            daily_reset=merchant.pickup_code_daily_reset,
        ),
        auto_print_order=merchant.auto_print_order,
    )


@router.put("/settings", response_model=MerchantSettings)
async def update_settings(
    data: MerchantSettingsUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    """更新商家设置."""
    result = await db.execute(select(Merchant).limit(1))
    merchant = result.scalar_one_or_none()

    if merchant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="商家不存在",
        )

    update_data = data.model_dump(exclude_unset=True)

    if "pickup_code" in update_data and update_data["pickup_code"]:
        pickup_code = update_data["pickup_code"]
        if "prefix" in pickup_code:
            merchant.pickup_code_prefix = pickup_code["prefix"]
        if "daily_reset" in pickup_code:
            merchant.pickup_code_daily_reset = pickup_code["daily_reset"]

    if "auto_print_order" in update_data:
        merchant.auto_print_order = update_data["auto_print_order"]

    await db.commit()
    await db.refresh(merchant)

    return MerchantSettings(
        pickup_code=PickupCodeSettings(
            prefix=merchant.pickup_code_prefix,
            daily_reset=merchant.pickup_code_daily_reset,
        ),
        auto_print_order=merchant.auto_print_order,
    )


@router.get("/wechat", response_model=WechatConfig)
async def get_wechat_config(
    db: DBSession,
):
    """获取微信小程序配置."""
    result = await db.execute(select(Merchant).limit(1))
    merchant = result.scalar_one_or_none()

    if merchant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="商家不存在",
        )

    return WechatConfig(app_id=merchant.wechat_app_id)


@router.put("/wechat", response_model=WechatConfig)
async def update_wechat_config(
    data: WechatConfigUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    """更新微信小程序配置."""
    result = await db.execute(select(Merchant).limit(1))
    merchant = result.scalar_one_or_none()

    if merchant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="商家不存在",
        )

    if data.app_id is not None:
        merchant.wechat_app_id = data.app_id
    if data.app_secret is not None:
        merchant.wechat_app_secret = data.app_secret

    await db.commit()
    await db.refresh(merchant)

    return WechatConfig(app_id=merchant.wechat_app_id)
