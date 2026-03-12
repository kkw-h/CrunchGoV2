"""商家 schema."""

from datetime import time

from pydantic import BaseModel, Field


class BusinessHours(BaseModel):
    """营业时间."""

    open: str = Field(..., description="开门时间 (HH:MM)")
    close: str = Field(..., description="关门时间 (HH:MM)")


class MerchantProfile(BaseModel):
    """商家资料."""

    id: str
    name: str = Field(..., description="店铺名称")
    address: str | None = Field(None, description="店铺地址")
    phone: str | None = Field(None, description="联系电话")
    business_hours: BusinessHours = Field(..., description="营业时间")
    created_at: str
    updated_at: str


class MerchantProfileUpdate(BaseModel):
    """更新商家资料."""

    name: str | None = Field(None, min_length=1, max_length=100, description="店铺名称")
    address: str | None = Field(None, max_length=255, description="店铺地址")
    phone: str | None = Field(None, max_length=20, description="联系电话")
    business_hours: BusinessHours | None = Field(None, description="营业时间")


class PickupCodeSettings(BaseModel):
    """取餐码设置."""

    # 取餐码前缀，如 "A" 表示堂食，"B" 表示外带，空字符串表示纯数字
    prefix: str = Field(default="", max_length=5, description="取餐码前缀")
    # 是否每天重置取餐码
    daily_reset: bool = Field(default=True, description="每天重置取餐码")


class QuickRemarksSettings(BaseModel):
    """常用备注设置."""

    remarks: list[str] = Field(default=[], description="常用备注列表", max_length=10)


class MerchantSettings(BaseModel):
    """商家设置."""

    pickup_code: PickupCodeSettings = Field(..., description="取餐码设置")
    auto_print_order: bool = Field(default=False, description="自动打印订单")
    quick_remarks: list[str] = Field(default=[], description="常用备注列表")


class MerchantSettingsUpdate(BaseModel):
    """更新商家设置."""

    pickup_code: PickupCodeSettings | None = Field(None, description="取餐码设置")
    auto_print_order: bool | None = Field(None, description="自动打印订单")
    quick_remarks: list[str] | None = Field(None, description="常用备注列表", max_length=10)


class WechatConfig(BaseModel):
    """微信小程序配置."""

    app_id: str | None = Field(None, description="小程序 AppID")
    # 不返回 secret，仅用于更新


class WechatConfigUpdate(BaseModel):
    """更新微信小程序配置."""

    app_id: str | None = Field(None, max_length=50, description="小程序 AppID")
    app_secret: str | None = Field(None, max_length=100, description="小程序 AppSecret")
