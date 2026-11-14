import { cancelMockOrder, findMockOrder, listMockOrders } from './mockOrderStore';

// =====================================================================
// ĐƠN HÀNG CỦA TÔI (người mua) — hiện dùng KHO ĐƠN GIẢ LẬP của frontend (services/mockOrderStore.js).
// Dữ liệu trả về đúng dạng backend, nên sau này đổi sang API thật chỉ cần thay thân các hàm dưới:
//   GET  /orders?limit=&offset=         -> SliceResponse<OrderSummaryResponse>
//   GET  /orders/{orderId}              -> OrderResponse
//   POST /orders/{orderId}/cancel       -> OrderResponse  (body { reason } hoặc rỗng)
// =====================================================================

export const ORDERS_PAGE_SIZE = 20;

const wait = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
const notFound = () => Object.assign(new Error('Order not found'), { status: 404, code: 'ORDER_NOT_FOUND' });

export async function getMyOrders({ limit = ORDERS_PAGE_SIZE, offset = 0 } = {}) {
  await wait();
  return listMockOrders({ limit, offset });
}

export async function getMyOrder(orderId) {
  await wait();
  const order = findMockOrder(orderId);
  if (!order) throw notFound();
  return order;
}

export async function cancelMyOrder(orderId, reason) {
  await wait(400);
  const order = findMockOrder(orderId);
  if (!order) throw notFound();
  if (!CANCELLABLE_ORDER_STATUSES.includes(order.status)) {
    throw Object.assign(new Error('Not cancellable'), { status: 409, code: 'ORDER_NOT_CANCELLABLE' });
  }
  return cancelMockOrder(orderId, reason?.trim() || null);
}

// Backend chỉ cho hủy khi đơn đang PENDING_PAYMENT / CONFIRMED (shop chưa xử lý)
export const CANCELLABLE_ORDER_STATUSES = ['PENDING_PAYMENT', 'CONFIRMED'];
// Đánh giá: chỉ dòng hàng của shop order đã giao
export const REVIEWABLE_SHOP_ORDER_STATUSES = ['DELIVERED', 'COMPLETED'];
// Trả hàng: shop order đã hoàn thành
export const RETURNABLE_SHOP_ORDER_STATUSES = ['COMPLETED', 'RETURNED'];
