import { apiClient } from '../apiClient';
import { enc, fetchAllSlices, MAX_PAGE } from './constants';

// =====================================================================
// ĐƠN HÀNG CỦA SHOP — API thật
//   GET  /shops/{shopId}/orders?status=&limit=&offset=      -> SliceResponse<ShopOrderSummaryResponse>
//   GET  /shops/{shopId}/orders/{shopOrderId}               -> ShopOrderDetailResponse
//   POST .../{id}/confirm        { sellerNote? }            PENDING_CONFIRMATION -> PROCESSING
//   POST .../{id}/ready-to-ship                             PROCESSING -> READY_TO_SHIP
//   POST .../{id}/cancel         { reason }                 hoàn kho
//   POST .../{id}/dispatch       { carrierCode, serviceCode?, trackingNumber?, estimatedDeliveryAt? }  READY_TO_SHIP -> SHIPPED
//   POST .../{id}/shipment-status { status, location?, description?, occurredAt? }  DELIVERED -> đơn DELIVERED/COMPLETED
// ShopOrderSummaryResponse chỉ có: id, orderId, orderNumber, shopOrderNumber, status, paymentMethod,
// currency, totalMinor, itemCount, placedAt, updatedAt (không có người nhận / ảnh -> xem ở trang chi tiết).
// =====================================================================

export const SHOP_ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PENDING_CONFIRMATION',
  'PROCESSING',
  'READY_TO_SHIP',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'RETURNED',
];
export const CANCELLABLE = ['PENDING_PAYMENT', 'PENDING_CONFIRMATION', 'PROCESSING', 'READY_TO_SHIP'];
// Trạng thái vận đơn được phép chuyển tiếp (giống ShopOrderService của Backend)
export const SHIPMENT_TRANSITIONS = {
  PICKED_UP: ['IN_TRANSIT', 'DELIVERY_FAILED'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'DELIVERY_FAILED'],
  DELIVERY_FAILED: ['IN_TRANSIT', 'RETURNING'],
  RETURNING: ['RETURNED'],
};

const list = (shopId) => `/shops/${enc(shopId)}/orders`;
const path = (shopId, shopOrderId) => `/shops/${enc(shopId)}/orders/${enc(shopOrderId)}`;

export function getShopOrders(shopId, { status = '', limit = MAX_PAGE, offset = 0 } = {}) {
  const query = new URLSearchParams({ limit: String(Math.min(limit, MAX_PAGE)), offset: String(offset) });
  if (status) query.set('status', status);
  return apiClient.get(`${list(shopId)}?${query}`);
}

// Tải tối đa 500 đơn (dùng cho thống kê / đếm việc cần làm)
export function getAllShopOrders(shopId, { status = '' } = {}) {
  return fetchAllSlices(({ limit, offset }) => getShopOrders(shopId, { status, limit, offset }));
}

export function getShopOrder(shopId, shopOrderId) {
  return apiClient.get(path(shopId, shopOrderId));
}

export function confirmShopOrder(shopId, shopOrderId, sellerNote) {
  return apiClient.post(`${path(shopId, shopOrderId)}/confirm`, { sellerNote: sellerNote?.trim() || null });
}

export function markReadyToShip(shopId, shopOrderId) {
  return apiClient.post(`${path(shopId, shopOrderId)}/ready-to-ship`);
}

export function cancelShopOrder(shopId, shopOrderId, reason) {
  return apiClient.post(`${path(shopId, shopOrderId)}/cancel`, { reason: reason.trim() });
}

export function dispatchShopOrder(shopId, shopOrderId, { carrierCode, serviceCode, trackingNumber, estimatedDeliveryAt }) {
  return apiClient.post(`${path(shopId, shopOrderId)}/dispatch`, {
    carrierCode,
    serviceCode: serviceCode || null,
    trackingNumber: trackingNumber?.trim() || null,
    estimatedDeliveryAt: estimatedDeliveryAt ? new Date(estimatedDeliveryAt).toISOString() : null,
  });
}

export function updateShipmentStatus(shopId, shopOrderId, { status, location, description }) {
  return apiClient.post(`${path(shopId, shopOrderId)}/shipment-status`, {
    status,
    location: location?.trim() || null,
    description: description?.trim() || null,
  });
}
