"""七牛云上传服务."""

import hashlib
import time
import uuid

from qiniu import Auth, put_data

from app.config import settings


class QiniuService:
    """七牛云服务."""

    def __init__(self):
        """初始化七牛云认证."""
        self.access_key = settings.QINIU_ACCESS_KEY
        self.secret_key = settings.QINIU_SECRET_KEY
        self.bucket_name = settings.QINIU_BUCKET_NAME
        self.domain = settings.QINIU_DOMAIN
        self.is_private = getattr(settings, "QINIU_IS_PRIVATE", False)

        if self.access_key and self.secret_key:
            self.auth = Auth(self.access_key, self.secret_key)
        else:
            self.auth = None

    def is_configured(self) -> bool:
        """检查七牛云是否已配置."""
        return (
            self.auth is not None
            and self.bucket_name
            and self.domain
        )

    def generate_upload_token(self, key: str | None = None) -> str:
        """生成上传凭证.

        Args:
            key: 可选的文件 key，如果不指定则由七牛云自动生成

        Returns:
            上传凭证 token
        """
        if not self.auth:
            raise ValueError("七牛云未配置")

        policy = {
            "scope": f"{self.bucket_name}:{key}" if key else self.bucket_name,
            "expires": 3600,  # 1小时有效期
        }

        return self.auth.upload_token(
            self.bucket_name,
            key,
            3600,
            policy if key else None
        )

    def generate_key(self, filename: str) -> str:
        """生成唯一的文件 key.

        格式: products/{date}/{uuid}_{filename}

        Args:
            filename: 原始文件名

        Returns:
            生成的文件 key
        """
        date_str = time.strftime("%Y%m%d")
        ext = filename.split(".")[-1] if "." in filename else "jpg"
        unique_id = hashlib.md5(f"{uuid.uuid4()}{time.time()}".encode()).hexdigest()[:16]
        return f"products/{date_str}/{unique_id}.{ext}"

    def get_full_url(self, key: str, expires: int = 3600) -> str:
        """获取完整访问 URL.

        Args:
            key: 文件 key
            expires: 私有空间下载链接有效期（秒），默认1小时

        Returns:
            完整 URL（私有空间会带上下载凭证）
        """
        domain = self.domain.rstrip("/")
        base_url = f"{domain}/{key}"

        if self.is_private and self.auth:
            return self.auth.private_download_url(base_url, expires=expires)

        return base_url

    def get_private_url(self, key: str, expires: int = 3600) -> str:
        """获取私有空间下载 URL（带凭证）.

        Args:
            key: 文件 key
            expires: 链接有效期（秒），默认1小时

        Returns:
            带下载凭证的完整 URL
        """
        if not self.auth:
            raise ValueError("七牛云未配置")

        domain = self.domain.rstrip("/")
        base_url = f"{domain}/{key}"
        return self.auth.private_download_url(base_url, expires=expires)

    async def upload_file(self, file_data: bytes, filename: str) -> dict:
        """上传文件到七牛云.

        Args:
            file_data: 文件二进制数据
            filename: 文件名

        Returns:
            包含 key 和 url 的字典
        """
        if not self.is_configured():
            raise ValueError("七牛云未配置，请检查环境变量")

        key = self.generate_key(filename)
        token = self.generate_upload_token(key)

        ret, info = put_data(token, key, file_data)

        if info.status_code != 200:
            raise Exception(f"上传失败: {info.error}")

        return {
            "key": ret["key"],
            "url": self.get_full_url(ret["key"], expires=86400),  # 24小时有效期
            "hash": ret.get("hash"),
        }


# 全局实例
qiniu_service = QiniuService()
