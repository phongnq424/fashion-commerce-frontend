// Người mua: địa chỉ, yêu thích, giỏ hàng, thanh toán, đơn hàng, đánh giá, trả hàng, voucher
import { requireUser } from '../guard.js';
import { available, findVariant, isPublic, orderResponse, orderSummary, refreshVariant, releaseStock, syncOrderStatus } from '../logic.js';
import { reviewResponse } from './auth.js';
import { bad, byNewest, clone, conflict, fail, notFound, now, pushNotification, slice, uuid } from '../util.js';

// ---------------------------------------------------------------- voucher
export function voucherDiscount(v, subtotal, shippingFee) {
  if (v.appliesTo === 'SHIPPING') {
    const raw = v.discountType === 'PERCENT' ? Math.round((shippingFee * (v.discountRateBp ?? 0)) / 10000) : v.discountAmountMinor ?? 0;
    return Math.min(shippingFee, v.maxDiscountMinor ? Math.min(raw, v.maxDiscountMinor) : raw);
  }
  const raw = v.discountType === 'PERCENT' ? Math.round((subtotal * (v.discountRateBp ?? 0)) / 10000) : v.discountAmountMinor ?? 0;
  return Math.min(subtotal, v.maxDiscountMinor ? Math.min(raw, v.maxDiscountMinor) : raw);
}

function usedByBuyer(db, voucherId, buyerId) {
  return db.orders.filter((o) => o.buyerId === buyerId && o.status !== 'CANCELLED' && (o.appliedVouchers ?? []).some((a) => a.voucherId === voucherId)).length;
}

function checkVoucher(db, v, buyerId, subtotal) {
  const t = Date.now();
  if (!v.active || Date.parse(v.startsAt) > t || Date.parse(v.endsAt) < t || v.usedCount >= v.usageLimit) return 'VOUCHER_UNAVAILABLE';
  if (usedByBuyer(db, v.id, buyerId) >= v.perUserLimit) return 'VOUCHER_UNAVAILABLE';
  if (subtotal < v.minSpendMinor) return 'VOUCHER_MIN_SPEND_NOT_MET';
  return null;
}

// ---------------------------------------------------------------- địa chỉ
const myAddresses = (db, me) => (db.addresses[me.id] ??= []);

function addressFromBody(body) {
  return {
    recipientName: String(body.recipientName ?? '').trim(),
    recipientPhone: String(body.recipientPhone ?? '').trim(),
    addressLine1: String(body.addressLine1 ?? '').trim(),
    addressLine2: body.addressLine2 ?? null,
    ward: body.ward ?? null,
    district: body.district ?? null,
    province: String(body.province ?? '').trim(),
    provinceCode: body.provinceCode ?? null,
    postalCode: body.postalCode ?? null,
    countryCode: body.countryCode ?? 'VN',
    defaultAddress: Boolean(body.defaultAddress),
  };
}

function ensureOneDefault(list, keepId) {
  if (keepId) list.forEach((a) => (a.defaultAddress = a.id === keepId));
  if (list.length && !list.some((a) => a.defaultAddress)) list[0].defaultAddress = true;
}

// ---------------------------------------------------------------- giỏ hàng
function cartOf(db, me) {
  return (db.carts[me.id] ??= { id: uuid(), version: 0, items: [], updatedAt: now() });
}

function availability(db, item) {
  const found = findVariant(db, item.variantId);
  if (!found || !isPublic(db, found.product) || found.variant.status !== 'ACTIVE') return 'UNAVAILABLE';
  const left = available(found.variant);
  if (left <= 0) return 'OUT_OF_STOCK';
  if (item.quantity > left) return 'INSUFFICIENT_STOCK';
  return 'AVAILABLE';
}

export function cartResponse(db, cart) {
  const groups = new Map();
  let selectedCount = 0;
  let selectedSubtotal = 0;
  cart.items.forEach((item) => {
    const found = findVariant(db, item.variantId);
    if (!found) return;
    const { product, variant } = found;
    const shop = db.shops.find((s) => s.id === product.shopId);
    if (!groups.has(shop.id)) groups.set(shop.id, { shopId: shop.id, shopName: shop.name, shopSlug: shop.slug, defaultShippingFeeMinor: shop.settings.defaultShippingFeeMinor, items: [] });
    const image = product.images.find((i) => i.variantId === variant.id) ?? product.images.find((i) => i.primary) ?? product.images[0];
    const state = availability(db, item);
    if (item.selected && state === 'AVAILABLE') {
      selectedCount += 1;
      selectedSubtotal += variant.priceMinor * item.quantity;
    }
    groups.get(shop.id).items.push({
      id: item.id,
      variantId: variant.id,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      sellerSku: variant.sellerSku,
      options: { ...variant.selections },
      imageKey: image?.storageKey ?? null,
      imageUrl: image?.url ?? null,
      unitPriceMinor: variant.priceMinor,
      compareAtPriceMinor: variant.compareAtPriceMinor,
      quantity: item.quantity,
      selected: item.selected,
      availableQuantity: available(variant),
      availability: state,
    });
  });
  return {
    id: cart.id,
    version: cart.version,
    distinctItemCount: cart.items.length,
    totalQuantity: cart.items.reduce((s, i) => s + i.quantity, 0),
    selectedItemCount: selectedCount,
    selectedItemsSubtotalMinor: selectedSubtotal,
    shops: [...groups.values()],
    updatedAt: cart.updatedAt,
  };
}

function checkVersion(cart, expected) {
  if (Number(expected) !== cart.version) conflict('CART_VERSION_CONFLICT');
}
const bump = (cart) => {
  cart.version += 1;
  cart.updatedAt = now();
};

// ---------------------------------------------------------------- xem trước đơn
function buildPreview(db, me, body) {
  const cart = cartOf(db, me);
  checkVersion(cart, body.expectedCartVersion);
  const address = myAddresses(db, me).find((a) => a.id === body.addressId);
  if (!address) notFound('CHECKOUT_ADDRESS_NOT_FOUND');
  const selected = cart.items.filter((i) => i.selected);
  if (!selected.length) bad('CHECKOUT_CART_EMPTY');
  const issues = [];
  const shopMap = new Map();
  selected.forEach((item) => {
    const found = findVariant(db, item.variantId);
    const state = availability(db, item);
    const expected = body.expectedUnitPrices?.[item.variantId];
    if (state !== 'AVAILABLE' || !found) {
      issues.push({ cartItemId: item.id, variantId: item.variantId, code: state === 'UNAVAILABLE' ? 'PRODUCT_UNAVAILABLE' : state, message: state, expectedUnitPriceMinor: expected ?? null, currentUnitPriceMinor: found?.variant.priceMinor ?? 0, requestedQuantity: item.quantity, availableQuantity: found ? available(found.variant) : 0 });
      return;
    }
    const { product, variant } = found;
    if (expected != null && Number(expected) !== variant.priceMinor) {
      issues.push({ cartItemId: item.id, variantId: variant.id, code: 'PRICE_CHANGED', message: 'Price changed', expectedUnitPriceMinor: Number(expected), currentUnitPriceMinor: variant.priceMinor, requestedQuantity: item.quantity, availableQuantity: available(variant) });
    }
    const shop = db.shops.find((s) => s.id === product.shopId);
    if (!shopMap.has(shop.id)) shopMap.set(shop.id, { shop, items: [] });
    const image = product.images.find((i) => i.variantId === variant.id) ?? product.images.find((i) => i.primary) ?? product.images[0];
    shopMap.get(shop.id).items.push({ cartItemId: item.id, variantId: variant.id, productId: product.id, productName: product.name, sellerSku: variant.sellerSku, options: { ...variant.selections }, imageKey: image?.storageKey ?? null, imageUrl: image?.url ?? null, unitPriceMinor: variant.priceMinor, quantity: item.quantity, lineSubtotalMinor: variant.priceMinor * item.quantity });
  });

  // Voucher: mỗi shop tối đa 1 mã ORDER + 1 mã SHIPPING
  const codes = [...new Set((body.voucherCodes ?? []).map((c) => String(c).toUpperCase()))];
  const applied = [];
  const used = new Map(); // shopId -> Set(appliesTo)
  codes.forEach((code) => {
    const v = db.vouchers.find((x) => x.code === code);
    if (!v) fail(404, 'VOUCHER_NOT_FOUND', `Mã ${code} không tồn tại`);
    const group = shopMap.get(v.shopId);
    if (!group) fail(422, 'VOUCHER_SHOP_NOT_IN_CHECKOUT', `Mã ${code} thuộc shop không có trong đơn`);
    const kinds = used.get(v.shopId) ?? new Set();
    if (kinds.has(v.appliesTo)) fail(409, 'VOUCHER_SHOP_LIMIT', 'Mỗi shop chỉ 1 mã cho mỗi loại');
    const subtotal = group.items.reduce((s, i) => s + i.lineSubtotalMinor, 0);
    const error = checkVoucher(db, v, me.id, subtotal);
    if (error) fail(422, error, error);
    const discount = voucherDiscount(v, subtotal, group.shop.settings.defaultShippingFeeMinor);
    if (discount <= 0) fail(422, 'VOUCHER_NO_DISCOUNT', 'No discount');
    kinds.add(v.appliesTo);
    used.set(v.shopId, kinds);
    applied.push({ voucherId: v.id, shopId: v.shopId, code: v.code, name: v.name, appliesTo: v.appliesTo, discountMinor: discount });
  });

  const shops = [...shopMap.values()].map(({ shop, items }) => {
    const itemsSubtotal = items.reduce((s, i) => s + i.lineSubtotalMinor, 0);
    const shipping = shop.settings.defaultShippingFeeMinor;
    const discount = applied.filter((a) => a.shopId === shop.id).reduce((s, a) => s + a.discountMinor, 0);
    return { shopId: shop.id, shopName: shop.name, shopSlug: shop.slug, itemsSubtotalMinor: itemsSubtotal, shippingFeeMinor: shipping, discountMinor: discount, totalMinor: Math.max(0, itemsSubtotal + shipping - discount), items };
  });
  const { id, defaultAddress, createdAt, updatedAt, ...recipient } = address;
  void id;
  void defaultAddress;
  void createdAt;
  void updatedAt;
  const preview = {
    snapshotId: uuid(),
    readyForOrder: issues.length === 0 && shops.length > 0,
    cartVersion: cart.version,
    currency: 'VND',
    recipient,
    shops,
    itemsSubtotalMinor: shops.reduce((s, x) => s + x.itemsSubtotalMinor, 0),
    shippingFeeMinor: shops.reduce((s, x) => s + x.shippingFeeMinor, 0),
    discountTotalMinor: shops.reduce((s, x) => s + x.discountMinor, 0),
    grandTotalMinor: shops.reduce((s, x) => s + x.totalMinor, 0),
    appliedVouchers: applied,
    issues,
    expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
  };
  db.snapshots[preview.snapshotId] = { ...clone(preview), buyerId: me.id, cartId: cart.id };
  return preview;
}

function paymentMethods(db, snapshot) {
  const allowCod = snapshot.shops.every((s) => db.shops.find((x) => x.id === s.shopId)?.settings.allowCod);
  const gateway = (code, name) => ({ code, displayName: name, provider: code, configured: false, available: false, status: 'NOT_CONFIGURED', unavailableReason: 'Bản demo chưa nối cổng thanh toán' });
  return [
    { code: 'COD', displayName: 'Thanh toán khi nhận hàng', provider: 'COD', configured: true, available: allowCod, status: allowCod ? 'AVAILABLE' : 'TEMPORARILY_UNAVAILABLE', unavailableReason: allowCod ? null : 'Có shop không nhận COD' },
    gateway('MOMO', 'Ví MoMo'),
    gateway('ZALOPAY', 'ZaloPay'),
    gateway('VNPAY', 'VNPay'),
  ];
}

function placeOrder(db, me, body, idempotencyKey) {
  if (idempotencyKey && db.idempotency[idempotencyKey]) {
    return orderResponse(db, db.orders.find((o) => o.id === db.idempotency[idempotencyKey]));
  }
  const snap = db.snapshots[body.checkoutSnapshotId];
  if (!snap || snap.buyerId !== me.id) notFound('CHECKOUT_SNAPSHOT_NOT_FOUND');
  if (Date.parse(snap.expiresAt) < Date.now()) fail(409, 'CHECKOUT_SNAPSHOT_EXPIRED', 'Snapshot expired');
  if (!snap.readyForOrder) fail(409, 'CHECKOUT_SNAPSHOT_NOT_READY', 'Not ready');
  const cart = cartOf(db, me);
  if (cart.version !== snap.cartVersion) fail(409, 'CHECKOUT_CHANGED', 'Cart changed after checkout preview');
  const method = paymentMethods(db, snap).find((m) => m.code === body.paymentMethod);
  if (!method?.available) fail(422, 'PAYMENT_METHOD_UNAVAILABLE', 'Payment method unavailable');

  // Giữ hàng
  snap.shops.forEach((s) =>
    s.items.forEach((i) => {
      const found = findVariant(db, i.variantId);
      if (!found || available(found.variant) < i.quantity) fail(409, 'ORDER_STOCK_INSUFFICIENT', 'Out of stock');
    }),
  );
  db.counters.order += 1;
  const number = `TL${String(db.counters.order).padStart(8, '0')}`;
  const orderId = uuid();
  const at = now();
  const order = {
    id: orderId,
    orderNumber: number,
    buyerId: me.id,
    buyerEmail: me.email,
    status: 'CONFIRMED',
    paymentMethod: 'COD',
    recipient: clone(snap.recipient),
    itemsSubtotalMinor: snap.itemsSubtotalMinor,
    shippingFeeMinor: snap.shippingFeeMinor,
    discountTotalMinor: snap.discountTotalMinor,
    grandTotalMinor: snap.grandTotalMinor,
    buyerNote: body.buyerNote || null,
    placedAt: at,
    paidAt: null,
    completedAt: null,
    cancelledAt: null,
    appliedVouchers: clone(snap.appliedVouchers),
    payment: { id: uuid(), orderId, merchantReference: number, method: 'COD', provider: 'COD', amountMinor: snap.grandTotalMinor, currency: 'VND', status: 'AWAITING_COLLECTION', checkoutUrl: null, expiresAt: null, paidAt: null, createdAt: at },
  };
  db.orders.unshift(order);
  snap.shops.forEach((s, index) => {
    const shop = db.shops.find((x) => x.id === s.shopId);
    const orderDiscount = snap.appliedVouchers.filter((a) => a.shopId === s.shopId && a.appliesTo === 'ORDER').reduce((n, a) => n + a.discountMinor, 0);
    const so = {
      id: uuid(),
      orderId,
      orderNumber: number,
      shopId: s.shopId,
      shopOrderNumber: `${number}-${index + 1}`,
      status: shop.settings.autoAcceptOrders ? 'PROCESSING' : 'PENDING_CONFIRMATION',
      buyerId: me.id,
      paymentMethod: 'COD',
      recipient: clone(snap.recipient),
      itemsSubtotalMinor: s.itemsSubtotalMinor,
      shippingFeeMinor: s.shippingFeeMinor,
      discountTotalMinor: s.discountMinor,
      totalMinor: s.totalMinor,
      buyerNote: body.buyerNote || null,
      sellerNote: null,
      placedAt: at,
      confirmedAt: shop.settings.autoAcceptOrders ? at : null,
      cancelledAt: null,
      completedAt: null,
      updatedAt: at,
      shipment: null,
      items: s.items.map((i) => {
        const found = findVariant(db, i.variantId);
        found.variant.quantityReserved += i.quantity;
        refreshVariant(found.variant);
        const labels = Object.fromEntries(Object.entries(i.options).map(([type, code]) => [type, found.product.options.find((o) => o.type === type)?.values.find((v) => v.code === code)?.label ?? code]));
        const share = s.itemsSubtotalMinor ? Math.round((orderDiscount * i.lineSubtotalMinor) / s.itemsSubtotalMinor) : 0;
        return { id: uuid(), productId: i.productId, variantId: i.variantId, sellerSku: i.sellerSku, productName: i.productName, options: labels, unitPriceMinor: i.unitPriceMinor, quantity: i.quantity, discountMinor: share, lineTotalMinor: i.lineSubtotalMinor - share, imageUrl: i.imageUrl };
      }),
    };
    db.shopOrders.unshift(so);
    db.cod.unshift({ id: uuid(), paymentId: order.payment.id, orderId, orderNumber: number, shopOrderId: so.id, shopOrderNumber: so.shopOrderNumber, shopId: so.shopId, status: 'AWAITING_COLLECTION', expectedAmountMinor: so.totalMinor, collectedAmountMinor: null, currency: 'VND', paymentStatus: 'AWAITING_COLLECTION', collectionReference: null, failureReason: null, collectedAt: null, collectedBy: null, reconciledAt: null, reconciledBy: null, reconciliationReference: null, reconciliationNote: null, version: 0, createdAt: at, updatedAt: at, events: [] });
    pushNotification(db, shop.ownerUserId, 'SHOP_ORDER_PLACED', 'Có đơn hàng mới', `Đơn ${so.shopOrderNumber} đang chờ xác nhận.`, { shopId: shop.id, shopOrderId: so.id });
  });
  snap.appliedVouchers.forEach((a) => {
    const v = db.vouchers.find((x) => x.id === a.voucherId);
    if (v) v.usedCount += 1;
  });
  const bought = new Set(snap.shops.flatMap((s) => s.items.map((i) => i.cartItemId)));
  cart.items = cart.items.filter((i) => !bought.has(i.id));
  bump(cart);
  delete db.snapshots[snap.snapshotId];
  if (idempotencyKey) db.idempotency[idempotencyKey] = orderId;
  pushNotification(db, me.id, 'ORDER_PLACED', 'Đặt hàng thành công', `Đơn ${number} đã được ghi nhận.`, { orderId });
  return orderResponse(db, order);
}

// ---------------------------------------------------------------- trả hàng
export function returnResponse(db, r) {
  return clone({ ...r, buyerName: undefined });
}
export const returnSummary = (r) => ({ id: r.id, orderId: r.orderId, shopOrderId: r.shopOrderId, shopOrderNumber: r.shopOrderNumber, status: r.status, reasonCode: r.reasonCode, requestedRefundMinor: r.requestedRefundMinor, createdAt: r.createdAt, updatedAt: r.updatedAt });

export function moveReturn(r, toStatus, actorUserId, note = null) {
  r.events.push({ id: uuid(), fromStatus: r.status, toStatus, actorUserId, note, occurredAt: now() });
  r.status = toStatus;
  r.updatedAt = now();
}

function myOrderItem(db, me, orderItemId) {
  for (const so of db.shopOrders) {
    const item = so.items.find((i) => i.id === orderItemId);
    if (item) {
      if (so.buyerId !== me.id) notFound('ORDER_ITEM_NOT_FOUND');
      return { so, item };
    }
  }
  return notFound('ORDER_ITEM_NOT_FOUND');
}

// ---------------------------------------------------------------- routes
export const buyerRoutes = [
  // Địa chỉ
  ['GET', '/users/me/addresses', (ctx) => clone(myAddresses(ctx.db, requireUser(ctx)))],
  ['POST', '/users/me/addresses', (ctx) => {
    const list = myAddresses(ctx.db, requireUser(ctx));
    if (list.length >= 20) fail(409, 'ADDRESS_LIMIT', 'Too many addresses');
    const row = { id: uuid(), ...addressFromBody(ctx.body), createdAt: now(), updatedAt: now() };
    list.unshift(row);
    ensureOneDefault(list, row.defaultAddress ? row.id : null);
    return clone(row);
  }],
  ['PUT', '/users/me/addresses/{addressId}', (ctx) => {
    const list = myAddresses(ctx.db, requireUser(ctx));
    const row = list.find((a) => a.id === ctx.params.addressId);
    if (!row) notFound('ADDRESS_NOT_FOUND');
    Object.assign(row, addressFromBody(ctx.body), { updatedAt: now() });
    ensureOneDefault(list, row.defaultAddress ? row.id : null);
    return clone(row);
  }],
  ['DELETE', '/users/me/addresses/{addressId}', (ctx) => {
    const me = requireUser(ctx);
    ctx.db.addresses[me.id] = myAddresses(ctx.db, me).filter((a) => a.id !== ctx.params.addressId);
    ensureOneDefault(ctx.db.addresses[me.id]);
    return undefined;
  }],

  // Yêu thích
  ['GET', '/wishlist', (ctx) => {
    const me = requireUser(ctx);
    const rows = (ctx.db.wishlist[me.id] ?? [])
      .map((w) => {
        const p = ctx.db.products.find((x) => x.id === w.productId);
        if (!p) return null;
        const prices = p.variants.filter((v) => v.status === 'ACTIVE').map((v) => v.priceMinor);
        const img = p.images.find((i) => i.primary) ?? p.images[0];
        return { productId: p.id, shopId: p.shopId, productName: p.name, productSlug: p.slug, primaryImageKey: img?.storageKey ?? null, primaryImageUrl: img?.url ?? null, minPriceMinor: prices.length ? Math.min(...prices) : null, maxPriceMinor: prices.length ? Math.max(...prices) : null, available: isPublic(ctx.db, p) && p.variants.some((v) => available(v) > 0), addedAt: w.addedAt };
      })
      .filter(Boolean);
    return slice(rows, ctx.query);
  }],
  ['PUT', '/wishlist/items/{productId}', (ctx) => {
    const me = requireUser(ctx);
    const list = (ctx.db.wishlist[me.id] ??= []);
    if (!ctx.db.products.some((p) => p.id === ctx.params.productId)) notFound('PRODUCT_NOT_FOUND');
    if (!list.some((w) => w.productId === ctx.params.productId)) list.unshift({ productId: ctx.params.productId, addedAt: now() });
    return undefined;
  }],
  ['DELETE', '/wishlist/items/{productId}', (ctx) => {
    const me = requireUser(ctx);
    ctx.db.wishlist[me.id] = (ctx.db.wishlist[me.id] ?? []).filter((w) => w.productId !== ctx.params.productId);
    return undefined;
  }],

  // Giỏ hàng
  ['GET', '/cart', (ctx) => cartResponse(ctx.db, cartOf(ctx.db, requireUser(ctx)))],
  ['POST', '/cart/items', (ctx) => {
    const cart = cartOf(ctx.db, requireUser(ctx));
    checkVersion(cart, ctx.body.expectedVersion);
    const found = findVariant(ctx.db, ctx.body.variantId);
    if (!found || !isPublic(ctx.db, found.product) || found.variant.status !== 'ACTIVE') fail(422, 'CART_VARIANT_UNAVAILABLE', 'Variant unavailable');
    const quantity = Number(ctx.body.quantity ?? 1);
    const existing = cart.items.find((i) => i.variantId === ctx.body.variantId);
    const next = (existing?.quantity ?? 0) + quantity;
    if (next > 99) fail(422, 'CART_QUANTITY_LIMIT', 'Max 99');
    if (next > available(found.variant)) fail(409, 'CART_STOCK_INSUFFICIENT', 'Not enough stock');
    if (!existing && cart.items.length >= 100) fail(422, 'CART_ITEM_LIMIT', 'Too many items');
    if (existing) Object.assign(existing, { quantity: next, selected: true });
    else cart.items.unshift({ id: uuid(), variantId: ctx.body.variantId, quantity, selected: true, addedAt: now() });
    bump(cart);
    return cartResponse(ctx.db, cart);
  }],
  ['PUT', '/cart/items/{itemId}', (ctx) => {
    const cart = cartOf(ctx.db, requireUser(ctx));
    checkVersion(cart, ctx.body.expectedVersion);
    const item = cart.items.find((i) => i.id === ctx.params.itemId);
    if (!item) notFound('CART_ITEM_NOT_FOUND');
    const found = findVariant(ctx.db, item.variantId);
    const quantity = Number(ctx.body.quantity);
    if (quantity > 99) fail(422, 'CART_QUANTITY_LIMIT', 'Max 99');
    if (found && quantity > item.quantity && quantity > available(found.variant)) fail(409, 'CART_STOCK_INSUFFICIENT', 'Not enough stock');
    Object.assign(item, { quantity, selected: Boolean(ctx.body.selected) });
    bump(cart);
    return cartResponse(ctx.db, cart);
  }],
  ['DELETE', '/cart/items/{itemId}', (ctx) => {
    const cart = cartOf(ctx.db, requireUser(ctx));
    checkVersion(cart, ctx.query.get('expectedVersion'));
    cart.items = cart.items.filter((i) => i.id !== ctx.params.itemId);
    bump(cart);
    return cartResponse(ctx.db, cart);
  }],
  ['PUT', '/cart/selection', (ctx) => {
    const cart = cartOf(ctx.db, requireUser(ctx));
    checkVersion(cart, ctx.body.expectedVersion);
    const ids = new Set(ctx.body.itemIds ?? []);
    cart.items.forEach((i) => {
      if (ids.has(i.id)) i.selected = Boolean(ctx.body.selected);
    });
    bump(cart);
    return cartResponse(ctx.db, cart);
  }],

  // Thanh toán + đơn hàng
  ['POST', '/checkout/preview', (ctx) => buildPreview(ctx.db, requireUser(ctx), ctx.body)],
  ['GET', '/checkout/{snapshotId}/payment-methods', (ctx) => {
    const me = requireUser(ctx);
    const snap = ctx.db.snapshots[ctx.params.snapshotId];
    if (!snap || snap.buyerId !== me.id) notFound('CHECKOUT_SNAPSHOT_NOT_FOUND');
    return paymentMethods(ctx.db, snap);
  }],
  ['GET', '/vouchers/available', (ctx) => {
    const me = requireUser(ctx);
    const shopId = ctx.query.get('shopId');
    const subtotal = Number(ctx.query.get('subtotalMinor') ?? 0);
    const shipping = Number(ctx.query.get('shippingFeeMinor') ?? 0);
    return ctx.db.vouchers
      .filter((v) => v.shopId === shopId && !checkVoucher(ctx.db, v, me.id, subtotal))
      .map((v) => ({ id: v.id, shopId: v.shopId, code: v.code, name: v.name, description: v.description, appliesTo: v.appliesTo, discountType: v.discountType, discountRateBp: v.discountRateBp, discountAmountMinor: v.discountAmountMinor, maxDiscountMinor: v.maxDiscountMinor, minSpendMinor: v.minSpendMinor, remainingUses: v.usageLimit - v.usedCount, remainingUsesForBuyer: v.perUserLimit - usedByBuyer(ctx.db, v.id, me.id), estimatedDiscountMinor: voucherDiscount(v, subtotal, shipping), startsAt: v.startsAt, endsAt: v.endsAt }))
      .filter((v) => v.estimatedDiscountMinor > 0);
  }],
  ['POST', '/orders', (ctx) => placeOrder(ctx.db, requireUser(ctx), ctx.body, ctx.headers?.get?.('Idempotency-Key'))],
  ['GET', '/orders', (ctx) => {
    const me = requireUser(ctx);
    return slice(ctx.db.orders.filter((o) => o.buyerId === me.id).sort(byNewest('placedAt')).map((o) => orderSummary(ctx.db, o)), ctx.query);
  }],
  ['GET', '/orders/{orderId}', (ctx) => {
    const me = requireUser(ctx);
    const order = ctx.db.orders.find((o) => o.id === ctx.params.orderId && o.buyerId === me.id);
    if (!order) notFound('ORDER_NOT_FOUND');
    return orderResponse(ctx.db, order);
  }],
  ['POST', '/orders/{orderId}/cancel', (ctx) => {
    const me = requireUser(ctx);
    const order = ctx.db.orders.find((o) => o.id === ctx.params.orderId && o.buyerId === me.id);
    if (!order) notFound('ORDER_NOT_FOUND');
    if (!['PENDING_PAYMENT', 'CONFIRMED'].includes(order.status)) fail(409, 'ORDER_NOT_CANCELLABLE', 'Order cannot be cancelled');
    ctx.db.shopOrders.filter((so) => so.orderId === order.id && so.status !== 'CANCELLED').forEach((so) => {
      so.status = 'CANCELLED';
      so.cancelledAt = now();
      so.updatedAt = now();
      so.sellerNote = so.sellerNote ?? `Khách hủy: ${ctx.body?.reason ?? ''}`.trim();
      releaseStock(ctx.db, so);
      const cod = ctx.db.cod.find((c) => c.shopOrderId === so.id);
      if (cod) Object.assign(cod, { status: 'CANCELLED', paymentStatus: 'CANCELLED', updatedAt: now() });
      const shop = ctx.db.shops.find((s) => s.id === so.shopId);
      pushNotification(ctx.db, shop.ownerUserId, 'SHOP_ORDER_CANCELLED', 'Khách đã hủy đơn', `Đơn ${so.shopOrderNumber} đã bị khách hủy.`, { shopOrderId: so.id });
    });
    order.payment.status = 'CANCELLED';
    syncOrderStatus(ctx.db, order);
    return orderResponse(ctx.db, order);
  }],

  // Đánh giá
  ['POST', '/order-items/{orderItemId}/review', (ctx) => {
    const me = requireUser(ctx);
    const { so, item } = myOrderItem(ctx.db, me, ctx.params.orderItemId);
    if (!['DELIVERED', 'COMPLETED'].includes(so.status)) fail(409, 'REVIEW_NOT_ELIGIBLE', 'Chỉ đánh giá được đơn đã giao');
    if (ctx.db.reviews.some((r) => r.orderItemId === item.id)) fail(409, 'REVIEW_ALREADY_EXISTS', 'Already reviewed');
    const rating = Number(ctx.body.rating);
    if (!(rating >= 1 && rating <= 5)) bad();
    const row = { id: uuid(), orderItemId: item.id, productId: item.productId, shopId: so.shopId, buyerId: me.id, rating, title: ctx.body.title ?? null, body: ctx.body.body ?? null, mediaKeys: ctx.body.mediaKeys ?? [], buyerDisplayName: me.displayName, sellerReply: null, sellerRepliedAt: null, status: 'PUBLISHED', moderationReason: null, createdAt: now(), updatedAt: now() };
    ctx.db.reviews.unshift(row);
    return reviewResponse(row);
  }],
  ['PUT', '/reviews/{reviewId}', (ctx) => {
    const me = requireUser(ctx);
    const row = ctx.db.reviews.find((r) => r.id === ctx.params.reviewId && r.buyerId === me.id);
    if (!row) notFound('REVIEW_NOT_FOUND');
    Object.assign(row, { rating: Number(ctx.body.rating), title: ctx.body.title ?? null, body: ctx.body.body ?? null, mediaKeys: ctx.body.mediaKeys ?? [], updatedAt: now() });
    return reviewResponse(row);
  }],

  // Trả hàng (người mua)
  ['POST', '/returns', (ctx) => {
    const me = requireUser(ctx);
    const so = ctx.db.shopOrders.find((x) => x.id === ctx.body.shopOrderId && x.buyerId === me.id);
    if (!so) notFound('SHOP_ORDER_NOT_FOUND');
    const shop = ctx.db.shops.find((s) => s.id === so.shopId);
    const windowEnd = Date.parse(so.completedAt ?? so.updatedAt) + shop.settings.returnWindowDays * 86400000;
    if (!['COMPLETED', 'RETURNED'].includes(so.status) || Date.now() > windowEnd) fail(422, 'RETURN_NOT_ELIGIBLE', 'Shop order is outside its return window');
    if (ctx.db.returns.some((r) => r.shopOrderId === so.id && !['CANCELLED', 'REJECTED'].includes(r.status))) fail(409, 'RETURN_ALREADY_REQUESTED', 'Đơn này đã có yêu cầu trả hàng');
    const items = (ctx.body.items ?? []).map((req) => {
      const item = so.items.find((i) => i.id === req.orderItemId);
      if (!item || req.quantity < 1 || req.quantity > item.quantity) bad('RETURN_ITEM_INVALID');
      return { orderItemId: item.id, productId: item.productId, variantId: item.variantId, productName: item.productName, sellerSku: item.sellerSku, purchasedQuantity: item.quantity, returnQuantity: req.quantity, requestedRefundMinor: Math.round((item.lineTotalMinor / item.quantity) * req.quantity) };
    });
    if (!items.length) bad('RETURN_ITEM_INVALID');
    const at = now();
    const row = { id: uuid(), orderId: so.orderId, shopOrderId: so.id, shopOrderNumber: so.shopOrderNumber, shopId: so.shopId, buyerId: me.id, reasonCode: ctx.body.reasonCode, description: ctx.body.description ?? null, evidenceKeys: ctx.body.evidenceKeys ?? [], status: 'REQUESTED', decisionNote: null, createdAt: at, updatedAt: at, dispatchedAt: null, receivedAt: null, carrierCode: null, trackingNumber: null, items, requestedRefundMinor: items.reduce((s, i) => s + i.requestedRefundMinor, 0), refund: null, events: [{ id: uuid(), fromStatus: null, toStatus: 'REQUESTED', actorUserId: me.id, note: null, occurredAt: at }] };
    ctx.db.returns.unshift(row);
    pushNotification(ctx.db, shop.ownerUserId, 'RETURN_REQUESTED', 'Có yêu cầu trả hàng', `Đơn ${so.shopOrderNumber} có yêu cầu trả hàng.`, { returnId: row.id });
    return returnResponse(ctx.db, row);
  }],
  ['GET', '/returns', (ctx) => {
    const me = requireUser(ctx);
    return slice(ctx.db.returns.filter((r) => r.buyerId === me.id).sort(byNewest()).map(returnSummary), ctx.query);
  }],
  ['GET', '/returns/{returnId}', (ctx) => {
    const me = requireUser(ctx);
    const r = ctx.db.returns.find((x) => x.id === ctx.params.returnId && x.buyerId === me.id);
    if (!r) notFound('RETURN_NOT_FOUND');
    return returnResponse(ctx.db, r);
  }],
  ['POST', '/returns/{returnId}/cancel', (ctx) => {
    const me = requireUser(ctx);
    const r = ctx.db.returns.find((x) => x.id === ctx.params.returnId && x.buyerId === me.id);
    if (!r) notFound('RETURN_NOT_FOUND');
    if (r.status !== 'REQUESTED') fail(409, 'RETURN_NOT_CANCELLABLE', 'Cannot cancel');
    moveReturn(r, 'CANCELLED', me.id);
    return returnResponse(ctx.db, r);
  }],
  ['POST', '/returns/{returnId}/dispatch', (ctx) => {
    const me = requireUser(ctx);
    const r = ctx.db.returns.find((x) => x.id === ctx.params.returnId && x.buyerId === me.id);
    if (!r) notFound('RETURN_NOT_FOUND');
    if (r.status !== 'APPROVED') fail(409, 'RETURN_NOT_DISPATCHABLE', 'Not approved');
    Object.assign(r, { carrierCode: ctx.body.carrierCode, trackingNumber: ctx.body.trackingNumber, dispatchedAt: now() });
    moveReturn(r, 'RETURNING', me.id);
    return returnResponse(ctx.db, r);
  }],
];
