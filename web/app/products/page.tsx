"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import {
  fetchProducts,
  fetchCategories,
  deleteProduct,
  toggleProductStatus,
  updateProductStock,
} from "@/lib/products";
import { Product, ProductQueryParams } from "@/types";
import { ProductModal } from "@/components/products/ProductModal";
import { CategoryModal } from "@/components/products/CategoryModal";

// 格式化价格（分 -> 元）
function formatPrice(price: number): string {
  return (price / 100).toFixed(2);
}

export default function ProductsPage() {
  const { mutate } = useSWRConfig();
  const router = useRouter();
  const [queryParams, setQueryParams] = useState<ProductQueryParams>({
    skip: 0,
    limit: 20,
  });
  const [searchKeyword, setSearchKeyword] = useState("");

  // 商品列表数据
  const {
    data: productsData,
    error: productsError,
    isLoading: productsLoading,
  } = useSWR(
    ["products", queryParams],
    () => fetchProducts(queryParams),
    { refreshInterval: 30000 } // 30秒自动刷新
  );

  // 分类数据
  const { data: categoriesData } = useSWR("categories", fetchCategories, {
    refreshInterval: 60000,
  });

  // 弹窗状态
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [editingStock, setEditingStock] = useState<{
    id: string;
    name: string;
    stock: number;
  } | null>(null);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setQueryParams((prev) => ({
        ...prev,
        keyword: searchKeyword || undefined,
        skip: 0,
      }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // 处理分类过滤
  const handleCategoryFilter = (categoryId: string | null) => {
    setQueryParams((prev) => ({
      ...prev,
      category_id: categoryId || undefined,
      skip: 0,
    }));
  };

  // 处理状态过滤
  const handleStatusFilter = (status: string | null) => {
    setQueryParams((prev) => ({
      ...prev,
      is_available:
        status === null ? undefined : status === "available" ? true : false,
      skip: 0,
    }));
  };

  // 删除商品
  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`确定要删除商品「${product.name}」吗？`)) {
      return;
    }
    try {
      await deleteProduct(product.id);
      mutate(["products", queryParams]);
      alert("删除成功");
    } catch (error) {
      alert(error instanceof Error ? error.message : "删除失败");
    }
  };

  // 切换商品状态
  const handleToggleStatus = async (product: Product) => {
    try {
      await toggleProductStatus(product.id);
      mutate(["products", queryParams]);
    } catch (error) {
      alert(error instanceof Error ? error.message : "操作失败");
    }
  };

  // 更新库存
  const handleUpdateStock = async () => {
    if (!editingStock) return;
    try {
      await updateProductStock(editingStock.id, editingStock.stock);
      mutate(["products", queryParams]);
      setEditingStock(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "更新库存失败");
    }
  };

  // 打开编辑弹窗
  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  // 打开新建弹窗
  const openCreateModal = () => {
    setEditingProduct(undefined);
    setIsProductModalOpen(true);
  };

  const products = productsData?.items || [];
  const categories = categoriesData?.items || [];
  const total = productsData?.total || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
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
              <h1 className="text-xl font-bold text-gray-900">商品管理</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                分类管理
              </button>
              <button
                onClick={openCreateModal}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                + 新建商品
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 过滤栏 */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6 space-y-4">
          <div className="flex flex-wrap gap-4">
            {/* 搜索 */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="搜索商品名称..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* 分类过滤 */}
            <select
              value={queryParams.category_id || ""}
              onChange={(e) => handleCategoryFilter(e.target.value || null)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部分类</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            {/* 状态过滤 */}
            <select
              value={
                queryParams.is_available === undefined
                  ? ""
                  : queryParams.is_available
                  ? "available"
                  : "unavailable"
              }
              onChange={(e) =>
                handleStatusFilter(e.target.value ? e.target.value : null)
              }
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部状态</option>
              <option value="available">上架中</option>
              <option value="unavailable">已下架</option>
            </select>

            {/* 重置按钮 */}
            <button
              onClick={() => {
                setSearchKeyword("");
                setQueryParams({ skip: 0, limit: 20 });
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              重置
            </button>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="mb-4 text-sm text-gray-600">
          共 <span className="font-medium">{total}</span> 件商品
          {productsLoading && <span className="ml-2">加载中...</span>}
        </div>

        {/* 商品列表 */}
        {productsError ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-red-600">
            加载失败: {productsError.message}
          </div>
        ) : products.length === 0 && !productsLoading ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
            暂无商品，点击「新建商品」添加
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    商品信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    分类
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    价格
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    库存
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    选项
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 bg-gray-200 rounded-lg flex items-center justify-center">
                          {product.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <svg
                              className="h-6 w-6 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {product.name}
                          </div>
                          {product.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {product.category?.name || "未分类"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        ¥{formatPrice(product.price)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() =>
                          setEditingStock({
                            id: product.id,
                            name: product.name,
                            stock: product.stock,
                          })
                        }
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {product.stock}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.options.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {product.options.map((opt) => (
                            <span
                              key={opt.id}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800"
                              title={opt.values.map((v) => v.value).join(", ")}
                            >
                              {opt.name}
                              {opt.is_required && <span className="text-red-500 ml-0.5">*</span>}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(product)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.is_available
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {product.is_available ? "上架中" : "已下架"}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(product)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product)}
                        className="text-red-600 hover:text-red-900"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* 商品编辑弹窗 */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={editingProduct}
        categories={categories}
        onSuccess={() => {
          mutate(["products", queryParams], undefined, { revalidate: true });
          router.refresh();
          setIsProductModalOpen(false);
        }}
      />

      {/* 分类管理弹窗 */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onSuccess={() => {
          mutate("categories");
        }}
      />

      {/* 库存编辑弹窗 */}
      {editingStock && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              修改库存 - {editingStock.name}
            </h3>
            <input
              type="number"
              min={0}
              value={editingStock.stock}
              onChange={(e) =>
                setEditingStock({
                  ...editingStock,
                  stock: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => setEditingStock(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                取消
              </button>
              <button
                onClick={handleUpdateStock}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
