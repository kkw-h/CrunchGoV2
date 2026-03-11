"use client";

import { useState, useEffect } from "react";
import { createProduct, updateProduct } from "@/lib/products";
import { Product, ProductCreate, Category, ProductOptionCreate, ProductOptionValueCreate } from "@/types";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product;
  categories: Category[];
  onSuccess: () => void;
}

export function ProductModal({
  isOpen,
  onClose,
  product,
  categories,
  onSuccess,
}: ProductModalProps) {
  const isEditing = !!product;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"basic" | "options">("basic");

  const [formData, setFormData] = useState<ProductCreate>({
    name: "",
    description: "",
    price: 0,
    stock: 0,
    image_url: "",
    is_available: true,
    sort_order: 0,
    category_id: null,
    options: [],
  });

  // 价格显示（元）
  const [priceYuan, setPriceYuan] = useState("");

  // 选项编辑状态
  const [options, setOptions] = useState<ProductOptionCreate[]>([]);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || "",
        price: product.price,
        stock: product.stock,
        image_url: product.image_url || "",
        is_available: product.is_available,
        sort_order: product.sort_order,
        category_id: product.category_id,
        options: [],
      });
      setPriceYuan((product.price / 100).toFixed(2));
      // 转换已有选项为编辑格式
      setOptions(product.options.map(opt => ({
        name: opt.name,
        is_required: opt.is_required,
        is_multiple: opt.is_multiple,
        sort_order: opt.sort_order,
        values: opt.values.map(v => ({
          value: v.value,
          extra_price: v.extra_price,
          sort_order: v.sort_order,
        })),
      })));
    } else {
      setFormData({
        name: "",
        description: "",
        price: 0,
        stock: 0,
        image_url: "",
        is_available: true,
        sort_order: 0,
        category_id: null,
        options: [],
      });
      setPriceYuan("");
      setOptions([]);
    }
    setError(null);
    setActiveTab("basic");
  }, [product, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 构建提交数据，确保包含所有字段
      const submitData = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        stock: formData.stock,
        image_url: formData.image_url,
        is_available: formData.is_available,
        sort_order: formData.sort_order,
        category_id: formData.category_id,
        options: options.map(opt => ({
          name: opt.name,
          is_required: opt.is_required,
          is_multiple: opt.is_multiple,
          sort_order: opt.sort_order,
          values: opt.values.map(v => ({
            value: v.value,
            extra_price: v.extra_price,
            sort_order: v.sort_order,
          })),
        })),
      };
      console.log('Submitting product data:', submitData);
      if (isEditing && product) {
        await updateProduct(product.id, submitData);
      } else {
        await createProduct(submitData);
      }
      onSuccess();
    } catch (err) {
      console.error('Submit error:', err);
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (value: string) => {
    setPriceYuan(value);
    const yuan = parseFloat(value);
    if (!isNaN(yuan) && yuan >= 0) {
      setFormData((prev) => ({ ...prev, price: Math.round(yuan * 100) }));
    }
  };

  // 添加新选项
  const addOption = () => {
    setOptions([...options, {
      name: "",
      is_required: false,
      is_multiple: false,
      sort_order: options.length,
      values: [],
    }]);
  };

  // 更新选项
  const updateOption = (index: number, field: keyof ProductOptionCreate, value: unknown) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setOptions(newOptions);
  };

  // 删除选项
  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  // 添加选项值
  const addOptionValue = (optionIndex: number) => {
    setOptions(prev => prev.map((opt, i) => {
      if (i !== optionIndex) return opt;
      return {
        ...opt,
        values: [...opt.values, {
          value: "",
          extra_price: 0,
          sort_order: opt.values.length,
        }]
      };
    }));
  };

  // 更新选项值
  const updateOptionValue = (optionIndex: number, valueIndex: number, field: keyof ProductOptionValueCreate, value: unknown) => {
    setOptions(prev => prev.map((opt, i) => {
      if (i !== optionIndex) return opt;
      return {
        ...opt,
        values: opt.values.map((v, j) => {
          if (j !== valueIndex) return v;
          return { ...v, [field]: value };
        })
      };
    }));
  };

  // 删除选项值
  const removeOptionValue = (optionIndex: number, valueIndex: number) => {
    setOptions(prev => prev.map((opt, i) => {
      if (i !== optionIndex) return opt;
      return {
        ...opt,
        values: opt.values.filter((_, j) => j !== valueIndex)
      };
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {isEditing ? "编辑商品" : "新建商品"}
          </h3>
        </div>

        {/* 标签页 */}
        <div className="px-6 pt-4 border-b border-gray-200">
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setActiveTab("basic")}
              className={`pb-2 px-1 text-sm font-medium border-b-2 ${
                activeTab === "basic"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              基本信息
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("options")}
              className={`pb-2 px-1 text-sm font-medium border-b-2 ${
                activeTab === "options"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              商品选项 {options.length > 0 && `(${options.length})`}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {activeTab === "basic" ? (
            <>
              {/* 商品名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  商品名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入商品名称"
                />
              </div>

              {/* 分类 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  分类
                </label>
                <select
                  value={formData.category_id || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category_id: e.target.value || null,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">未分类</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 价格和库存 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    价格（元） <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={priceYuan}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    库存
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        stock: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 商品描述 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  商品描述
                </label>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入商品描述"
                />
              </div>

              {/* 图片URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  图片链接
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, image_url: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
                <p className="mt-1 text-xs text-gray-500">
                  支持外部图片链接，留空则使用默认图标
                </p>
              </div>

              {/* 排序和状态 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    排序
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.sort_order}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        sort_order: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">数字越小越靠前</p>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_available}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          is_available: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">立即上架</span>
                  </label>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 选项管理 */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    添加商品选项，如辣度、加料、规格等
                  </p>
                  <button
                    type="button"
                    onClick={addOption}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                  >
                    + 添加选项
                  </button>
                </div>

                {options.length === 0 && (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    暂无选项，点击上方按钮添加
                  </div>
                )}

                {options.map((option, optionIndex) => (
                  <div key={optionIndex} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="选项名称，如：辣度"
                          value={option.name}
                          onChange={(e) => updateOption(optionIndex, "name", e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          placeholder="排序"
                          value={option.sort_order}
                          onChange={(e) => updateOption(optionIndex, "sort_order", parseInt(e.target.value) || 0)}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 w-24"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeOption(optionIndex)}
                        className="ml-2 text-red-600 hover:text-red-800"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-center space-x-4 mb-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={option.is_required}
                          onChange={(e) => updateOption(optionIndex, "is_required", e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">必选</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={option.is_multiple}
                          onChange={(e) => updateOption(optionIndex, "is_multiple", e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">可多选</span>
                      </label>
                    </div>

                    {/* 选项值 */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">选项值：</div>
                      {option.values.map((value, valueIndex) => (
                        <div key={valueIndex} className="flex items-center space-x-2">
                          <input
                            type="text"
                            placeholder="值，如：微辣"
                            value={value.value}
                            onChange={(e) => updateOptionValue(optionIndex, valueIndex, "value", e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                          <input
                            type="number"
                            placeholder="加价"
                            value={(value.extra_price || 0) / 100}
                            onChange={(e) => updateOptionValue(optionIndex, valueIndex, "extra_price", Math.round(parseFloat(e.target.value) * 100) || 0)}
                            className="w-24 px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                          <span className="text-sm text-gray-500">元</span>
                          <input
                            type="number"
                            placeholder="排序"
                            value={value.sort_order || 0}
                            onChange={(e) => updateOptionValue(optionIndex, valueIndex, "sort_order", parseInt(e.target.value) || 0)}
                            className="w-16 px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => removeOptionValue(optionIndex, valueIndex)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addOptionValue(optionIndex)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        + 添加选项值
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 按钮 */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
