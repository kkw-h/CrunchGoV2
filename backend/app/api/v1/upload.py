"""文件上传路由."""

from fastapi import APIRouter, HTTPException, UploadFile, status

from app.api.deps import CurrentUser
from app.core.qiniu import qiniu_service
from app.schemas import (
    PrivateUrlRequest,
    PrivateUrlResponse,
    UploadResponse,
    UploadTokenResponse,
)

router = APIRouter()


@router.get("/token", response_model=UploadTokenResponse)
async def get_upload_token(
    current_user: CurrentUser,
    filename: str | None = None,
):
    """获取七牛云上传凭证 (前端直传使用).

    - 前端获取 token 后直接上传到七牛云
    - 避免文件流经服务器，节省带宽
    """
    if not qiniu_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="七牛云存储未配置",
        )

    key = qiniu_service.generate_key(filename or "image.jpg")
    token = qiniu_service.generate_upload_token(key)

    return UploadTokenResponse(
        token=token,
        key=key,
        domain=qiniu_service.domain,
    )


@router.post("/image", response_model=UploadResponse)
async def upload_image(
    file: UploadFile,
    current_user: CurrentUser,
):
    """上传图片到七牛云 (服务端中转).

    - 适合小程序端等不方便直传的场景
    - 文件先上传到后端，后端再传到七牛云
    """
    if not qiniu_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="七牛云存储未配置",
        )

    # 验证文件类型
    allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    content_type = file.content_type or ""

    if content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的文件类型: {content_type}，仅支持 JPEG、PNG、GIF、WebP",
        )

    # 验证文件大小 (最大 5MB)
    max_size = 5 * 1024 * 1024
    file_data = await file.read()
    if len(file_data) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文件大小超过限制 (最大 5MB)",
        )

    try:
        result = await qiniu_service.upload_file(file_data, file.filename)
        return UploadResponse(
            url=result["url"],
            key=result["key"],
            filename=file.filename,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"上传失败: {str(e)}",
        )


@router.post("/private-url", response_model=PrivateUrlResponse)
async def get_private_url(
    request: PrivateUrlRequest,
    current_user: CurrentUser,
):
    """获取私有空间图片下载 URL（带凭证）.

    - 私有空间中的图片需要带凭证访问
    - 返回的 URL 有过期时间，过期后需要重新获取
    """
    if not qiniu_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="七牛云存储未配置",
        )

    try:
        url = qiniu_service.get_private_url(request.key, expires=request.expires)
        return PrivateUrlResponse(
            url=url,
            key=request.key,
            expires_in=request.expires,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成下载链接失败: {str(e)}",
        )
