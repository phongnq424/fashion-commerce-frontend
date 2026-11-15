import { apiError, now, requireShop, slice, transact, uuid } from './sellerDb';

// =====================================================================
// ĐƠN HÀNG CỦA SHOP — GIẢ LẬP, đúng dạng backend (contract mục 13):
//   GET  /shops/{shopId}/orders?status=&limit=&offset=      -> SliceResponse<ShopOrderSummaryResponse>
//   GET  /shops/{shopId}/orders/{shopOrderId}               -> ShopOrderDetailResponse
//   POST .../{id}/confirm        { sellerNote? }            PENDING_CONFIRMATION -> PROCESSING
//   POST .../{id}/ready-to-ship                             PROCESSING -> READY_TO_SHIP
//   POST .../{id}/cancel         { reason }                 chỉ 3 trạng thái đầu, hoàn kho, COD -> CANCELLED
//   POST .../{id}/dispatch       { carrierCode, trackingNumber?, estimatedDeliveryAt? }  READY_TO_SHIP -> SHIPPED
//   POST .../{id}/shipment-status { status, location?, description? }  DELIVERED -> đơn COMPLETED
// =====================================================================

export const SHOP_ORDER_STATUSES = ['PENDING_CONFIRMATION', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'RETURNED'];
export const CANCELLABLE = ['PENDING_PAYMENT', 'PENDING_CONFIRMATION', 'PROCESSING', 'READY_TO_SHIP'];
// Trạng thái vận đơn được phép chuyển tiếp (giống ShopOrderService.SHIPMENT_TRANSITIONS của backend)
export const SHIPMENT_TRANSITIONS = {
  PICKED_UP: ['IN_TRANSIT', 'DELIVERY_FAILED'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'DELIVERY_FAILED'],
  DELIVERY_FAILED: ['IN_TRANSIT', 'RETURNING'],
  RETURNING: ['RETURNED'],
};

const toSummary = (order) => ({
  id: order.id,
  orderId: order.orderId,
  orderNumber: order.orderNumber,
  shopOrderNumber: order.shopOrderNumber,
  status: order.status,
  paymentMethod: order.paymentMethod,
  currency: order.currency,
  totalMinor: order.totalMinor,
  itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
  placedAt: order.placedAt,
  updatedAt: order.updatedAt,
  // riêng bản giả lập (giúp danh sách hiện ảnh + người nhận giống các sàn):
  items: order.items,
  recipientName: order.recipient.recipientName,
  shipment: order.shipment ? { carrierCode: order.shipment.carrierCode, trackingNumber: order.shipment.trackingNumber, status: order.shipment.status } : null,
});

function find(db, me, shopId, shopOrderId) {
  const shop = requireShop(db, me, shopId);
  const order = shop.orders.find((o) => o.id === shopOrderId);
  if (!order) throw apiError(404, 'SHOP_ORDER_NOT_FOUND');
  return { shop, order };
}

function touch(order) {
  order.updatedAt = now();
  return order;
}

function codOf(shop, order) {
  return shop.cod.find((c) => c.shopOrderId === order.id);
}

function codEvent(collection, toStatus, note = null) {
  collection.events.push({ id: uuid(), fromStatus: collection.status, toStatus, actorUserId: null, note, occurredAt: now() });
  collection.status = toStatus;
  collection.version += 1;
  collection.updatedAt = now();
}

export function getShopOrders(shopId, { status = '', limit = 200, offset = 0 } = {}) {
  return transact((db, me) => {
    const orders = requireShop(db, me, shopId)
      .orders.filter((o) => !status || o.status === status)
      .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
      .map(toSummary);
    return slice(orders, limit, offset);
  }, 150);
}

export function getShopOrder(shopId, shopOrderId) {
  return transact((db, me) => find(db, me, shopId, shopOrderId).order, 120);
}

export function confirmShopOrder(shopId, shopOrderId, sellerNote) {
  return transact((db, me) => {
    const { order } = find(db, me, shopId, shopOrderId);
    if (order.status !== 'PENDING_CONFIRMATION') throw apiError(409, 'SHOP_ORDER_NOT_CONFIRMABLE');
    Object.assign(order, { status: 'PROCESSING', confirmedAt: now(), sellerNote: sellerNote?.trim() || null });
    return touch(order);
  });
}

export function markReadyToShip(shopId, shopOrderId) {
  return transact((db, me) => {
    const { order } = find(db, me, shopId, shopOrderId);
    if (order.status !== 'PROCESSING') throw apiError(409, 'SHOP_ORDER_NOT_READY');
    order.status = 'READY_TO_SHIP';
    return touch(order);
  });
}

export function cancelShopOrder(shopId, shopOrderId, reason) {
  return transact((db, me) => {
    const { shop, order } = find(db, me, shopId, shopOrderId);
    if (!CANCELLABLE.includes(order.status)) throw apiError(409, 'SHOP_ORDER_NOT_CANCELLABLE');
    if (!reason?.trim()) throw apiError(400, 'REQUEST_INVALID');
    // Hoàn lại hàng đang giữ cho đơn
    order.items.forEach((item) => {
      const variant = shop.products.flatMap((p) => p.variants).find((v) => v.id === item.variantId);
      if (variant) {
        variant.quantityReserved = Math.max(0, variant.quantityReserved - item.quantity);
        variant.availableQuantity = Math.max(0, variant.quantityOnHand - variant.quantityReserved);
      }
    });
    Object.assign(order, { status: 'CANCELLED', cancelledAt: now(), cancelReason: reason.trim() });
    const cod = codOf(shop, order);
    if (cod && cod.status === 'AWAITING_COLLECTION') {
      codEvent(cod, 'CANCELLED', 'Đơn bị hủy trước khi giao');
      cod.paymentStatus = 'CANCELLED';
    }
    return touch(order);
  });
}

export function dispatchShopOrder(shopId, shopOrderId, { carrierCode, serviceCode, trackingNumber, estimatedDeliveryAt }) {
  return transact((db, me) => {
    const { shop, order } = find(db, me, shopId, shopOrderId);
    if (order.status !== 'READY_TO_SHIP') throw apiError(409, 'SHOP_ORDER_NOT_DISPATCHABLE');
    if (estimatedDeliveryAt && new Date(estimatedDeliveryAt) <= new Date()) throw apiError(400, 'SHIPMENT_ESTIMATE_INVALID');
    const provider = shop.shippingProviders.find((p) => p.code === carrierCode && p.enabled);
    const pickup = shop.pickupAddresses.find((a) => a.active) ?? shop.pickupAddresses[0];
    if (!provider || !pickup) throw apiError(422, 'SHIPPING_PROVIDER_NOT_CONFIGURED');
    const at = now();
    order.shipment = {
      id: uuid(),
      carrierCode,
      serviceCode: serviceCode || null,
      trackingNumber: trackingNumber?.trim() || null,
      origin: pickup,
      destination: order.recipient,
      shippingFeeMinor: order.shippingFeeMinor,
      status: 'PICKED_UP',
      shippedAt: at,
      estimatedDeliveryAt: estimatedDeliveryAt || null,
      deliveredAt: null,
      createdAt: at,
      updatedAt: at,
      events: [{ id: uuid(), status: 'PICKED_UP', location: pickup.provinceName, description: `Đã bàn giao cho ${provider.name}`, occurredAt: at, createdAt: at }],
    };
    order.status = 'SHIPPED';
    return touch(order);
  });
}

export function updateShipmentStatus(shopId, shopOrderId, { status, location, description }) {
  return transact((db, me) => {
    const { shop, order } = find(db, me, shopId, shopOrderId);
    const shipment = order.shipment;
    if (!shipment) throw apiError(404, 'SHIPMENT_NOT_FOUND');
    if (order.status !== 'SHIPPED') throw apiError(409, 'SHOP_ORDER_NOT_SHIPPED');
    if (!(SHIPMENT_TRANSITIONS[shipment.status] ?? []).includes(status)) throw apiError(409, 'SHIPMENT_TRANSITION_INVALID');
    const at = now();
    shipment.events.push({ id: uuid(), status, location: location?.trim() || null, description: description?.trim() || null, occurredAt: at, createdAt: at });
    Object.assign(shipment, { status, updatedAt: at });
    if (status === 'DELIVERED') {
      shipment.deliveredAt = at;
      Object.assign(order, { status: 'COMPLETED', completedAt: at });
      // Hàng đã giao -> trừ hẳn khỏi kho (hết giữ chỗ)
      order.items.forEach((item) => {
        const variant = shop.products.flatMap((p) => p.variants).find((v) => v.id === item.variantId);
        if (variant) {
          variant.quantityReserved = Math.max(0, variant.quantityReserved - item.quantity);
          variant.quantityOnHand = Math.max(0, variant.quantityOnHand - item.quantity);
          variant.availableQuantity = Math.max(0, variant.quantityOnHand - variant.quantityReserved);
        }
      });
    }
    return touch(order);
  });
}
