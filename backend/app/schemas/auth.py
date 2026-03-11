"""认证相关数据模型."""

from pydantic import BaseModel, Field


class WechatLoginRequest(BaseModel):
    """微信登录请求."""

    code: str = Field(..., description="微信登录临时 code")


class WechatLoginResponse(BaseModel):
    """微信登录响应."""

    access_token: str = Field(..., description="访问令牌")
    refresh_token: str = Field(..., description="刷新令牌")
    token_type: str = Field(default="bearer", description="令牌类型")
    expires_in: int = Field(..., description="令牌过期时间（秒）")
    is_new_user: bool = Field(..., description="是否新用户")


class UserInfoResponse(BaseModel):
    """用户信息响应."""

    id: str = Field(..., description="用户ID")
    openid: str = Field(..., description="微信 OpenID")
    nickname: str | None = Field(None, description="昵称")
    avatar_url: str | None = Field(None, description="头像URL")
    phone: str | None = Field(None, description="手机号")


class UserProfileUpdate(BaseModel):
    """用户资料更新."""

    nickname: str | None = Field(None, description="昵称")
    avatar_url: str | None = Field(None, description="头像URL")
    phone: str | None = Field(None, description="手机号")
