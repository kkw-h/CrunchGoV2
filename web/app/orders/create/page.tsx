"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetchProducts } from "@/lib/products";
import { createMerchantOrder } from "@/lib/orders";
import { Product, ProductOption, ProductOptionValue } from "@/types";

// 格式化价格（分 -> 元）
function formatPrice(price: number): string {
  return (price / 100).toFixed(2);
}

// 购物车项类型
interface CartItem {
  product: Product;
  quantity: number;
  selectedOptions: Map<string, ProductOptionValue>; // optionId -> value
}

export default function CreateOrderPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [pickupCode, setPickupCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 获取商品列表
  const { data: productsData, isLoading } = useSWR(
    "products-for-order",
    () => fetchProducts({ is_available: true }),
    { revalidateOnFocus: false }
  );

  const products = productsData?.items || [];

  // 过滤商品
  const filteredProducts = useMemo(() => {
    const items = products || [];
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  // 计算总价
  const totalAmount = useMemo(() => {
    let total = 0;
    cart.forEach((item) => {
      const optionsPrice = Array.from(item.selectedOptions.values()).reduce(
        (sum, opt) => sum + opt.extra_price,
        0
      );
      total += (item.product.price + optionsPrice) * item.quantity;
    });
    return total;
  }, [cart]);

  // 添加商品到购物车
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const newCart = new Map(prev);
      const existing = newCart.get(product.id);
      if (existing) {
        newCart.set(product.id, {
          ...existing,
          quantity: existing.quantity + 1,
        });
      } else {
        newCart.set(product.id, {
          product,
          quantity: 1,
          selectedOptions: new Map(),
        });
      }
      return newCart;
    });
  };

  // 更新数量
  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const newCart = new Map(prev);
      const item = newCart.get(productId);
      if (!item) return prev;

      const newQuantity = item.quantity + delta;
      if (newQuantity <= 0) {
        newCart.delete(productId);
      } else {
        newCart.set(productId, { ...item, quantity: newQuantity });
      }
      return newCart;
    });
  };

  // 移除商品
  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const newCart = new Map(prev);
      newCart.delete(productId);
      return newCart;
    });
  };

  // 选择选项
  const selectOption = (
    productId: string,
    option: ProductOption,
    value: ProductOptionValue
  ) => {
    setCart((prev) => {
      const newCart = new Map(prev);
      const item = newCart.get(productId);
      if (!item) return prev;

      const newOptions = new Map(item.selectedOptions);
      if (option.is_multiple) {
        // 多选：切换选择状态
        const currentValue = newOptions.get(option.id);
        if (currentValue?.id === value.id) {
          newOptions.delete(option.id);
        } else {
          newOptions.set(option.id, value);
        }
      } else {
        // 单选：直接替换
        newOptions.set(option.id, value);
      }

      newCart.set(productId, { ...item, selectedOptions: newOptions });
      return newCart;
    });
  };

  // 提交订单
  const handleSubmit = async () => {
    if (cart.size === 0) {
      alert("请选择至少一个商品");
      return;
    }

    setIsSubmitting(true);
    try {
      const items = Array.from(cart.values()).map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        options: Array.from(item.selectedOptions.entries()).map(
          ([optionId, value]) => ({
            option_id: optionId,
            value_id: value.id,
          })
        ),
      }));

      await createMerchantOrder({
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        note: note || undefined,
        pickup_code: pickupCode || undefined,
        items,
      });

      alert("订单创建成功！");
      router.push("/orders");
    } catch (err) {
      alert(err instanceof Error ? err.message : "创建订单失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航 */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link
                href="/orders"
                className="text-gray-600 hover:text-gray-900 mr-4"
              >
                ← 返回订单列表
              </Link>
              <h1 className="text-xl font-bold text-gray-900">代客下单</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：商品列表 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 搜索 */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <input
                type="text"
                placeholder="搜索商品..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* 商品列表 */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">选择商品</h2>
              </div>

              {isLoading ? (
                <div className="p-12 text-center text-gray-500">加载中...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  暂无商品
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredProducts.map((product) => {
                    const cartItem = cart.get(product.id);
                    return (
                      <div key={product.id} className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="text-base font-medium text-gray-900">
                                {product.name}
                              </h3>
                              <span className="text-lg font-semibold text-orange-600">
                                ¥{formatPrice(product.price)}
                              </span>
                            </div>
                            {product.description && (
                              <p className="mt-1 text-sm text-gray-500">
                                {product.description}
                              </p>
                            )}

                            {/* 选项 */}
                            {product.options.length > 0 && cartItem && (
                              <div className="mt-3 space-y-3">
                                {product.options.map((option) => (
                                  <div key={option.id}>
                                    <div className="text-sm font-medium text-gray-700 mb-2">
                                      {option.name}
                                      {option.is_required && (
                                        <span className="text-red-500 ml-1">*</span>
                                      )}
                                      {option.is_multiple && (
                                        <span className="text-gray-400 ml-1 text-xs">
                                          (多选)
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {option.values.map((value) => {
                                        const isSelected =
                                          cartItem.selectedOptions.get(
                                            option.id
                                          )?.id === value.id;
                                        return (
                                          <button
                                            key={value.id}
                                            onClick={() =>
                                              selectOption(
                                                product.id,
                                                option,
                                                value
                                              )
                                            }
                                            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                                              isSelected
                                                ? "bg-blue-50 border-blue-500 text-blue-700"
                                                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                                            }`}
                                          >
                                            {value.value}
                                            {value.extra_price > 0 && (
                                              <span className="text-orange-600 ml-1">
                                                +¥{formatPrice(value.extra_price)}
                                              </span>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* 数量控制 */}
                          <div className="flex items-center gap-3 ml-4">
                            {cartItem ? (
                              <>
                                <button
                                  onClick={() => updateQuantity(product.id, -1)}
                                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center font-medium">
                                  {cartItem.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(product.id, 1)}
                                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                                >
                                  +
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => addToCart(product)}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                              >
                                添加
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 右侧：订单信息 */}
          <div className="space-y-6">
            {/* 购物车摘要 */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">订单摘要</h2>
              </div>

              {cart.size === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  还未选择商品
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {Array.from(cart.values()).map((item) => (
                    <div
                      key={item.product.id}
                      className="flex justify-between items-start"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {item.product.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          x{item.quantity}
                        </div>
                        {item.selectedOptions.size > 0 && (
                          <div className="text-xs text-gray-400 mt-1">
                            {Array.from(item.selectedOptions.values()).map(
                              (opt) => opt.value
                            ).join(", ")}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-900">
                          ¥
                          {formatPrice(
                            (item.product.price +
                              Array.from(item.selectedOptions.values()).reduce(
                                (sum, opt) => sum + opt.extra_price,
                                0
                              )) *
                              item.quantity
                          )}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>总计</span>
                      <span className="text-orange-600">
                        ¥{formatPrice(totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 顾客信息 */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">顾客信息</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    顾客姓名
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="请输入顾客姓名（可选）"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    联系电话
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="请输入联系电话（可选）"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 订单设置 */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">订单设置</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    取餐码
                  </label>
                  <input
                    type="text"
                    value={pickupCode}
                    onChange={(e) => setPickupCode(e.target.value)}
                    placeholder="留空则自动生成"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    如需自定义取餐码，请输入（如：A001）
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    订单备注
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="请输入订单备注（可选）"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 提交按钮 */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || cart.size === 0}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "提交中..." : `创建订单 ¥${formatPrice(totalAmount)}`}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
