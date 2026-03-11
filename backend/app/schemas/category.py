"""分类 schema."""

from datetime import datetime

from pydantic import BaseModel, Field


class CategoryBase(BaseModel):
    """分类基础 schema."""

    name: str = Field(..., min_length=1, max_length=50, description="分类名称")
    sort_order: int = Field(default=0, ge=0, description="排序顺序")


class CategoryCreate(CategoryBase):
    """创建分类 schema."""

    pass


class CategoryUpdate(BaseModel):
    """更新分类 schema."""

    name: str | None = Field(None, min_length=1, max_length=50, description="分类名称")
    sort_order: int | None = Field(None, ge=0, description="排序顺序")


class CategoryResponse(CategoryBase):
    """分类响应 schema."""

    id: str = Field(..., description="分类ID")
    product_count: int = Field(default=0, description="商品数量")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    class Config:
        from_attributes = True


class CategoryListResponse(BaseModel):
    """分类列表响应 schema."""

    items: list[CategoryResponse]
    total: int
