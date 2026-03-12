"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import { fetchQueue, updateOrderStatus, callOrder, createOrder } from "@/lib/orders";
import { fetchProducts } from "@/lib/products";
import { Order, OrderStatus, Product } from "@/types";

// 格式化价格（分 -> 元）
function formatPrice(price: number): string {
  return (price / 100).toFixed(2);
}

// 格式化时间
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusConfig = {
  pending: {
    title: "待制作",
    color: "bg-yellow-50 border-yellow-200",
    badgeColor: "bg-yellow-100 text-yellow-800",
    actionText: "开始制作",
    actionColor: "bg-blue-600 hover:bg-blue-700",
    nextStatus: "preparing" as OrderStatus,
  },
  preparing: {
    title: "制作中",
    color: "bg-blue-50 border-blue-200",
    badgeColor: "bg-blue-100 text-blue-800",
    actionText: "完成制作",
    actionColor: "bg-green-600 hover:bg-green-700",
    nextStatus: "ready" as OrderStatus,
  },
  ready: {
    title: "待取餐",
    color: "bg-green-50 border-green-200",
    badgeColor: "bg-green-100 text-green-800",
    actionText: "叫号",
    actionColor: "bg-purple-600 hover:bg-purple-700",
    nextStatus: null,
  },
};

export default function QueuePage() {
  const { mutate } = useSWRConfig();
  const [useWebSocket, setUseWebSocket] = useState(true);
  const [wsStatus, setWsStatus] = useState<"connected" | "disconnected" | "connecting">("disconnected");
  const [callingOrder, setCallingOrder] = useState<string | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  // 获取队列数据
  const { data: queueData, error, isLoading } = useSWR(
    "queue",
    fetchQueue,
    {
      refreshInterval: useWebSocket && wsStatus === "connected" ? 0 : 5000, // WebSocket 连接成功时禁用轮询，否则使用轮询
      revalidateOnFocus: true, // 总是启用焦点重新验证
      refreshWhenHidden: false,
    }
  );

  const queue = queueData || { pending: [], preparing: [], ready: [] };

  // WebSocket 连接
  const connectWebSocket = useCallback(() => {
    if (!useWebSocket) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setWsStatus("connecting");

    // 确定 WebSocket URL
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // 开发环境使用后端地址，生产环境使用当前 host
    const isDev = process.env.NODE_ENV === "development";
    const wsHost = isDev ? "localhost:8000" : window.location.host;
    const wsUrl = `${protocol}//${wsHost}/ws`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setWsStatus("connected");
      reconnectAttempts.current = 0; // 重置重连次数
      console.log("WebSocket 已连接");
      // 发送心跳
      const heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send("ping");
        }
      }, 30000);
      wsRef.current = ws;
      (ws as unknown as { heartbeat: NodeJS.Timeout }).heartbeat = heartbeat;
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "queue_update") {
          // 更新队列数据
          mutate("queue", message.data, false);
        } else if (message.type === "order_update") {
          // 订单更新，重新获取队列
          mutate("queue");
        }
      } catch {
        // 忽略非 JSON 消息
      }
    };

    ws.onclose = () => {
      setWsStatus("disconnected");
      // 清理心跳
      const hb = (ws as unknown as { heartbeat?: NodeJS.Timeout }).heartbeat;
      if (hb) clearInterval(hb);
      // 自动重连（最多重试5次）
      if (useWebSocket && reconnectAttempts.current < 5) {
        reconnectAttempts.current++;
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      }
    };

    ws.onerror = () => {
      setWsStatus("disconnected");
      ws.close();
    };
  }, [useWebSocket, mutate]);

  // 注册 Service Worker（覆盖可能存在的旧 SW）
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration);
        })
        .catch((err) => {
          console.log('SW registration failed:', err);
        });
    }
  }, []);

  // 初始化 WebSocket
  useEffect(() => {
    if (useWebSocket) {
      connectWebSocket();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        const hb = (wsRef.current as unknown as { heartbeat?: NodeJS.Timeout }).heartbeat;
        if (hb) clearInterval(hb);
        wsRef.current.close();
      }
    };
  }, [useWebSocket, connectWebSocket]);

  // 更新订单状态
  const handleStatusChange = async (
    orderId: string,
    newStatus: OrderStatus
  ) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      mutate("queue");
    } catch (error) {
      alert(error instanceof Error ? error.message : "操作失败");
    }
  };

  // 叫号
  const handleCallOrder = async (orderId: string) => {
    try {
      setCallingOrder(orderId);
      const result = await callOrder(orderId);
      alert(result.message);
      mutate("queue");
    } catch (error) {
      alert(error instanceof Error ? error.message : "叫号失败");
    } finally {
      setCallingOrder(null);
    }
  };

  // 完成订单（已取餐）
  const handleComplete = async (orderId: string) => {
    if (!confirm("确认顾客已取餐？")) return;
    try {
      await updateOrderStatus(orderId, "completed");
      mutate("queue");
    } catch (error) {
      alert(error instanceof Error ? error.message : "操作失败");
    }
  };

  const totalOrders =
    queue.pending.length + queue.preparing.length + queue.ready.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航 */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 mr-4"
              >
                ← 返回
              </Link>
              <h1 className="text-xl font-bold text-gray-900">排队队列</h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* WebSocket 状态指示 */}
              {useWebSocket && (
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      wsStatus === "connected"
                        ? "bg-green-500"
                        : wsStatus === "connecting"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                  />
                  <span className="text-sm text-gray-600">
                    {wsStatus === "connected"
                      ? "实时"
                      : wsStatus === "connecting"
                      ? "连接中..."
                      : "离线"}
                  </span>
                </div>
              )}
              {/* WebSocket 开关 */}
              <label className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useWebSocket}
                  onChange={(e) => setUseWebSocket(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>WebSocket</span>
              </label>
              {/* 测试下单按钮 */}
              <button
                onClick={() => setShowTestModal(true)}
                className="text-sm bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700"
              >
                + 测试下单
              </button>
              <button
                onClick={() => mutate("queue")}
                className="text-sm text-blue-600 hover:text-blue-800"
                disabled={isLoading}
              >
                {isLoading ? "刷新中..." : "刷新"}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 统计信息 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
          <div className="flex space-x-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {queue.pending.length}
              </div>
              <div className="text-xs text-gray-500">待制作</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {queue.preparing.length}
              </div>
              <div className="text-xs text-gray-500">制作中</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {queue.ready.length}
              </div>
              <div className="text-xs text-gray-500">待取餐</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{totalOrders}</div>
            <div className="text-xs text-gray-500">总订单</div>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            加载失败: {error.message}
          </div>
        </div>
      )}

      {/* WebSocket 断开提示 */}
      {useWebSocket && wsStatus === "disconnected" && !error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 rounded-lg text-sm flex items-center justify-between">
            <span>实时连接已断开，正在使用轮询模式（每5秒刷新）</span>
            <button
              onClick={() => {
                reconnectAttempts.current = 0;
                connectWebSocket();
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              重新连接
            </button>
          </div>
        </div>
      )}

      {/* 队列看板 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {(Object.keys(statusConfig) as Array<keyof typeof statusConfig>).map(
            (status) => (
              <div
                key={status}
                className={`rounded-lg border-2 ${statusConfig[status].color} p-4 min-h-[500px]`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">
                    {statusConfig[status].title}
                  </h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[status].badgeColor}`}
                  >
                    {queue[status].length} 单
                  </span>
                </div>

                <div className="space-y-3">
                  {queue[status].map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      status={status}
                      onStatusChange={handleStatusChange}
                      onCall={handleCallOrder}
                      onComplete={handleComplete}
                      isCalling={callingOrder === order.id}
                    />
                  ))}
                  {queue[status].length === 0 && (
                    <div className="text-center py-12 text-gray-400 bg-white/50 rounded-lg">
                      暂无订单
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </main>

      {/* 测试下单弹窗 */}
      {showTestModal && (
        <TestOrderModal
          onClose={() => setShowTestModal(false)}
          onSuccess={() => {
            mutate("queue");
            setShowTestModal(false);
          }}
        />
      )}
    </div>
  );
}

// 测试下单弹窗组件
interface TestOrderModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function TestOrderModal({ onClose, onSuccess }: TestOrderModalProps) {
  const { data: products } = useSWR("products", fetchProducts);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [customerName, setCustomerName] = useState("测试顾客");
  const [customerPhone, setCustomerPhone] = useState("13800138000");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 过滤出有库存且上架的商品
  const availableProducts = products?.items.filter(
    (p) => p.is_available && p.stock > 0
  ) || [];

  const handleOptionChange = (optionId: string, valueId: string) => {
    setSelectedOptions((prev) => ({ ...prev, [optionId]: valueId }));
  };

  const handleSubmit = async () => {
    if (!selectedProduct) {
      alert("请选择商品");
      return;
    }

    // 检查必选项
    for (const option of selectedProduct.options) {
      if (option.is_required && !selectedOptions[option.id]) {
        alert(`请选择 ${option.name}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const options = Object.entries(selectedOptions).map(([optionId, valueId]) => ({
        option_id: optionId,
        value_id: valueId,
      }));

      await createOrder({
        customer_name: customerName,
        customer_phone: customerPhone,
        note: note || undefined,
        items: [
          {
            product_id: selectedProduct.id,
            quantity,
            options: options.length > 0 ? options : undefined,
          },
        ],
      });

      onSuccess();
    } catch (error) {
      alert(error instanceof Error ? error.message : "下单失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 计算总价
  const calculateTotal = () => {
    if (!selectedProduct) return 0;
    let total = selectedProduct.price * quantity;
    for (const [optionId, valueId] of Object.entries(selectedOptions)) {
      const option = selectedProduct.options.find((o) => o.id === optionId);
      const value = option?.values.find((v) => v.id === valueId);
      if (value) {
        total += value.extra_price * quantity;
      }
    }
    return total;
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">测试下单</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>

          {/* 选择商品 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择商品 <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedProduct?.id || ""}
              onChange={(e) => {
                const product = availableProducts.find((p) => p.id === e.target.value);
                setSelectedProduct(product || null);
                setSelectedOptions({});
              }}
            >
              <option value="">请选择商品</option>
              {availableProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - ¥{formatPrice(product.price)} (库存: {product.stock})
                </option>
              ))}
            </select>
            {availableProducts.length === 0 && (
              <p className="mt-2 text-sm text-orange-600">
                暂无可用商品，请先在商品管理中添加商品
              </p>
            )}
          </div>

          {/* 数量 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">数量</label>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
              >
                -
              </button>
              <span className="text-lg font-medium w-8 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
              >
                +
              </button>
            </div>
          </div>

          {/* 商品选项 */}
          {selectedProduct?.options.map((option) => (
            <div key={option.id} className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {option.name}
                {option.is_required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <div className="flex flex-wrap gap-2">
                {option.values.map((value) => (
                  <button
                    key={value.id}
                    onClick={() => handleOptionChange(option.id, value.id)}
                    className={`px-3 py-1.5 rounded-full text-sm border ${
                      selectedOptions[option.id] === value.id
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:border-blue-500"
                    }`}
                  >
                    {value.value}
                    {value.extra_price > 0 && (
                      <span className={selectedOptions[option.id] === value.id ? "text-blue-100" : "text-orange-600"}>
                        {" "}+¥{formatPrice(value.extra_price)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* 顾客信息 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">顾客姓名</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入顾客姓名"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">顾客电话</label>
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入顾客电话"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">备注</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入备注（可选）"
            />
          </div>

          {/* 总价 */}
          {selectedProduct && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">总价</span>
                <span className="text-2xl font-bold text-orange-600">¥{formatPrice(calculateTotal())}</span>
              </div>
            </div>
          )}

          {/* 按钮 */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedProduct}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "提交中..." : "确认下单"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 订单卡片组件
interface OrderCardProps {
  order: Order;
  status: "pending" | "preparing" | "ready";
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onCall: (orderId: string) => void;
  onComplete: (orderId: string) => void;
  isCalling: boolean;
}

function OrderCard({
  order,
  status,
  onStatusChange,
  onCall,
  onComplete,
  isCalling,
}: OrderCardProps) {
  const config = statusConfig[status];

  // 计算单项小计（包含选项加价）
  const calculateItemSubtotal = (item: Order["items"][0]) => {
    const optionsPrice = item.selected_options.reduce((sum, opt) => sum + opt.extra_price, 0);
    return (item.product_price + optionsPrice) * item.quantity;
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border hover:shadow-md transition-shadow">
      {/* 头部：取餐码和时间 */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-3xl font-bold text-gray-900">
          {order.pickup_code}
        </span>
        <span className="text-xs text-gray-500">
          {formatTime(order.created_at)}
        </span>
      </div>

      {/* 顾客信息 */}
      {(order.customer_name || order.customer_phone) && (
        <div className="mb-2 text-sm text-gray-600">
          {order.customer_name && (
            <span className="font-medium">{order.customer_name}</span>
          )}
          {order.customer_phone && (
            <span className="ml-2 text-gray-500">{order.customer_phone}</span>
          )}
        </div>
      )}

      {/* 订单商品 */}
      <ul className="text-sm text-gray-700 mb-3 space-y-2">
        {order.items.map((item) => (
          <li key={item.id} className="border-b border-gray-100 pb-2 last:border-0 last:pb-0">
            <div className="flex justify-between">
              <span className="font-medium">
                {item.product_name} x{item.quantity}
              </span>
              <span className="text-gray-500">
                ¥{formatPrice(calculateItemSubtotal(item))}
              </span>
            </div>
            {/* 显示选项 */}
            {item.selected_options.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {item.selected_options.map((opt) => (
                  <span
                    key={opt.id}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                  >
                    {opt.option_name}: {opt.option_value}
                    {opt.extra_price > 0 && (
                      <span className="text-orange-600 ml-0.5">
                        +¥{formatPrice(opt.extra_price)}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* 备注 */}
      {order.note && (
        <div className="mb-3 text-xs text-orange-600 bg-orange-50 p-2 rounded">
          备注: {order.note}
        </div>
      )}

      {/* 总计 */}
      <div className="flex justify-between items-center mb-3 pt-2 border-t">
        <span className="text-xs text-gray-500">订单号: {order.order_number}</span>
        <span className="font-semibold text-gray-900">
          ¥{formatPrice(order.total_amount)}
        </span>
      </div>

      {/* 操作按钮 */}
      <div className="flex space-x-2">
        {status === "ready" ? (
          <>
            <button
              onClick={() => onCall(order.id)}
              disabled={isCalling}
              className="flex-1 bg-purple-600 text-white text-sm py-2 rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {isCalling ? "叫号中..." : "叫号"}
            </button>
            <button
              onClick={() => onComplete(order.id)}
              className="flex-1 bg-gray-600 text-white text-sm py-2 rounded hover:bg-gray-700"
            >
              已取餐
            </button>
          </>
        ) : (
          <button
            onClick={() =>
              config.nextStatus && onStatusChange(order.id, config.nextStatus)
            }
            className={`flex-1 text-white text-sm py-2 rounded ${config.actionColor}`}
          >
            {config.actionText}
          </button>
        )}
      </div>
    </div>
  );
}
