"""商品 schema."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator


class ProductOptionValueBase(BaseModel):
    """商品选项值基础 schema."""

    value: str = Field(..., min_length=1, max_length=50, description="选项值")
    extra_price: int = Field(default=0, ge=0, description="额外价格（分）")
    sort_order: int = Field(default=0, ge=0, description="排序顺序")


class ProductOptionValueCreate(ProductOptionValueBase):
    """创建商品选项值 schema."""

    pass


class ProductOptionValueUpdate(BaseModel):
    """更新商品选项值 schema."""

    value: str | None = Field(None, min_length=1, max_length=50)
    extra_price: int | None = Field(None, ge=0)
    sort_order: int | None = Field(None, ge=0)


class ProductOptionValueResponse(ProductOptionValueBase):
    """商品选项值响应 schema."""

    id: str
    option_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class ProductOptionBase(BaseModel):
    """商品选项基础 schema."""

    name: str = Field(..., min_length=1, max_length=50, description="选项名称")
    is_required: bool = Field(default=False, description="是否必选")
    is_multiple: bool = Field(default=False, description="是否多选")
    sort_order: int = Field(default=0, ge=0, description="排序顺序")


class ProductOptionCreate(ProductOptionBase):
    """创建商品选项 schema."""

    values: list[ProductOptionValueCreate] = Field(default=[], description="选项值列表")


class ProductOptionUpdate(BaseModel):
    """更新商品选项 schema."""

    name: str | None = Field(None, min_length=1, max_length=50)
    is_required: bool | None = None
    is_multiple: bool | None = None
    sort_order: int | None = Field(None, ge=0)


class ProductOptionResponse(ProductOptionBase):
    """商品选项响应 schema."""

    id: str
    product_id: str
    values: list[ProductOptionValueResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    """商品基础 schema."""

    name: str = Field(..., min_length=1, max_length=100, description="商品名称")
    description: str | None = Field(None, max_length=1000, description="商品描述")
    price: int = Field(..., gt=0, description="价格（分）")
    stock: int = Field(default=0, ge=0, description="库存")
    image_url: str | None = Field(None, max_length=500, description="图片URL")
    is_available: bool = Field(default=True, description="是否上架")
    sort_order: int = Field(default=0, ge=0, description="排序顺序")
    category_id: str | None = Field(None, description="分类ID")

    @field_validator("price", mode="before")
    @classmethod
    def validate_price(cls, v: int) -> int:
        """验证价格大于0."""
        if v <= 0:
            raise ValueError("价格必须大于0")
        return v


class ProductCreate(ProductBase):
    """创建商品 schema."""

    options: list[ProductOptionCreate] = Field(default=[], description="商品选项")


class ProductUpdate(BaseModel):
    """更新商品 schema."""

    name: str | None = Field(None, min_length=1, max_length=100, description="商品名称")
    description: str | None = Field(None, max_length=1000, description="商品描述")
    price: int | None = Field(None, gt=0, description="价格（分）")
    stock: int | None = Field(None, ge=0, description="库存")
    image_url: str | None = Field(None, max_length=500, description="图片URL")
    is_available: bool | None = Field(None, description="是否上架")
    sort_order: int | None = Field(None, ge=0, description="排序顺序")
    category_id: str | None = Field(None, description="分类ID")

    @field_validator("price")
    @classmethod
    def validate_price(cls, v: int | None) -> int | None:
        """验证价格大于0."""
        if v is not None and v <= 0:
            raise ValueError("价格必须大于0")
        return v


class CategoryInfo(BaseModel):
    """分类简要信息."""

    id: str
    name: str

    class Config:
        from_attributes = True


class ProductResponse(ProductBase):
    """商品响应 schema."""

    id: str = Field(..., description="商品ID")
    category: CategoryInfo | None = Field(None, description="分类信息")
    options: list[ProductOptionResponse] = []
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    """商品列表响应 schema."""

    items: list[ProductResponse]
    total: int


class ProductFilter(BaseModel):
    """商品过滤参数."""

    category_id: str | None = Field(None, description="分类ID")
    is_available: bool | None = Field(None, description="是否上架")
    keyword: str | None = Field(None, description="搜索关键词")
