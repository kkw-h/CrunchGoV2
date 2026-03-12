// 订单状态
export type OrderStatus = "pending" | "preparing" | "ready" | "completed" | "cancelled";

// ============ 商品选项相关 ============

export interface ProductOptionValue {
  id: string;
  option_id: string;
  value: string;
  extra_price: number;
  sort_order: number;
  created_at: string;
}

export interface ProductOption {
  id: string;
  product_id: string;
  name: string;
  is_required: boolean;
  is_multiple: boolean;
  sort_order: number;
  values: ProductOptionValue[];
  created_at: string;
}

export interface ProductOptionValueCreate {
  value: string;
  extra_price?: number;
  sort_order?: number;
}

export interface ProductOptionCreate {
  name: string;
  is_required?: boolean;
  is_multiple?: boolean;
  sort_order?: number;
  values: ProductOptionValueCreate[];
}

export interface ProductOptionValueUpdate {
  value?: string;
  extra_price?: number;
  sort_order?: number;
}

export interface ProductOptionUpdate {
  name?: string;
  is_required?: boolean;
  is_multiple?: boolean;
  sort_order?: number;
}

// ============ 商品相关 ============

export interface Category {
  id: string;
  name: string;
  sort_order: number;
  product_count: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryCreate {
  name: string;
  sort_order?: number;
}

export interface CategoryUpdate {
  name?: string;
  sort_order?: number;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number; // 单位：分
  stock: number;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
  category_id: string | null;
  category: {
    id: string;
    name: string;
  } | null;
  options: ProductOption[];
  created_at: string;
  updated_at: string;
}

export interface ProductCreate {
  name: string;
  description?: string;
  price: number;
  stock?: number;
  image_url?: string;
  is_available?: boolean;
  sort_order?: number;
  category_id?: string | null;
  options?: ProductOptionCreate[];
}

export interface ProductUpdate {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  image_url?: string;
  is_available?: boolean;
  sort_order?: number;
  category_id?: string | null;
  options?: ProductOptionCreate[];
}

// ============ 订单选项相关 ============

export interface OrderItemOption {
  id: string;
  option_name: string;
  option_value: string;
  extra_price: number;
}

export interface OrderItemOptionCreate {
  option_id: string;
  value_id: string;
}

// ============ 订单相关 ============

export interface OrderItem {
  id: string;
  product_id: string | null;
  product_name: string;
  product_price: number;
  quantity: number;
  selected_options: OrderItemOption[];
}

export interface Order {
  id: string;
  order_number: string;
  pickup_code: string;
  status: OrderStatus;
  items: OrderItem[];
  total_amount: number;
  note?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface OrderCreate {
  customer_name?: string;
  customer_phone?: string;
  note?: string;
  items: {
    product_id: string;
    quantity: number;
    options?: OrderItemOptionCreate[];
  }[];
}

export interface OrderUpdate {
  customer_name?: string;
  customer_phone?: string;
  note?: string;
}

export interface OrderListResponse {
  items: Order[];
  total: number;
  page: number;
  page_size: number;
}

export interface QueueResponse {
  pending: Order[];
  preparing: Order[];
  ready: Order[];
}

// ============ 商家相关 ============

export interface BusinessHours {
  open: string;
  close: string;
}

export interface MerchantProfile {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  business_hours: BusinessHours;
  created_at: string;
  updated_at: string;
}

export interface MerchantProfileUpdate {
  name?: string;
  address?: string | null;
  phone?: string | null;
  business_hours?: BusinessHours;
}

export interface PickupCodeSettings {
  prefix: string;
  daily_reset: boolean;
}

export interface MerchantSettings {
  pickup_code: PickupCodeSettings;
  auto_print_order: boolean;
  quick_remarks: string[];
}

export interface MerchantSettingsUpdate {
  pickup_code?: PickupCodeSettings;
  auto_print_order?: boolean;
  quick_remarks?: string[];
}

export interface WechatConfig {
  app_id: string | null;
}

export interface WechatConfigUpdate {
  app_id?: string;
  app_secret?: string;
}

// ============ 通用响应 ============

export interface ListResponse<T> {
  items: T[];
  total: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 登录响应
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

// 查询参数
export interface ProductQueryParams {
  category_id?: string;
  is_available?: boolean;
  keyword?: string;
  skip?: number;
  limit?: number;
}
