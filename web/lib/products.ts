import { api } from "./api";
import {
  Category,
  CategoryCreate,
  CategoryUpdate,
  ListResponse,
  Product,
  ProductCreate,
  ProductOption,
  ProductOptionCreate,
  ProductOptionUpdate,
  ProductOptionValue,
  ProductOptionValueCreate,
  ProductQueryParams,
  ProductUpdate,
} from "@/types";

// ============ 分类 API ============

export async function fetchCategories(): Promise<ListResponse<Category>> {
  const response = await api.get<ListResponse<Category>>("/api/v1/categories");
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}

export async function createCategory(data: CategoryCreate): Promise<Category> {
  const response = await api.post<Category>("/api/v1/categories", data);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}

export async function updateCategory(
  id: string,
  data: CategoryUpdate
): Promise<Category> {
  const response = await api.put<Category>(`/api/v1/categories/${id}`, data);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}

export async function deleteCategory(id: string): Promise<void> {
  const response = await api.delete<void>(`/api/v1/categories/${id}`);
  if (response.error) {
    throw new Error(response.error);
  }
}

// ============ 商品 API ============

export async function fetchProducts(
  params?: ProductQueryParams
): Promise<ListResponse<Product>> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    });
  }
  const query = searchParams.toString();
  const url = `/api/v1/products${query ? `?${query}` : ""}`;

  const response = await api.get<ListResponse<Product>>(url);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}

export async function fetchProduct(id: string): Promise<Product> {
  const response = await api.get<Product>(`/api/v1/products/${id}`);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}

export async function createProduct(data: ProductCreate): Promise<Product> {
  const response = await api.post<Product>("/api/v1/products", data);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}

export async function updateProduct(
  id: string,
  data: ProductUpdate
): Promise<Product> {
  console.log('updateProduct called with:', JSON.stringify(data, null, 2));
  const response = await api.put<Product>(`/api/v1/products/${id}`, data);
  console.log('updateProduct response:', response);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}

export async function deleteProduct(id: string): Promise<void> {
  const response = await api.delete<void>(`/api/v1/products/${id}`);
  if (response.error) {
    throw new Error(response.error);
  }
}

export async function toggleProductStatus(id: string): Promise<Product> {
  const response = await api.patch<Product>(
    `/api/v1/products/${id}/toggle-status`,
    {}
  );
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}

export async function updateProductStock(
  id: string,
  stock: number
): Promise<Product> {
  const response = await api.patch<Product>(
    `/api/v1/products/${id}/stock?stock=${stock}`,
    {}
  );
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}

// ============ 商品选项 API ============

export async function createProductOption(
  productId: string,
  data: ProductOptionCreate
): Promise<ProductOption> {
  const response = await api.post<ProductOption>(
    `/api/v1/products/${productId}/options`,
    data
  );
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}

export async function updateProductOption(
  productId: string,
  optionId: string,
  data: ProductOptionUpdate
): Promise<ProductOption> {
  const response = await api.put<ProductOption>(
    `/api/v1/products/${productId}/options/${optionId}`,
    data
  );
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}

export async function deleteProductOption(
  productId: string,
  optionId: string
): Promise<void> {
  const response = await api.delete<void>(
    `/api/v1/products/${productId}/options/${optionId}`
  );
  if (response.error) {
    throw new Error(response.error);
  }
}

// ============ 选项值 API ============

export async function createOptionValue(
  productId: string,
  optionId: string,
  data: ProductOptionValueCreate
): Promise<ProductOptionValue> {
  const response = await api.post<ProductOptionValue>(
    `/api/v1/products/${productId}/options/${optionId}/values`,
    data
  );
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}

export async function updateOptionValue(
  productId: string,
  optionId: string,
  valueId: string,
  data: ProductOptionValueCreate
): Promise<ProductOptionValue> {
  const response = await api.put<ProductOptionValue>(
    `/api/v1/products/${productId}/options/${optionId}/values/${valueId}`,
    data
  );
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}

export async function deleteOptionValue(
  productId: string,
  optionId: string,
  valueId: string
): Promise<void> {
  const response = await api.delete<void>(
    `/api/v1/products/${productId}/options/${optionId}/values/${valueId}`
  );
  if (response.error) {
    throw new Error(response.error);
  }
}
