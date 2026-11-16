import { apiClient } from './apiClient';

// =====================================================================
// ĐƠN HÀNG CỦA TÔI (người mua) — API thật
//   GET  /orders?limit=&offset=         -> SliceResponse<OrderSummaryResponse>
//   GET  /orders/{orderId}              -> OrderResponse (shops[] = các shop order, mỗi shop 1 kiện)
//   POST /orders/{orderId}/cancel       -> OrderResponse  (body { reason } hoặc rỗng)
// =====================================================================

export const ORDERS_PAGE_SIZE = 20;

export function getMyOrders({ limit = ORDERS_PAGE_SIZE, offset = 0 } = {}) {
  return apiClient.get(`/orders?limit=${limit}&offset=${offset}`);
}

export function getMyOrder(orderId) {
  return apiClient.get(`/orders/${encodeURIComponent(orderId)}`);
}

export function cancelMyOrder(orderId, reason) {
  const text = reason?.trim();
  return apiClient.post(`/orders/${encodeURIComponent(orderId)}/cancel`, text ? { reason: text } : {});
}

// Backend chỉ cho hủy khi đơn đang PENDING_PAYMENT / CONFIRMED (shop chưa xử lý)
export const CANCELLABLE_ORDER_STATUSES = ['PENDING_PAYMENT', 'CONFIRMED'];
// Đánh giá: chỉ dòng hàng của shop order đã giao
export const REVIEWABLE_SHOP_ORDER_STATUSES = ['DELIVERED', 'COMPLETED'];
// Trả hàng: shop order đã hoàn thành (trong hạn trả hàng của shop)
export const RETURNABLE_SHOP_ORDER_STATUSES = ['COMPLETED', 'RETURNED'];
