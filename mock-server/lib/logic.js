// Nghiệp vụ dùng chung của BE giả: dựng response đúng dạng Backend + các bước đổi trạng thái.
import { clone, now, uuid } from './util.js';

// ---------------------------------------------------------------- sản phẩm
export const available = (v) => Math.max(0, v.quantityOnHand - v.quantityReserved);

export function refreshVariant(v) {
  v.availableQuantity = available(v);
  return v;
}

const activeVariants = (p) => p.variants.filter((v) => v.status === 'ACTIVE');
const primaryImage = (p) => p.images.find((i) => i.primary) ?? p.images[0] ?? null;

export function isPublic(db, product) {
  const shop = db.shops.find((s) => s.id === product.shopId);
  return product.status === 'ACTIVE' && shop?.status === 'ACTIVE';
}

// PublicProductSummaryResponse
export function publicSummary(db, p) {
  const shop = db.shops.find((s) => s.id === p.shopId);
  const vs = activeVariants(p);
  const prices = vs.map((v) => v.priceMinor);
  const cheapest = vs.reduce((a, v) => (!a || v.priceMinor < a.priceMinor ? v : a), null);
  const img = primaryImage(p);
  return {
    id: p.id,
    shopId: p.shopId,
    shopName: shop?.name ?? null,
    shopSlug: shop?.slug ?? null,
    categoryId: p.categoryId,
    brandId: p.brandId,
    name: p.name,
    slug: p.slug,
    targetGender: p.targetGender,
    primaryImageKey: img?.storageKey ?? null,
    primaryImageUrl: img?.url ?? null,
    minPriceMinor: prices.length ? Math.min(...prices) : 0,
    maxPriceMinor: prices.length ? Math.max(...prices) : 0,
    compareAtPriceMinor: cheapest?.compareAtPriceMinor ?? null,
    variantCount: vs.length,
    availableQuantity: vs.reduce((s, v) => s + available(v), 0),
    publishedAt: p.publishedAt,
  };
}

// PublicProductResponse
export function publicDetail(p) {
  return {
    id: p.id,
    shopId: p.shopId,
    categoryId: p.categoryId,
    brandId: p.brandId,
    name: p.name,
    slug: p.slug,
    description: p.description,
    material: p.material,
    fitType: p.fitType,
    targetGender: p.targetGender,
    careInstructions: p.careInstructions,
    sizeChart: p.sizeChart,
    publishedAt: p.publishedAt,
    options: clone(p.options),
    variants: activeVariants(p).map((v) => ({
      id: v.id,
      sellerSku: v.sellerSku,
      selections: { ...v.selections },
      priceMinor: v.priceMinor,
      compareAtPriceMinor: v.compareAtPriceMinor,
      availableQuantity: available(v),
    })),
    images: clone(p.images),
  };
}

// ShopProductSummaryResponse
export function shopProductSummary(p) {
  const prices = p.variants.map((v) => v.priceMinor);
  const img = primaryImage(p);
  return {
    id: p.id,
    shopId: p.shopId,
    sellerProductCode: p.sellerProductCode,
    name: p.name,
    slug: p.slug,
    status: p.status,
    version: p.version,
    primaryImageKey: img?.storageKey ?? null,
    primaryImageUrl: img?.url ?? null,
    minPriceMinor: prices.length ? Math.min(...prices) : null,
    maxPriceMinor: prices.length ? Math.max(...prices) : null,
    variantCount: p.variants.length,
    activeVariantCount: activeVariants(p).length,
    quantityOnHand: p.variants.reduce((s, v) => s + v.quantityOnHand, 0),
    quantityReserved: p.variants.reduce((s, v) => s + v.quantityReserved, 0),
    publishedAt: p.publishedAt,
    updatedAt: p.updatedAt,
  };
}

// ProductResponse (phía shop: đủ biến thể, tồn kho)
export function productResponse(p) {
  const { soldCount, ...rest } = clone(p);
  void soldCount;
  rest.variants.forEach(refreshVariant);
  return rest;
}

export function findVariant(db, variantId) {
  for (const product of db.products) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant) return { product, variant };
  }
  return null;
}

// ---------------------------------------------------------------- shop
export const shopSummary = (s) => ({
  id: s.id,
  ownerUserId: s.ownerUserId,
  name: s.name,
  slug: s.slug,
  logoKey: s.logoKey,
  logoUrl: s.logoUrl,
  status: s.status,
  activatedAt: s.activatedAt,
  suspendedAt: s.suspendedAt,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
});

export const shopResponse = (s) => ({
  ...shopSummary(s),
  applicationId: s.applicationId,
  description: s.description,
  bannerKey: s.bannerKey,
  bannerUrl: s.bannerUrl,
  contactEmail: s.contactEmail,
  contactPhone: s.contactPhone,
  pickupAddress: clone(s.pickupAddress),
});

// ---------------------------------------------------------------- đơn hàng
const SHOP_DONE = ['COMPLETED', 'RETURNED'];

// Trạng thái đơn tổng suy ra từ các shop order
export function syncOrderStatus(db, order) {
  const shops = db.shopOrders.filter((so) => so.orderId === order.id);
  const statuses = shops.map((so) => so.status);
  const live = statuses.filter((s) => s !== 'CANCELLED');
  let status = order.status;
  if (live.length === 0) status = 'CANCELLED';
  else if (live.every((s) => SHOP_DONE.includes(s) || s === 'DELIVERED')) status = 'COMPLETED';
  else if (live.some((s) => ['SHIPPED', 'DELIVERED', 'COMPLETED'].includes(s))) {
    status = live.every((s) => ['SHIPPED', 'DELIVERED', 'COMPLETED', 'RETURNED'].includes(s)) ? 'SHIPPED' : 'PARTIALLY_SHIPPED';
  } else if (live.some((s) => ['PROCESSING', 'READY_TO_SHIP'].includes(s))) status = 'PROCESSING';
  else if (order.status === 'PENDING_PAYMENT') status = 'PENDING_PAYMENT';
  else status = 'CONFIRMED';
  if (status === 'CONFIRMED' && statuses.includes('CANCELLED')) status = 'PARTIALLY_CANCELLED';
  order.status = status;
  if (status === 'COMPLETED' && !order.completedAt) order.completedAt = now();
  if (status === 'CANCELLED' && !order.cancelledAt) order.cancelledAt = now();
}

const orderItemView = (i) => ({
  id: i.id,
  productId: i.productId,
  variantId: i.variantId,
  sellerSku: i.sellerSku,
  productName: i.productName,
  options: { ...i.options },
  unitPriceMinor: i.unitPriceMinor,
  quantity: i.quantity,
  discountMinor: i.discountMinor,
  lineTotalMinor: i.lineTotalMinor,
  imageUrl: i.imageUrl ?? null, // BE thật chưa trả ảnh; giữ để giao diện đẹp hơn khi demo
});

export function paymentView(db, order) {
  return clone(order.payment);
}

// OrderResponse
export function orderResponse(db, order) {
  const shops = db.shopOrders.filter((so) => so.orderId === order.id);
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    currency: 'VND',
    paymentMethod: order.paymentMethod,
    recipient: clone(order.recipient),
    itemsSubtotalMinor: order.itemsSubtotalMinor,
    shippingFeeMinor: order.shippingFeeMinor,
    discountTotalMinor: order.discountTotalMinor,
    grandTotalMinor: order.grandTotalMinor,
    buyerNote: order.buyerNote,
    placedAt: order.placedAt,
    paidAt: order.paidAt,
    completedAt: order.completedAt,
    cancelledAt: order.cancelledAt,
    shops: shops.map((so) => ({
      id: so.id,
      shopId: so.shopId,
      shopOrderNumber: so.shopOrderNumber,
      status: so.status,
      itemsSubtotalMinor: so.itemsSubtotalMinor,
      shippingFeeMinor: so.shippingFeeMinor,
      discountTotalMinor: so.discountTotalMinor,
      totalMinor: so.totalMinor,
      items: so.items.map(orderItemView),
      shipment: so.shipment ? clone(so.shipment) : null,
    })),
    appliedVouchers: clone(order.appliedVouchers ?? []),
    payment: paymentView(db, order),
  };
}

// OrderSummaryResponse
export function orderSummary(db, order) {
  const shops = db.shopOrders.filter((so) => so.orderId === order.id);
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    grandTotalMinor: order.grandTotalMinor,
    currency: 'VND',
    shopCount: shops.length,
    itemCount: shops.reduce((s, so) => s + so.items.reduce((n, i) => n + i.quantity, 0), 0),
    paymentStatus: order.payment?.status ?? null,
    placedAt: order.placedAt,
  };
}

// ShopOrderSummaryResponse
export const shopOrderSummary = (so) => ({
  id: so.id,
  orderId: so.orderId,
  orderNumber: so.orderNumber,
  shopOrderNumber: so.shopOrderNumber,
  status: so.status,
  paymentMethod: so.paymentMethod,
  currency: 'VND',
  totalMinor: so.totalMinor,
  itemCount: so.items.reduce((n, i) => n + i.quantity, 0),
  placedAt: so.placedAt,
  updatedAt: so.updatedAt,
});

// ShopOrderDetailResponse
export function shopOrderDetail(so) {
  return {
    id: so.id,
    orderId: so.orderId,
    orderNumber: so.orderNumber,
    shopId: so.shopId,
    shopOrderNumber: so.shopOrderNumber,
    status: so.status,
    buyerId: so.buyerId,
    paymentMethod: so.paymentMethod,
    currency: 'VND',
    recipient: clone(so.recipient),
    itemsSubtotalMinor: so.itemsSubtotalMinor,
    shippingFeeMinor: so.shippingFeeMinor,
    discountTotalMinor: so.discountTotalMinor,
    totalMinor: so.totalMinor,
    buyerNote: so.buyerNote,
    sellerNote: so.sellerNote,
    placedAt: so.placedAt,
    confirmedAt: so.confirmedAt,
    cancelledAt: so.cancelledAt,
    completedAt: so.completedAt,
    items: so.items.map(orderItemView),
    shipment: so.shipment ? clone(so.shipment) : null,
  };
}

// Trả hàng tồn kho đã giữ (hủy đơn) / trừ hẳn (giao xong)
export function releaseStock(db, so, { consume = false } = {}) {
  so.items.forEach((item) => {
    const found = findVariant(db, item.variantId);
    if (!found) return;
    const v = found.variant;
    v.quantityReserved = Math.max(0, v.quantityReserved - item.quantity);
    if (consume) {
      v.quantityOnHand = Math.max(0, v.quantityOnHand - item.quantity);
      found.product.soldCount = (found.product.soldCount ?? 0) + item.quantity;
    }
    refreshVariant(v);
  });
}

// Ghi 1 dòng biến động số dư của shop
export function financeEntry(db, shop, type, amountMinor, description, referenceType = null, referenceId = null) {
  const account = shop.finance.account;
  account.availableBalanceMinor += amountMinor;
  account.version += 1;
  account.updatedAt = now();
  db.financeEntries.unshift({
    id: uuid(),
    shopId: shop.id,
    type,
    amountMinor,
    balanceAfterMinor: account.availableBalanceMinor,
    currency: 'VND',
    referenceType,
    referenceId,
    description,
    occurredAt: now(),
  });
}

// Shop order hoàn tất -> đối soát: cộng doanh thu, trừ phí sàn
export function settleShopOrder(db, so, at = now()) {
  if (db.settlements.some((s) => s.shopOrderId === so.id)) return;
  const shop = db.shops.find((s) => s.id === so.shopId);
  const rate = shop.finance.settings.platformFeeRateBp;
  const gross = so.totalMinor;
  const feeBase = so.itemsSubtotalMinor - so.discountTotalMinor;
  const fee = Math.round((Math.max(0, feeBase) * rate) / 10000);
  const cod = db.cod.find((c) => c.shopOrderId === so.id);
  db.settlements.unshift({
    id: uuid(),
    shopId: shop.id,
    shopOrderId: so.id,
    codCollectionId: cod?.id ?? null,
    currency: 'VND',
    grossSalesMinor: gross,
    feeBaseMinor: feeBase,
    platformFeeRateBp: rate,
    platformFeeMinor: fee,
    refundedMinor: 0,
    feeReversedMinor: 0,
    netRevenueMinor: gross - fee,
    status: 'SETTLED',
    settledAt: at,
  });
  financeEntry(db, shop, 'SALE_CREDIT', gross, `Doanh thu đơn ${so.shopOrderNumber}`, 'SHOP_ORDER', so.id);
  financeEntry(db, shop, 'PLATFORM_FEE', -fee, `Phí sàn ${rate / 100}% đơn ${so.shopOrderNumber}`, 'SHOP_ORDER', so.id);
}

export function completeShopOrder(db, so) {
  if (so.status === 'COMPLETED') return;
  so.status = 'COMPLETED';
  so.completedAt = now();
  so.updatedAt = now();
  releaseStock(db, so, { consume: true });
  settleShopOrder(db, so);
}
