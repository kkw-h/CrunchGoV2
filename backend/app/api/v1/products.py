"""商品路由."""

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DBSession
from app.models.category import Category
from app.models.product import Product
from app.models.product_option import ProductOption, ProductOptionValue
from app.schemas import (
    ProductCreate,
    ProductFilter,
    ProductListResponse,
    ProductOptionCreate,
    ProductOptionResponse,
    ProductOptionUpdate,
    ProductOptionValueCreate,
    ProductOptionValueResponse,
    ProductResponse,
    ProductUpdate,
)

router = APIRouter()


def build_product_response(product: Product) -> ProductResponse:
    """构建商品响应."""
    category_info = None
    if product.category:
        category_info = {"id": product.category.id, "name": product.category.name}

    options = []
    for opt in product.options:
        values = [
            ProductOptionValueResponse(
                id=v.id,
                option_id=v.option_id,
                value=v.value,
                extra_price=v.extra_price,
                sort_order=v.sort_order,
                created_at=v.created_at,
            )
            for v in opt.values
        ]
        options.append(
            ProductOptionResponse(
                id=opt.id,
                product_id=opt.product_id,
                name=opt.name,
                is_required=opt.is_required,
                is_multiple=opt.is_multiple,
                sort_order=opt.sort_order,
                values=values,
                created_at=opt.created_at,
            )
        )

    return ProductResponse(
        id=product.id,
        name=product.name,
        description=product.description,
        price=product.price,
        stock=product.stock,
        image_url=product.image_url,
        is_available=product.is_available,
        sort_order=product.sort_order,
        category_id=product.category_id,
        category=category_info,
        options=options,
        created_at=product.created_at,
        updated_at=product.updated_at,
    )


@router.get("", response_model=ProductListResponse)
async def list_products(
    db: DBSession,
    current_user: CurrentUser,
    category_id: str | None = Query(None, description="分类ID"),
    is_available: bool | None = Query(None, description="是否上架"),
    keyword: str | None = Query(None, description="搜索关键词"),
    skip: int = Query(0, ge=0, description="跳过数量"),
    limit: int = Query(20, ge=1, le=100, description="返回数量"),
):
    """获取商品列表."""
    query = select(Product)

    # 应用过滤条件
    if category_id:
        query = query.where(Product.category_id == category_id)
    if is_available is not None:
        query = query.where(Product.is_available == is_available)
    if keyword:
        query = query.where(Product.name.contains(keyword))

    # 获取总数
    count_result = await db.execute(
        select(Product.id).where(
            (Product.category_id == category_id) if category_id else True,
            (Product.is_available == is_available) if is_available is not None else True,
            (Product.name.contains(keyword)) if keyword else True,
        )
    )
    total = len(count_result.scalars().all())

    # 分页查询
    query = query.order_by(Product.sort_order, Product.created_at.desc())
    query = query.offset(skip).limit(limit).options(
        selectinload(Product.category),
        selectinload(Product.options).selectinload(ProductOption.values)
    )
    result = await db.execute(query)
    products = result.scalars().all()

    items = [build_product_response(p) for p in products]
    return ProductListResponse(items=items, total=total)


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    data: ProductCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    """创建商品."""
    # 验证分类是否存在
    if data.category_id:
        result = await db.execute(
            select(Category).where(Category.id == data.category_id)
        )
        if result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="分类不存在",
            )

    product = Product(
        id=str(uuid.uuid4()),
        name=data.name,
        description=data.description,
        price=data.price,
        stock=data.stock,
        image_url=data.image_url,
        is_available=data.is_available,
        sort_order=data.sort_order,
        category_id=data.category_id,
    )
    db.add(product)
    await db.flush()  # 获取 product.id

    # 创建商品选项
    if data.options:
        for opt_data in data.options:
            option = ProductOption(
                id=str(uuid.uuid4()),
                product_id=product.id,
                name=opt_data.name,
                is_required=opt_data.is_required,
                is_multiple=opt_data.is_multiple,
                sort_order=opt_data.sort_order,
                created_at=datetime.utcnow(),
            )
            db.add(option)
            await db.flush()

            # 创建选项值
            if opt_data.values:
                for val_data in opt_data.values:
                    value = ProductOptionValue(
                        id=str(uuid.uuid4()),
                        option_id=option.id,
                        value=val_data.value,
                        extra_price=val_data.extra_price,
                        sort_order=val_data.sort_order,
                        created_at=datetime.utcnow(),
                    )
                    db.add(value)

    await db.commit()

    # 重新查询以加载所有关系
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.options).selectinload(ProductOption.values)
        )
        .where(Product.id == product.id)
    )
    product = result.scalar_one()

    return build_product_response(product)


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """获取商品详情."""
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.options).selectinload(ProductOption.values)
        )
        .where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="商品不存在",
        )

    return build_product_response(product)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    data: ProductUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    """更新商品."""
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.category))
        .where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="商品不存在",
        )

    update_data = data.model_dump(exclude_unset=True)

    # 验证分类是否存在
    if "category_id" in update_data and update_data["category_id"]:
        cat_result = await db.execute(
            select(Category).where(Category.id == update_data["category_id"])
        )
        if cat_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="分类不存在",
            )

    for key, value in update_data.items():
        setattr(product, key, value)

    await db.commit()
    await db.refresh(product)

    # 重新加载完整数据（包含选项）
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.options).selectinload(ProductOption.values)
        )
        .where(Product.id == product_id)
    )
    product = result.scalar_one()

    return build_product_response(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """删除商品."""
    result = await db.execute(
        select(Product).where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="商品不存在",
        )

    await db.delete(product)
    await db.commit()

    return None


@router.patch("/{product_id}/toggle-status", response_model=ProductResponse)
async def toggle_product_status(
    product_id: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """切换商品上下架状态."""
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.options).selectinload(ProductOption.values)
        )
        .where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="商品不存在",
        )

    product.is_available = not product.is_available
    await db.commit()
    await db.refresh(product)

    return build_product_response(product)


@router.patch("/{product_id}/stock", response_model=ProductResponse)
async def update_stock(
    product_id: str,
    db: DBSession,
    current_user: CurrentUser,
    stock: int = Query(..., ge=0, description="新库存数量"),
):
    """更新商品库存."""
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.options).selectinload(ProductOption.values)
        )
        .where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="商品不存在",
        )

    product.stock = stock
    await db.commit()
    await db.refresh(product)

    return build_product_response(product)


# ============ 商品选项管理 ============

@router.post("/{product_id}/options", response_model=ProductOptionResponse)
async def create_option(
    product_id: str,
    data: ProductOptionCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    """为商品添加选项."""
    # 验证商品存在
    result = await db.execute(
        select(Product).where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="商品不存在",
        )

    option = ProductOption(
        id=str(uuid.uuid4()),
        product_id=product_id,
        name=data.name,
        is_required=data.is_required,
        is_multiple=data.is_multiple,
        sort_order=data.sort_order,
        created_at=datetime.utcnow(),
    )
    db.add(option)
    await db.flush()

    # 创建选项值
    values = []
    for val_data in data.values:
        value = ProductOptionValue(
            id=str(uuid.uuid4()),
            option_id=option.id,
            value=val_data.value,
            extra_price=val_data.extra_price,
            sort_order=val_data.sort_order,
            created_at=datetime.utcnow(),
        )
        db.add(value)
        values.append(value)

    await db.commit()

    return ProductOptionResponse(
        id=option.id,
        product_id=option.product_id,
        name=option.name,
        is_required=option.is_required,
        is_multiple=option.is_multiple,
        sort_order=option.sort_order,
        values=[
            ProductOptionValueResponse(
                id=v.id,
                option_id=v.option_id,
                value=v.value,
                extra_price=v.extra_price,
                sort_order=v.sort_order,
                created_at=v.created_at,
            )
            for v in values
        ],
        created_at=option.created_at,
    )


@router.put("/{product_id}/options/{option_id}", response_model=ProductOptionResponse)
async def update_option(
    product_id: str,
    option_id: str,
    data: ProductOptionUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    """更新商品选项."""
    result = await db.execute(
        select(ProductOption)
        .options(selectinload(ProductOption.values))
        .where(ProductOption.id == option_id, ProductOption.product_id == product_id)
    )
    option = result.scalar_one_or_none()
    if option is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="选项不存在",
        )

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(option, key, value)

    await db.commit()
    await db.refresh(option)

    return ProductOptionResponse(
        id=option.id,
        product_id=option.product_id,
        name=option.name,
        is_required=option.is_required,
        is_multiple=option.is_multiple,
        sort_order=option.sort_order,
        values=[
            ProductOptionValueResponse(
                id=v.id,
                option_id=v.option_id,
                value=v.value,
                extra_price=v.extra_price,
                sort_order=v.sort_order,
                created_at=v.created_at,
            )
            for v in option.values
        ],
        created_at=option.created_at,
    )


@router.delete("/{product_id}/options/{option_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_option(
    product_id: str,
    option_id: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """删除商品选项."""
    result = await db.execute(
        select(ProductOption).where(
            ProductOption.id == option_id,
            ProductOption.product_id == product_id
        )
    )
    option = result.scalar_one_or_none()
    if option is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="选项不存在",
        )

    await db.delete(option)
    await db.commit()

    return None


# ============ 选项值管理 ============

@router.post("/{product_id}/options/{option_id}/values", response_model=ProductOptionValueResponse)
async def create_option_value(
    product_id: str,
    option_id: str,
    data: ProductOptionValueCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    """为选项添加值."""
    # 验证选项存在且属于该商品
    result = await db.execute(
        select(ProductOption).where(
            ProductOption.id == option_id,
            ProductOption.product_id == product_id
        )
    )
    option = result.scalar_one_or_none()
    if option is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="选项不存在",
        )

    value = ProductOptionValue(
        id=str(uuid.uuid4()),
        option_id=option_id,
        value=data.value,
        extra_price=data.extra_price,
        sort_order=data.sort_order,
        created_at=datetime.utcnow(),
    )
    db.add(value)
    await db.commit()
    await db.refresh(value)

    return ProductOptionValueResponse(
        id=value.id,
        option_id=value.option_id,
        value=value.value,
        extra_price=value.extra_price,
        sort_order=value.sort_order,
        created_at=value.created_at,
    )


@router.put(
    "/{product_id}/options/{option_id}/values/{value_id}",
    response_model=ProductOptionValueResponse
)
async def update_option_value(
    product_id: str,
    option_id: str,
    value_id: str,
    data: ProductOptionValueCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    """更新选项值."""
    result = await db.execute(
        select(ProductOptionValue)
        .join(ProductOption)
        .where(
            ProductOptionValue.id == value_id,
            ProductOptionValue.option_id == option_id,
            ProductOption.product_id == product_id
        )
    )
    value = result.scalar_one_or_none()
    if value is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="选项值不存在",
        )

    value.value = data.value
    value.extra_price = data.extra_price
    value.sort_order = data.sort_order

    await db.commit()
    await db.refresh(value)

    return ProductOptionValueResponse(
        id=value.id,
        option_id=value.option_id,
        value=value.value,
        extra_price=value.extra_price,
        sort_order=value.sort_order,
        created_at=value.created_at,
    )


@router.delete(
    "/{product_id}/options/{option_id}/values/{value_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_option_value(
    product_id: str,
    option_id: str,
    value_id: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """删除选项值."""
    result = await db.execute(
        select(ProductOptionValue)
        .join(ProductOption)
        .where(
            ProductOptionValue.id == value_id,
            ProductOptionValue.option_id == option_id,
            ProductOption.product_id == product_id
        )
    )
    value = result.scalar_one_or_none()
    if value is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="选项值不存在",
        )

    await db.delete(value)
    await db.commit()

    return None
