"""用户相关数据模型."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserBase(BaseModel):
    """用户基础模型."""

    openid: str = Field(..., description="微信 OpenID")
    unionid: str | None = Field(None, description="微信 UnionID")
    nickname: str | None = Field(None, description="昵称")
    avatar_url: str | None = Field(None, description="头像URL")
    phone: str | None = Field(None, description="手机号")


class UserCreate(UserBase):
    """创建用户."""

    pass


class UserUpdate(BaseModel):
    """更新用户."""

    nickname: str | None = Field(None, description="昵称")
    avatar_url: str | None = Field(None, description="头像URL")
    phone: str | None = Field(None, description="手机号")
    is_active: bool | None = Field(None, description="是否激活")


class UserResponse(UserBase):
    """用户响应."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="用户ID")
    is_active: bool = Field(..., description="是否激活")
    login_count: int = Field(..., description="登录次数")
    last_login_at: datetime | None = Field(None, description="最后登录时间")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
