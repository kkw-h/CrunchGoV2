"""分类路由."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DBSession
from app.models.category import Category
from app.schemas import (
    CategoryCreate,
    CategoryListResponse,
    CategoryResponse,
    CategoryUpdate,
)

router = APIRouter()


@router.get("", response_model=CategoryListResponse)
async def list_categories(
    db: DBSession,
    current_user: CurrentUser,
):
    """获取分类列表."""
    result = await db.execute(
        select(Category)
        .options(selectinload(Category.products))
        .order_by(Category.sort_order, Category.created_at)
    )
    categories = result.scalars().all()

    items = []
    for cat in categories:
        item_dict = {
            "id": cat.id,
            "name": cat.name,
            "sort_order": cat.sort_order,
            "product_count": len(cat.products),
            "created_at": cat.created_at,
            "updated_at": cat.updated_at,
        }
        items.append(CategoryResponse(**item_dict))

    return CategoryListResponse(items=items, total=len(items))


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    """创建分类."""
    category = Category(
        id=str(uuid.uuid4()),
        name=data.name,
        sort_order=data.sort_order,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)

    return CategoryResponse(
        id=category.id,
        name=category.name,
        sort_order=category.sort_order,
        product_count=0,
        created_at=category.created_at,
        updated_at=category.updated_at,
    )


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """获取分类详情."""
    result = await db.execute(
        select(Category).where(Category.id == category_id)
    )
    category = result.scalar_one_or_none()

    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="分类不存在",
        )

    return CategoryResponse(
        id=category.id,
        name=category.name,
        sort_order=category.sort_order,
        product_count=len(category.products),
        created_at=category.created_at,
        updated_at=category.updated_at,
    )


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    data: CategoryUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    """更新分类."""
    result = await db.execute(
        select(Category).where(Category.id == category_id)
    )
    category = result.scalar_one_or_none()

    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="分类不存在",
        )

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(category, key, value)

    await db.commit()
    await db.refresh(category)

    return CategoryResponse(
        id=category.id,
        name=category.name,
        sort_order=category.sort_order,
        product_count=len(category.products),
        created_at=category.created_at,
        updated_at=category.updated_at,
    )


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """删除分类."""
    result = await db.execute(
        select(Category).where(Category.id == category_id)
    )
    category = result.scalar_one_or_none()

    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="分类不存在",
        )

    # 检查分类下是否有商品
    if category.products:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该分类下存在商品，无法删除",
        )

    await db.delete(category)
    await db.commit()

    return None
