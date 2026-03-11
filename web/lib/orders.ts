import { api } from "./api";
import {
  Order,
  OrderCreate,
  OrderListResponse,
  OrderStatus,
  OrderUpdate,
  QueueResponse,
} from "@/types";

// ============ 订单 API ============

export async function fetchOrders(params?: {
  status?: OrderStatus;
  pickup_code?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}): Promise<OrderListResponse> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    });
  }
  const query = searchParams.toString();
  const url = `/api/v1/orders${query ? `?${query}` : ""}`;

  const response = await api.get<OrderListResponse>(url);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}

export async function fetchQueue(): Promise<QueueResponse> {
  const response = await api.get<QueueResponse>("/api/v1/orders/queue");
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}

export async function fetchOrder(id: string): Promise<Order> {
  const response = await api.get<Order>(`/api/v1/orders/${id}`);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}

export async function createOrder(data: OrderCreate): Promise<Order> {
  const response = await api.post<Order>("/api/v1/orders", data);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}

export async function updateOrder(
  id: string,
  data: OrderUpdate
): Promise<Order> {
  const response = await api.put<Order>(`/api/v1/orders/${id}`, data);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<Order> {
  const response = await api.patch<Order>(`/api/v1/orders/${id}/status`, {
    status,
  });
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}

export async function callOrder(id: string): Promise<{
  id: string;
  pickup_code: string;
  message: string;
}> {
  const response = await api.post<{
    id: string;
    pickup_code: string;
    message: string;
  }>(`/api/v1/orders/${id}/call`, {});
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}

export async function cancelOrder(id: string): Promise<Order> {
  const response = await api.post<Order>(`/api/v1/orders/${id}/cancel`, {});
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}
