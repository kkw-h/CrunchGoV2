"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import { fetchOrders, fetchOrder, cancelOrder, updateOrderStatus } from "@/lib/orders";
import { Order, OrderStatus } from "@/types";

// 格式化价格（分 -> 元）
function formatPrice(price: number): string {
  return (price / 100).toFixed(2);
}

// 格式化日期时间
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 状态配置
const statusConfig: Record<OrderStatus | string, { label: string; color: string }> = {
  pending: { label: "待制作", color: "bg-yellow-100 text-yellow-800" },
  preparing: { label: "制作中", color: "bg-blue-100 text-blue-800" },
  ready: { label: "待取餐", color: "bg-green-100 text-green-800" },
  completed: { label: "已完成", color: "bg-gray-100 text-gray-800" },
  cancelled: { label: "已取消", color: "bg-red-100 text-red-800" },
};

export default function OrdersPage() {
  const { mutate } = useSWRConfig();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [pickupCodeFilter, setPickupCodeFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 构建查询参数
  const queryParams = {
    page,
    page_size: pageSize,
    ...(statusFilter && { status: statusFilter }),
    ...(pickupCodeFilter && { pickup_code: pickupCodeFilter }),
  };

  // 获取订单列表
  const { data: ordersData, error, isLoading } = useSWR(
    ["orders", queryParams],
    () => fetchOrders(queryParams),
    { refreshInterval: 10000 }
  );

  // 获取订单详情
  const fetchOrderDetail = async (orderId: string) => {
    try {
      const order = await fetchOrder(orderId);
      setSelectedOrder(order);
      setIsDetailOpen(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "获取订单详情失败");
    }
  };

  // 取消订单
  const handleCancel = async (orderId: string) => {
    if (!confirm("确定要取消这个订单吗？")) return;
    try {
      await cancelOrder(orderId);
      mutate(["orders", queryParams]);
      alert("订单已取消");
    } catch (err) {
      alert(err instanceof Error ? err.message : "取消失败");
    }
  };

  // 状态变更
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      mutate(["orders", queryParams]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "状态更新失败");
    }
  };

  const orders = ordersData?.items || [];
  const total = ordersData?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航 */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 mr-4">
                ← 返回
              </Link>
              <h1 className="text-xl font-bold text-gray-900">订单管理</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/orders/queue"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                去排队队列 →
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 筛选栏 */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex flex-wrap gap-4">
            {/* 状态筛选 */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as OrderStatus | "");
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部状态</option>
              <option value="pending">待制作</option>
              <option value="preparing">制作中</option>
              <option value="ready">待取餐</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>

            {/* 取餐码搜索 */}
            <input
              type="text"
              placeholder="取餐码"
              value={pickupCodeFilter}
              onChange={(e) => {
                setPickupCodeFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 w-32"
            />

            {/* 重置按钮 */}
            <button
              onClick={() => {
                setStatusFilter("");
                setPickupCodeFilter("");
                setPage(1);
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              重置
            </button>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="mb-4 text-sm text-gray-600">
          共 <span className="font-medium">{total}</span> 条订单
          {isLoading && <span className="ml-2">加载中...</span>}
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
            加载失败: {error.message}
          </div>
        )}

        {/* 订单列表 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  取餐码
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  订单号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  商品
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  金额
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    暂无订单
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xl font-bold text-gray-900">
                        {order.pickup_code}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.order_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate">
                        {order.items.map((item) => `${item.product_name} x${item.quantity}`).join(", ")}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ¥{formatPrice(order.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          statusConfig[order.status]?.color || "bg-gray-100"
                        }`}
                      >
                        {statusConfig[order.status]?.label || order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(order.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => fetchOrderDetail(order.id)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        详情
                      </button>
                      {(order.status === "pending" || order.status === "preparing") && (
                        <button
                          onClick={() => handleCancel(order.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          取消
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-600">
              第 {page} / {totalPages} 页
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 订单详情弹窗 */}
      {isDetailOpen && selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedOrder(null);
          }}
          onStatusChange={handleStatusChange}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

// 订单详情弹窗组件
interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onCancel: (orderId: string) => void;
}

function OrderDetailModal({ order, onClose, onStatusChange, onCancel }: OrderDetailModalProps) {
  const canCancel = order.status === "pending" || order.status === "preparing";

  const getNextStatus = (current: OrderStatus): OrderStatus | null => {
    const flow: Record<OrderStatus, OrderStatus | null> = {
      pending: "preparing",
      preparing: "ready",
      ready: "completed",
      completed: null,
      cancelled: null,
    };
    return flow[current];
  };

  const nextStatus = getNextStatus(order.status);
  const nextStatusLabel: Record<OrderStatus, string> = {
    pending: "开始制作",
    preparing: "完成制作",
    ready: "确认取餐",
    completed: "",
    cancelled: "",
  };

  // 计算单项小计（包含选项加价）
  const calculateItemSubtotal = (item: Order["items"][0]) => {
    const optionsPrice = item.selected_options.reduce((sum, opt) => sum + opt.extra_price, 0);
    return (item.product_price + optionsPrice) * item.quantity;
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">订单详情</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* 取餐码 */}
          <div className="text-center py-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500 mb-1">取餐码</div>
            <div className="text-4xl font-bold text-gray-900">{order.pickup_code}</div>
          </div>

          {/* 订单信息 */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">订单号:</span>
              <span className="ml-2">{order.order_number}</span>
            </div>
            <div>
              <span className="text-gray-500">状态:</span>
              <span
                className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                  statusConfig[order.status]?.color || "bg-gray-100"
                }`}
              >
                {statusConfig[order.status]?.label || order.status}
              </span>
            </div>
            <div>
              <span className="text-gray-500">下单时间:</span>
              <span className="ml-2">{formatDateTime(order.created_at)}</span>
            </div>
            {order.completed_at && (
              <div>
                <span className="text-gray-500">完成时间:</span>
                <span className="ml-2">{formatDateTime(order.completed_at)}</span>
              </div>
            )}
          </div>

          {/* 顾客信息 */}
          {(order.customer_name || order.customer_phone) && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">顾客信息</h4>
              <div className="text-sm space-y-1">
                {order.customer_name && (
                  <div>
                    <span className="text-gray-500">姓名:</span>
                    <span className="ml-2">{order.customer_name}</span>
                  </div>
                )}
                {order.customer_phone && (
                  <div>
                    <span className="text-gray-500">电话:</span>
                    <span className="ml-2">{order.customer_phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 商品清单 */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">商品清单</h4>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="border-b border-gray-100 pb-3 last:border-0">
                  <div className="flex justify-between text-sm">
                    <div className="flex-1">
                      <span className="font-medium">{item.product_name}</span>
                      <span className="text-gray-500 ml-2">x{item.quantity}</span>
                    </div>
                    <span className="text-gray-900">
                      ¥{formatPrice(calculateItemSubtotal(item))}
                    </span>
                  </div>
                  {/* 显示选项 */}
                  {item.selected_options.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.selected_options.map((opt) => (
                        <span
                          key={opt.id}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                        >
                          {opt.option_name}: {opt.option_value}
                          {opt.extra_price > 0 && (
                            <span className="text-orange-600 ml-1">
                              +¥{formatPrice(opt.extra_price)}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-2 mt-2 border-t font-semibold">
              <span>总计</span>
              <span>¥{formatPrice(order.total_amount)}</span>
            </div>
          </div>

          {/* 备注 */}
          {order.note && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">备注</h4>
              <p className="text-sm text-orange-600 bg-orange-50 p-2 rounded">{order.note}</p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex space-x-3 pt-4 border-t">
            {nextStatus && (
              <button
                onClick={() => {
                  onStatusChange(order.id, nextStatus);
                  onClose();
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                {nextStatusLabel[nextStatus]}
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => {
                  onCancel(order.id);
                  onClose();
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50"
              >
                取消订单
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
