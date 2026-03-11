"""订单路由."""

import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DBSession
from app.core.pickup_code import PickupCodeService
from app.core.websocket import notify_order_update, notify_queue_update
from app.models.merchant import Merchant
from app.models.order import Order, OrderItem, OrderStatus
from app.models.order_item_option import OrderItemOption
from app.models.product import Product
from app.models.product_option import ProductOption, ProductOptionValue
from app.schemas import (
    OrderCreate,
    OrderItemOptionCreate,
    OrderItemOptionResponse,
    OrderListResponse,
    OrderQueryParams,
    OrderResponse,
    OrderStatusUpdate,
    OrderUpdate,
    QueueResponse,
)

router = APIRouter()


def generate_order_number() -> str:
    """生成订单号.

    格式: 年月日(8位) + 序号(4位)
    例如: 202403110001
    """
    now = datetime.now()
    date_str = now.strftime("%Y%m%d")
    # 使用 UUID 后 4 位作为序号 (简化实现)
    seq = uuid.uuid4().hex[:4].upper()
    return f"{date_str}{seq}"


def build_order_item_response(item: OrderItem) -> dict:
    """构建订单项响应."""
    selected_options = [
        OrderItemOptionResponse(
            id=opt.id,
            option_name=opt.option_name,
            option_value=opt.option_value,
            extra_price=opt.extra_price,
        )
        for opt in item.selected_options
    ]

    return {
        "id": item.id,
        "product_id": item.product_id,
        "product_name": item.product_name,
        "product_price": item.product_price,
        "quantity": item.quantity,
        "selected_options": selected_options,
    }


def build_order_response(order: Order) -> OrderResponse:
    """构建订单响应."""
    items = [build_order_item_response(item) for item in order.items]

    return OrderResponse(
        id=order.id,
        order_number=order.order_number,
        pickup_code=order.pickup_code,
        status=order.status,
        total_amount=order.total_amount,
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        note=order.note,
        items=items,
        created_at=order.created_at,
        updated_at=order.updated_at,
        completed_at=order.completed_at,
    )


@router.get("", response_model=OrderListResponse)
async def list_orders(
    db: DBSession,
    current_user: CurrentUser,
    status: OrderStatus | None = Query(None, description="订单状态筛选"),
    pickup_code: str | None = Query(None, description="取餐码"),
    start_date: datetime | None = Query(None, description="开始日期"),
    end_date: datetime | None = Query(None, description="结束日期"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """获取订单列表."""
    skip = (page - 1) * page_size

    # 构建查询条件
    query = select(Order)
    count_query = select(func.count(Order.id))

    filters = []
    if status:
        filters.append(Order.status == status)
    if pickup_code:
        filters.append(Order.pickup_code == pickup_code)
    if start_date:
        filters.append(Order.created_at >= start_date)
    if end_date:
        filters.append(Order.created_at <= end_date)

    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)

    # 获取总数
    count_result = await db.execute(count_query)
    total = count_result.scalar()

    # 分页查询 (包含订单项和选项)
    query = (
        query.options(
            selectinload(Order.items).selectinload(OrderItem.selected_options)
        )
        .order_by(desc(Order.created_at))
        .offset(skip)
        .limit(page_size)
    )
    result = await db.execute(query)
    orders = result.scalars().all()

    # 转换为响应格式
    order_responses = [build_order_response(order) for order in orders]

    return OrderListResponse(
        items=order_responses,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/queue", response_model=QueueResponse)
async def get_queue(
    db: DBSession,
    current_user: CurrentUser,
    limit: int = Query(20, ge=1, le=50),
):
    """获取排队队列 (待制作、制作中、待取餐)."""
    # 查询三个状态的订单
    statuses = [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY]

    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.selected_options))
        .where(Order.status.in_(statuses))
        .order_by(Order.created_at)
        .limit(limit * 3)
    )
    orders = result.scalars().all()

    # 按状态分组
    pending = []
    preparing = []
    ready = []

    for order in orders:
        order_dict = build_order_response(order).model_dump()

        if order.status == OrderStatus.PENDING:
            pending.append(order_dict)
        elif order.status == OrderStatus.PREPARING:
            preparing.append(order_dict)
        elif order.status == OrderStatus.READY:
            ready.append(order_dict)

    return QueueResponse(
        pending=pending[:limit],
        preparing=preparing[:limit],
        ready=ready[:limit],
    )


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    data: OrderCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    """创建订单."""
    # TODO: 从认证信息获取当前商家ID
    # 临时使用第一个商家或创建默认商家
    merchant_result = await db.execute(select(Merchant).limit(1))
    merchant = merchant_result.scalar_one_or_none()

    if merchant is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="没有可用的商家配置",
        )

    # 生成取餐码 (原子操作)
    pickup_code, _ = await PickupCodeService.generate_pickup_code(db, merchant.id)

    # 验证商品并计算总价
    total_amount = 0
    order_items_data = []

    for item_data in data.items:
        # 查询商品 (包含选项)
        product_result = await db.execute(
            select(Product)
            .options(selectinload(Product.options).selectinload(ProductOption.values))
            .where(Product.id == item_data.product_id)
        )
        product = product_result.scalar_one_or_none()

        if product is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"商品不存在: {item_data.product_id}",
            )

        if not product.is_available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"商品已下架: {product.name}",
            )

        if product.stock < item_data.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"商品库存不足: {product.name} (剩余 {product.stock})",
            )

        # 验证选项并计算额外价格
        options_extra_price = 0
        selected_options_data = []

        # 构建选项映射用于验证
        option_map = {opt.id: opt for opt in product.options}
        option_value_map = {}
        for opt in product.options:
            for val in opt.values:
                option_value_map[(opt.id, val.id)] = val

        # 验证必选项
        required_option_ids = {opt.id for opt in product.options if opt.is_required}
        selected_option_ids = {opt.option_id for opt in item_data.options}

        missing_required = required_option_ids - selected_option_ids
        if missing_required:
            missing_names = [
                option_map[oid].name for oid in missing_required if oid in option_map
            ]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"商品 '{product.name}' 缺少必选项: {', '.join(missing_names)}",
            )

        # 验证每个选项
        for opt_selection in item_data.options:
            option_id = opt_selection.option_id
            value_id = opt_selection.value_id

            # 验证选项存在
            if option_id not in option_map:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"商品 '{product.name}' 的选项不存在",
                )

            option = option_map[option_id]

            # 验证选项值存在
            if (option_id, value_id) not in option_value_map:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"商品 '{product.name}' 的选项 '{option.name}' 值不存在",
                )

            option_value = option_value_map[(option_id, value_id)]

            # 累加额外价格
            options_extra_price += option_value.extra_price

            # 记录选项数据
            selected_options_data.append({
                "option_name": option.name,
                "option_value": option_value.value,
                "extra_price": option_value.extra_price,
            })

        # 扣减库存
        product.stock -= item_data.quantity

        # 计算小计 (商品价格 + 选项额外价格) * 数量
        item_unit_price = product.price + options_extra_price
        subtotal = item_unit_price * item_data.quantity
        total_amount += subtotal

        # 记录订单项数据
        order_items_data.append({
            "product_id": product.id,
            "product_name": product.name,
            "product_price": product.price,
            "quantity": item_data.quantity,
            "selected_options": selected_options_data,
        })

    # 创建订单
    order = Order(
        id=str(uuid.uuid4()),
        order_number=generate_order_number(),
        pickup_code=pickup_code,
        status=OrderStatus.PENDING,
        total_amount=total_amount,
        customer_name=data.customer_name,
        customer_phone=data.customer_phone,
        note=data.note,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(order)
    await db.flush()  # 获取 order.id

    # 创建订单项
    for item_data in order_items_data:
        order_item = OrderItem(
            id=str(uuid.uuid4()),
            order_id=order.id,
            product_id=item_data["product_id"],
            product_name=item_data["product_name"],
            product_price=item_data["product_price"],
            quantity=item_data["quantity"],
        )
        db.add(order_item)
        await db.flush()  # 获取 order_item.id

        # 创建订单项选项快照
        for opt_data in item_data["selected_options"]:
            order_item_option = OrderItemOption(
                id=str(uuid.uuid4()),
                order_item_id=order_item.id,
                option_name=opt_data["option_name"],
                option_value=opt_data["option_value"],
                extra_price=opt_data["extra_price"],
            )
            db.add(order_item_option)

    await db.commit()

    # 重新加载订单 (包含订单项和选项)
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.selected_options))
        .where(Order.id == order.id)
    )
    order = result.scalar_one()

    response = build_order_response(order)

    # WebSocket 广播新订单和队列更新
    await notify_order_update(response.model_dump())
    await _broadcast_queue_update(db)

    return response


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """获取订单详情."""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.selected_options))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="订单不存在",
        )

    return build_order_response(order)


@router.put("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: str,
    data: OrderUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    """更新订单信息."""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.selected_options))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="订单不存在",
        )

    # 只能更新未完成的订单
    if order.status in [OrderStatus.COMPLETED, OrderStatus.CANCELLED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="已完成的订单不能修改",
        )

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(order, key, value)

    await db.commit()
    await db.refresh(order)

    return build_order_response(order)


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: str,
    data: OrderStatusUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    """更新订单状态."""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.selected_options))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="订单不存在",
        )

    # 检查状态转换是否合法
    if not order.can_transition_to(data.status):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不能从 {order.status.value} 转换为 {data.status.value}",
        )

    order.status = data.status
    if data.status == OrderStatus.COMPLETED:
        order.completed_at = datetime.utcnow()

    await db.commit()
    await db.refresh(order)

    # 构建响应
    response = build_order_response(order)

    # WebSocket 广播订单更新
    await notify_order_update(response.model_dump())

    # 如果订单状态是 pending/preparing/ready，也广播队列更新
    if data.status in [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY]:
        await _broadcast_queue_update(db)

    return response


async def _broadcast_queue_update(db):
    """广播队列更新."""
    from sqlalchemy import select
    statuses = [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY]
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.selected_options))
        .where(Order.status.in_(statuses))
        .order_by(Order.created_at)
        .limit(60)
    )
    orders = result.scalars().all()

    pending = []
    preparing = []
    ready = []

    for order in orders:
        order_dict = build_order_response(order).model_dump()
        if order.status == OrderStatus.PENDING:
            pending.append(order_dict)
        elif order.status == OrderStatus.PREPARING:
            preparing.append(order_dict)
        elif order.status == OrderStatus.READY:
            ready.append(order_dict)

    await notify_queue_update({
        "pending": pending,
        "preparing": preparing,
        "ready": ready,
    })


@router.post("/{order_id}/call")
async def call_order(
    order_id: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """手动叫号 (将订单状态改为待取餐)."""
    result = await db.execute(
        select(Order).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="订单不存在",
        )

    if order.status != OrderStatus.PREPARING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="只能叫制作中的订单",
        )

    order.status = OrderStatus.READY
    await db.commit()

    # 广播队列更新
    await _broadcast_queue_update(db)

    return {
        "id": order_id,
        "pickup_code": order.pickup_code,
        "message": f"请取餐码 {order.pickup_code} 的顾客取餐",
    }


@router.post("/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """取消订单."""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.selected_options))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="订单不存在",
        )

    # 检查是否可以取消
    if not order.can_transition_to(OrderStatus.CANCELLED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该订单状态不能取消",
        )

    # 恢复库存
    for item in order.items:
        if item.product_id:
            product_result = await db.execute(
                select(Product).where(Product.id == item.product_id)
            )
            product = product_result.scalar_one_or_none()
            if product:
                product.stock += item.quantity

    order.status = OrderStatus.CANCELLED
    await db.commit()
    await db.refresh(order)

    return build_order_response(order)
