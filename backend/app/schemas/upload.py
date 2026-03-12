"""上传 schema."""

from pydantic import BaseModel, Field


class UploadTokenResponse(BaseModel):
    """上传凭证响应."""

    token: str = Field(..., description="七牛云上传凭证")
    key: str = Field(..., description="文件存储 key")
    domain: str = Field(..., description="七牛云域名")


class UploadResponse(BaseModel):
    """上传结果响应."""

    url: str = Field(..., description="文件访问 URL")
    key: str = Field(..., description="文件存储 key")
    filename: str = Field(..., description="原始文件名")


class PrivateUrlRequest(BaseModel):
    """获取私有空间下载 URL 请求."""

    key: str = Field(..., description="文件存储 key")
    expires: int = Field(default=3600, ge=60, le=86400, description="链接有效期（秒），默认1小时，最大24小时")


class PrivateUrlResponse(BaseModel):
    """私有空间下载 URL 响应."""

    url: str = Field(..., description="带凭证的文件访问 URL")
    key: str = Field(..., description="文件存储 key")
    expires_in: int = Field(..., description="链接有效期（秒）")
