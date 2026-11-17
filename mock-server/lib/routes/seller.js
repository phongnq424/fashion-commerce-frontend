// Kênh người bán: đăng ký bán hàng, shop, nhân viên, sản phẩm, đơn, COD, trả hàng, voucher, tài chính, báo cáo
import { requireShop, requireUser } from '../guard.js';
import {
  completeShopOrder,
  financeEntry,
  findVariant,
  productResponse,
  refreshVariant,
  releaseStock,
  shopOrderDetail,
  shopOrderSummary,
  shopProductSummary,
  shopResponse,
  shopSummary,
  syncOrderStatus,
} from '../logic.js';
import { reviewResponse } from './auth.js';
import { moveReturn, returnResponse, returnSummary } from './buyer.js';
import { bad, byNewest, clone, conflict, fail, notFound, now, pushNotification, slice, slugify, uuid } from '../util.js';

// ---------------------------------------------------------------- đăng ký bán hàng
export const SELLER_POLICIES = [
  { version: 'seller-terms-2026.1', title: 'Điều khoản người bán TrendyLab', required: true, effectiveAt: '2026-01-01T00:00:00Z' },
  { version: 'prohibited-items-2026.1', title: 'Chính sách hàng cấm và hạn chế', required: true, effectiveAt: '2026-01-01T00:00:00Z' },
  { version: 'marketing-2026.1', title: 'Nhận thông tin khuyến mãi dành cho người bán', required: false, effectiveAt: '2026-01-01T00:00:00Z' },
];
const PROVIDERS = [
  { code: 'GHN', name: 'Giao Hàng Nhanh', description: 'Bàn giao thủ công, nhập mã vận đơn khi giao hàng' },
  { code: 'GHTK', name: 'Giao Hàng Tiết Kiệm', description: 'Bàn giao thủ công, nhập mã vận đơn khi giao hàng' },
  { code: 'VIETTEL_POST', name: 'Viettel Post', description: 'Bàn giao thủ công, nhập mã vận đơn khi giao hàng' },
];

function myOnboarding(ctx, id) {
  const me = requireUser(ctx);
  const row = ctx.db.onboardings.find((o) => o.id === id && o.applicantUserId === me.id);
  if (!row) notFound('SELLER_ONBOARDING_NOT_FOUND');
  return row;
}
function editable(ctx, id) {
  const row = myOnboarding(ctx, id);
  if (!['DRAFT', 'REJECTED'].includes(row.status)) conflict('SELLER_ONBOARDING_NOT_EDITABLE');
  row.updatedAt = now();
  return row;
}
const shopProfile = (body, current) => ({
  shopId: current?.shopId ?? uuid(),
  name: String(body.name).trim(),
  slug: current?.slug ?? slugify(body.name),
  email: String(body.email).trim(),
  phone: String(body.phone).trim(),
  avatarKey: body.avatarKey ?? null,
  avatarUrl: body.avatarKey ?? null,
  description: body.description ?? null,
  coverKey: body.coverKey ?? null,
  coverUrl: body.coverKey ?? null,
  status: 'DRAFT',
});
const strip = (o) => clone(o);

// ---------------------------------------------------------------- sản phẩm
function shopProduct(ctx, shopId, productId, perm = 'catalog') {
  const { shop, me } = requireShop(ctx, shopId, perm);
  const product = ctx.db.products.find((p) => p.id === productId && p.shopId === shop.id);
  if (!product) notFound('PRODUCT_NOT_FOUND');
  return { shop, me, product };
}
function mutate(product, expectedVersion) {
  if (Number(expectedVersion) !== product.version) conflict('PRODUCT_VERSION_CONFLICT');
  product.version += 1;
  product.updatedAt = now();
}
function newVariant(body) {
  return refreshVariant({
    id: uuid(),
    sellerSku: String(body.sellerSku).trim(),
    barcode: body.barcode ?? null,
    selections: { ...body.selections },
    priceMinor: Number(body.priceMinor),
    compareAtPriceMinor: body.compareAtPriceMinor ? Number(body.compareAtPriceMinor) : null,
    weightGrams: Number(body.weightGrams ?? 300),
    lengthMm: body.lengthMm ?? null,
    widthMm: body.widthMm ?? null,
    heightMm: body.heightMm ?? null,
    status: 'ACTIVE',
    quantityOnHand: Number(body.initialStock ?? 0),
    quantityReserved: 0,
    reorderPoint: Number(body.reorderPoint ?? 0),
  });
}
function skuTaken(db, shopId, sku, exceptVariantId) {
  return db.products.some((p) => p.shopId === shopId && p.variants.some((v) => v.id !== exceptVariantId && v.sellerSku.toLowerCase() === String(sku).toLowerCase()));
}

// ---------------------------------------------------------------- đơn của shop
function shopOrder(ctx, shopId, shopOrderId, perm = 'orders') {
  const { shop, me } = requireShop(ctx, shopId, perm);
  const so = ctx.db.shopOrders.find((x) => x.id === shopOrderId && x.shopId === shop.id);
  if (!so) notFound('SHOP_ORDER_NOT_FOUND');
  return { shop, me, so };
}
const orderOf = (db, so) => db.orders.find((o) => o.id === so.orderId);
function touch(db, so, status) {
  if (status) so.status = status;
  so.updatedAt = now();
  syncOrderStatus(db, orderOf(db, so));
}
const STATUS_TEXT = { PROCESSING: 'Shop đã xác nhận đơn', READY_TO_SHIP: 'Shop đã đóng gói', SHIPPED: 'Đơn đang được giao', COMPLETED: 'Giao hàng thành công', CANCELLED: 'Đơn đã bị hủy' };
const notifyBuyer = (db, so) => pushNotification(db, so.buyerId, `ORDER_${so.status}`, STATUS_TEXT[so.status] ?? 'Cập nhật đơn hàng', `Đơn ${so.shopOrderNumber}: ${STATUS_TEXT[so.status] ?? so.status}.`, { orderId: so.orderId, shopOrderId: so.id });

function syncPayment(db, so) {
  const order = orderOf(db, so);
  const cods = db.cod.filter((c) => c.orderId === order.id && c.status !== 'CANCELLED');
  if (cods.length && cods.every((c) => ['COLLECTED', 'RECONCILED'].includes(c.status))) {
    order.payment.status = 'PAID';
    order.payment.paidAt = order.payment.paidAt ?? now();
    order.paidAt = order.paidAt ?? now();
  }
}

// COD summary
const codSummary = (db, c) => ({
  id: c.id,
  paymentId: c.paymentId,
  orderId: c.orderId,
  orderNumber: c.orderNumber,
  shopOrderId: c.shopOrderId,
  shopOrderNumber: c.shopOrderNumber,
  shopOrderStatus: db.shopOrders.find((so) => so.id === c.shopOrderId)?.status ?? null,
  status: c.status,
  expectedAmountMinor: c.expectedAmountMinor,
  collectedAmountMinor: c.collectedAmountMinor,
  currency: 'VND',
  paymentStatus: c.paymentStatus,
  collectedAt: c.collectedAt,
  reconciledAt: c.reconciledAt,
  updatedAt: c.updatedAt,
});
function moveCod(c, toStatus, actorUserId, extra = {}) {
  c.events.push({ id: uuid(), fromStatus: c.status, toStatus, actorUserId, amountMinor: extra.amountMinor ?? null, reference: extra.reference ?? null, reason: extra.reason ?? null, occurredAt: now(), createdAt: now() });
  c.status = toStatus;
  c.version += 1;
  c.updatedAt = now();
}

// ---------------------------------------------------------------- voucher
const voucherView = (v) => clone(v);
function voucherFields(body) {
  if (body.discountType === 'PERCENT' && !(body.discountRateBp >= 1 && body.discountRateBp <= 10000)) bad('VOUCHER_DISCOUNT_INVALID');
  if (body.discountType === 'FIXED' && !(body.discountAmountMinor > 0)) bad('VOUCHER_DISCOUNT_INVALID');
  if (!(Date.parse(body.endsAt) > Date.parse(body.startsAt))) bad('VOUCHER_WINDOW_INVALID');
  return {
    name: body.name,
    description: body.description ?? null,
    appliesTo: body.appliesTo,
    discountType: body.discountType,
    discountRateBp: body.discountType === 'PERCENT' ? body.discountRateBp : null,
    discountAmountMinor: body.discountType === 'FIXED' ? body.discountAmountMinor : null,
    maxDiscountMinor: body.maxDiscountMinor ?? null,
    minSpendMinor: body.minSpendMinor ?? 0,
    usageLimit: body.usageLimit,
    perUserLimit: body.perUserLimit,
    startsAt: body.startsAt,
    endsAt: body.endsAt,
  };
}
function shopVoucher(ctx) {
  const { shop } = requireShop(ctx, ctx.params.shopId, 'voucher');
  const v = ctx.db.vouchers.find((x) => x.id === ctx.params.voucherId && x.shopId === shop.id);
  if (!v) notFound('VOUCHER_NOT_FOUND');
  return v;
}

// ---------------------------------------------------------------- báo cáo
function inRange(iso, query) {
  const day = String(iso ?? '').slice(0, 10);
  const to = query.get('to') ?? new Date().toISOString().slice(0, 10);
  const from = query.get('from') ?? new Date(Date.parse(to) - 29 * 86400000).toISOString().slice(0, 10);
  return day >= from && day <= to;
}
function period(query) {
  const to = query.get('to') ?? new Date().toISOString().slice(0, 10);
  const from = query.get('from') ?? new Date(Date.parse(to) - 29 * 86400000).toISOString().slice(0, 10);
  return { from, to, timezone: 'Asia/Ho_Chi_Minh' };
}

// ---------------------------------------------------------------- nhân viên
const ASSIGNABLE = [
  { code: 'SHOP_MANAGER', name: 'Quản lý shop', description: 'Quản lý sản phẩm, đơn hàng, voucher, báo cáo' },
  { code: 'SHOP_CATALOG', name: 'Nhân viên sản phẩm', description: 'Thêm, sửa sản phẩm và xem tồn kho' },
  { code: 'SHOP_ORDERS', name: 'Nhân viên đơn hàng', description: 'Xử lý, giao đơn' },
  { code: 'SHOP_SUPPORT', name: 'Nhân viên CSKH', description: 'Trả hàng và trả lời đánh giá' },
  { code: 'SHOP_FINANCE', name: 'Nhân viên tài chính', description: 'Xem doanh số và báo cáo tài chính' },
];
const validRoles = (roles) => {
  if (!roles?.length || roles.some((r) => !ASSIGNABLE.some((a) => a.code === r))) bad('SHOP_ROLE_INVALID');
};
const transferView = (db, t) => ({ ...clone(t), shopName: db.shops.find((s) => s.id === t.shopId)?.name ?? null });
const expire = (t) => {
  if (t.status === 'PENDING' && Date.parse(t.expiresAt) < Date.now()) t.status = 'EXPIRED';
  return t;
};

export const sellerRoutes = [
  // ----- Đăng ký bán hàng -----
  ['POST', '/seller/onboarding', (ctx) => {
    const me = requireUser(ctx);
    if (ctx.db.onboardings.some((o) => o.applicantUserId === me.id && ['DRAFT', 'PENDING_REVIEW', 'REJECTED'].includes(o.status))) conflict('SELLER_ONBOARDING_EXISTS');
    const row = { id: uuid(), applicantUserId: me.id, status: 'DRAFT', shop: shopProfile(ctx.body), pickupAddresses: [], shippingProviders: PROVIDERS.map((x) => ({ ...x, available: true, enabled: false, pickupAddressId: null })), taxProfile: null, identityVerification: null, acceptedPolicyVersions: [], submittedAt: null, reviewedBy: null, reviewedAt: null, reviewNote: null, completedAt: null, createdAt: now(), updatedAt: now() };
    ctx.db.onboardings.unshift(row);
    return strip(row);
  }],
  ['GET', '/seller/onboarding/me', (ctx) => {
    const me = requireUser(ctx);
    const row = ctx.db.onboardings.filter((o) => o.applicantUserId === me.id).sort(byNewest())[0];
    if (!row) notFound('SELLER_ONBOARDING_NOT_FOUND');
    return strip(row);
  }],
  ['GET', '/seller/onboarding/{onboardingId}', (ctx) => strip(myOnboarding(ctx, ctx.params.onboardingId))],
  ['PUT', '/seller/onboarding/{onboardingId}/shop', (ctx) => {
    const row = editable(ctx, ctx.params.onboardingId);
    row.shop = shopProfile(ctx.body, row.shop);
    return strip(row);
  }],
  ['PUT', '/seller/onboarding/{onboardingId}/pickup-address', (ctx) => {
    const row = editable(ctx, ctx.params.onboardingId);
    const address = { id: row.pickupAddresses[0]?.id ?? uuid(), contactName: ctx.body.contactName, contactPhone: ctx.body.contactPhone, provinceCode: ctx.body.provinceCode ?? null, provinceName: ctx.body.provinceName, wardCode: ctx.body.wardCode ?? null, wardName: ctx.body.wardName, addressDetail: ctx.body.addressDetail, defaultPickup: true, active: true };
    row.pickupAddresses = [address];
    row.shippingProviders.forEach((x) => {
      if (x.enabled) x.pickupAddressId = address.id;
    });
    return address;
  }],
  ['GET', '/seller/onboarding/{onboardingId}/shipping-providers', (ctx) => clone(myOnboarding(ctx, ctx.params.onboardingId).shippingProviders)],
  ['PUT', '/seller/onboarding/{onboardingId}/shipping', (ctx) => {
    const row = editable(ctx, ctx.params.onboardingId);
    if (!row.pickupAddresses.some((a) => a.id === ctx.body.pickupAddressId)) bad('PICKUP_ADDRESS_INVALID');
    if (!(ctx.body.providers ?? []).some((x) => x.enabled)) bad('SHIPPING_PROVIDER_REQUIRED');
    row.shippingProviders = row.shippingProviders.map((x) => {
      const enabled = Boolean(ctx.body.providers.find((s) => s.providerCode === x.code)?.enabled);
      return { ...x, enabled, pickupAddressId: enabled ? ctx.body.pickupAddressId : null };
    });
    return clone(row.shippingProviders);
  }],
  ['PUT', '/seller/onboarding/{onboardingId}/tax', (ctx) => {
    const row = editable(ctx, ctx.params.onboardingId);
    if (!/^[0-9A-Za-z-]{8,32}$/.test(ctx.body.taxCode ?? '')) bad('SELLER_TAX_PROFILE_INVALID');
    row.taxProfile = { ...clone(ctx.body), status: 'PENDING', reviewedBy: null, reviewedAt: null, reviewNote: null };
    return clone(row.taxProfile);
  }],
  ['PUT', '/seller/onboarding/{onboardingId}/identity', (ctx) => {
    const row = editable(ctx, ctx.params.onboardingId);
    if (!row.taxProfile) conflict('SELLER_TAX_PROFILE_REQUIRED');
    row.identityVerification = { documentType: 'CCCD', ...clone(ctx.body), status: 'PENDING', reviewedBy: null, reviewedAt: null, reviewNote: null };
    return strip(row);
  }],
  ['GET', '/seller/onboarding/{onboardingId}/policies', (ctx) => {
    const row = myOnboarding(ctx, ctx.params.onboardingId);
    return SELLER_POLICIES.map((x) => ({ ...x, accepted: row.acceptedPolicyVersions.includes(x.version) }));
  }],
  ['POST', '/seller/onboarding/{onboardingId}/policy-acceptances', (ctx) => {
    const row = editable(ctx, ctx.params.onboardingId);
    if (!SELLER_POLICIES.some((x) => x.version === ctx.body.policyVersion)) bad('SELLER_POLICY_VERSION_INVALID');
    if (!row.acceptedPolicyVersions.includes(ctx.body.policyVersion)) row.acceptedPolicyVersions.push(ctx.body.policyVersion);
    return strip(row);
  }],
  ['POST', '/seller/onboarding/{onboardingId}/complete', (ctx) => {
    const row = editable(ctx, ctx.params.onboardingId);
    const requiredOk = SELLER_POLICIES.filter((x) => x.required).every((x) => row.acceptedPolicyVersions.includes(x.version));
    if (!row.shop?.name || !row.pickupAddresses.length || !row.shippingProviders.some((x) => x.enabled) || !row.taxProfile || !row.identityVerification || !requiredOk) {
      fail(409, 'SELLER_ONBOARDING_INCOMPLETE', 'Onboarding is incomplete');
    }
    Object.assign(row, { status: 'PENDING_REVIEW', submittedAt: now(), reviewNote: null });
    ctx.db.applications.unshift({ id: uuid(), applicantUserId: row.applicantUserId, proposedShopName: row.shop.name, contactEmail: row.shop.email, status: 'UNDER_REVIEW', reviewedAt: null, createdAt: row.createdAt, updatedAt: now() });
    ctx.db.users.filter((u) => u.roles.includes('PLATFORM_ADMIN') || u.roles.includes('PLATFORM_MODERATOR')).forEach((u) => pushNotification(ctx.db, u.id, 'SELLER_ONBOARDING_SUBMITTED', 'Hồ sơ bán hàng mới', `${row.shop.name} vừa gửi hồ sơ mở shop.`, { onboardingId: row.id }));
    return strip(row);
  }],
  ['GET', '/seller/applications', (ctx) => {
    const me = requireUser(ctx);
    return slice(ctx.db.applications.filter((a) => a.applicantUserId === me.id), ctx.query);
  }],

  // ----- Shop -----
  ['GET', '/shops/mine', (ctx) => {
    const me = requireUser(ctx);
    const mine = ctx.db.shops.filter((s) => s.members.some((m) => m.userId === me.id && m.status === 'ACTIVE') && s.status !== 'CLOSED');
    return slice(mine.map(shopSummary), ctx.query);
  }],
  ['GET', '/shops/{shopId}', (ctx) => shopResponse(requireShop(ctx, ctx.params.shopId).shop)],
  ['PATCH', '/shops/{shopId}', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'profile');
    const b = ctx.body;
    if (b.slug && b.slug !== shop.slug) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(b.slug)) bad('SHOP_SLUG_INVALID');
      if (ctx.db.shops.some((s) => s.id !== shop.id && s.slug === b.slug)) conflict('SHOP_SLUG_TAKEN');
    }
    ['name', 'slug', 'description', 'contactEmail', 'contactPhone', 'pickupAddress'].forEach((k) => {
      if (b[k] !== undefined) shop[k] = b[k];
    });
    if (b.logoKey !== undefined) Object.assign(shop, { logoKey: b.logoKey, logoUrl: b.logoKey });
    if (b.bannerKey !== undefined) Object.assign(shop, { bannerKey: b.bannerKey, bannerUrl: b.bannerKey });
    shop.updatedAt = now();
    return shopResponse(shop);
  }],
  ['DELETE', '/shops/{shopId}', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'owner');
    Object.assign(shop, { status: 'CLOSED', updatedAt: now() });
    return undefined;
  }],
  ['GET', '/shops/{shopId}/settings', (ctx) => ({ shopId: ctx.params.shopId, ...clone(requireShop(ctx, ctx.params.shopId).shop.settings) })],
  ['PUT', '/shops/{shopId}/settings', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'settings');
    const b = ctx.body;
    if (!(b.handlingDays >= 0 && b.handlingDays <= 30 && b.returnWindowDays >= 0 && b.returnWindowDays <= 90 && b.defaultShippingFeeMinor >= 0)) bad('SHOP_SETTINGS_INVALID');
    shop.settings = { handlingDays: b.handlingDays, returnWindowDays: b.returnWindowDays, defaultShippingFeeMinor: b.defaultShippingFeeMinor, allowCod: Boolean(b.allowCod), autoAcceptOrders: Boolean(b.autoAcceptOrders) };
    return { shopId: shop.id, ...clone(shop.settings) };
  }],

  // ----- Nhân viên -----
  ['GET', '/shops/{shopId}/members', (ctx) => slice(clone(requireShop(ctx, ctx.params.shopId, 'staff.read').shop.members.filter((m) => m.status !== 'DECLINED')), ctx.query)],
  ['GET', '/shops/{shopId}/assignable-roles', (ctx) => {
    requireShop(ctx, ctx.params.shopId, 'staff.read');
    return ASSIGNABLE;
  }],
  ['POST', '/shops/{shopId}/members/invitations', (ctx) => {
    const { shop, me } = requireShop(ctx, ctx.params.shopId, 'staff');
    validRoles(ctx.body.roles);
    const email = String(ctx.body.email).trim().toLowerCase();
    const target = ctx.db.users.find((u) => u.email === email);
    if (!target) fail(404, 'USER_NOT_FOUND', 'Email chưa có tài khoản TrendyLab');
    if (shop.members.some((m) => m.userId === target.id && m.status !== 'DECLINED')) conflict('SHOP_MEMBER_EXISTS');
    const member = { memberId: uuid(), userId: target.id, email, displayName: target.displayName, status: 'INVITED', invitedBy: me.id, joinedAt: null, createdAt: now(), roles: ctx.body.roles };
    shop.members.push(member);
    pushNotification(ctx.db, target.id, 'SHOP_INVITATION', 'Lời mời làm nhân viên shop', `${shop.name} mời bạn tham gia quản lý shop.`, { shopId: shop.id });
    return clone(member);
  }],
  ['PUT', '/shops/{shopId}/members/{memberId}/roles', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'staff');
    validRoles(ctx.body.roles);
    const m = shop.members.find((x) => x.memberId === ctx.params.memberId);
    if (!m) notFound('SHOP_MEMBER_NOT_FOUND');
    if (m.roles.includes('SHOP_OWNER')) conflict('SHOP_OWNER_ROLE_LOCKED');
    m.roles = ctx.body.roles;
    return clone(m);
  }],
  ['DELETE', '/shops/{shopId}/members/me', (ctx) => {
    const { shop, me } = requireShop(ctx, ctx.params.shopId);
    if (shop.ownerUserId === me.id) conflict('SHOP_OWNER_CANNOT_LEAVE');
    shop.members = shop.members.filter((m) => m.userId !== me.id);
    return undefined;
  }],
  ['DELETE', '/shops/{shopId}/members/{memberId}', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'staff');
    const m = shop.members.find((x) => x.memberId === ctx.params.memberId);
    if (!m) notFound('SHOP_MEMBER_NOT_FOUND');
    if (m.roles.includes('SHOP_OWNER')) conflict('SHOP_OWNER_ROLE_LOCKED');
    shop.members = shop.members.filter((x) => x.memberId !== m.memberId);
    return undefined;
  }],
  ['GET', '/shop-invitations', (ctx) => {
    const me = requireUser(ctx);
    return ctx.db.shops.flatMap((s) => s.members.filter((m) => m.userId === me.id && m.status === 'INVITED').map((m) => ({ memberId: m.memberId, shopId: s.id, shopName: s.name, invitedBy: m.invitedBy, createdAt: m.createdAt, roles: [...m.roles] })));
  }],
  ['POST', '/shop-invitations/{memberId}/accept', (ctx) => {
    const me = requireUser(ctx);
    for (const s of ctx.db.shops) {
      const m = s.members.find((x) => x.memberId === ctx.params.memberId && x.userId === me.id && x.status === 'INVITED');
      if (m) {
        Object.assign(m, { status: 'ACTIVE', joinedAt: now() });
        return clone(m);
      }
    }
    return notFound('SHOP_INVITATION_NOT_FOUND');
  }],
  ['POST', '/shop-invitations/{memberId}/decline', (ctx) => {
    const me = requireUser(ctx);
    ctx.db.shops.forEach((s) => {
      s.members = s.members.filter((x) => !(x.memberId === ctx.params.memberId && x.userId === me.id && x.status === 'INVITED'));
    });
    return undefined;
  }],

  // ----- Chuyển quyền sở hữu -----
  ['POST', '/shops/{shopId}/ownership-transfers', (ctx) => {
    const { shop, me } = requireShop(ctx, ctx.params.shopId, 'owner');
    const target = shop.members.find((m) => m.userId === ctx.body.newOwnerUserId && m.status === 'ACTIVE');
    if (!target || target.userId === me.id) bad('OWNERSHIP_TARGET_INVALID');
    if (ctx.db.transfers.some((t) => t.shopId === shop.id && expire(t).status === 'PENDING')) conflict('OWNERSHIP_TRANSFER_PENDING');
    const t = { id: uuid(), shopId: shop.id, fromOwnerUserId: me.id, toUserId: target.userId, keepPreviousOwnerAsManager: Boolean(ctx.body.keepPreviousOwnerAsManager), status: 'PENDING', expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(), decidedAt: null, createdAt: now() };
    ctx.db.transfers.unshift(t);
    pushNotification(ctx.db, target.userId, 'SHOP_OWNERSHIP_TRANSFER', 'Đề nghị nhận quyền sở hữu shop', `Bạn được đề nghị trở thành chủ ${shop.name}.`, { transferId: t.id });
    return transferView(ctx.db, t);
  }],
  ['GET', '/shops/{shopId}/ownership-transfers', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'owner');
    return ctx.db.transfers.filter((t) => t.shopId === shop.id).map((t) => transferView(ctx.db, expire(t)));
  }],
  ['GET', '/shop-ownership-transfers', (ctx) => {
    const me = requireUser(ctx);
    return ctx.db.transfers.filter((t) => t.toUserId === me.id).map((t) => transferView(ctx.db, expire(t)));
  }],
  ['POST', '/shop-ownership-transfers/{transferId}/accept', (ctx) => {
    const me = requireUser(ctx);
    const t = ctx.db.transfers.find((x) => x.id === ctx.params.transferId && x.toUserId === me.id);
    if (!t) notFound('OWNERSHIP_TRANSFER_NOT_FOUND');
    if (expire(t).status !== 'PENDING') conflict('OWNERSHIP_TRANSFER_NOT_PENDING');
    const shop = ctx.db.shops.find((s) => s.id === t.shopId);
    const previous = shop.ownerUserId;
    shop.ownerUserId = me.id;
    shop.members.find((m) => m.userId === me.id).roles = ['SHOP_OWNER'];
    const old = shop.members.find((m) => m.userId === previous);
    if (old) {
      if (t.keepPreviousOwnerAsManager) old.roles = ['SHOP_MANAGER'];
      else shop.members = shop.members.filter((m) => m.userId !== previous);
    }
    Object.assign(t, { status: 'ACCEPTED', decidedAt: now() });
    return shopResponse(shop);
  }],
  ['POST', '/shop-ownership-transfers/{transferId}/reject', (ctx) => {
    const me = requireUser(ctx);
    const t = ctx.db.transfers.find((x) => x.id === ctx.params.transferId && x.toUserId === me.id);
    if (!t) notFound('OWNERSHIP_TRANSFER_NOT_FOUND');
    if (expire(t).status !== 'PENDING') conflict('OWNERSHIP_TRANSFER_NOT_PENDING');
    Object.assign(t, { status: 'REJECTED', decidedAt: now() });
    return undefined;
  }],
  ['DELETE', '/shop-ownership-transfers/{transferId}', (ctx) => {
    const me = requireUser(ctx);
    const t = ctx.db.transfers.find((x) => x.id === ctx.params.transferId && x.fromOwnerUserId === me.id);
    if (!t) notFound('OWNERSHIP_TRANSFER_NOT_FOUND');
    if (expire(t).status !== 'PENDING') conflict('OWNERSHIP_TRANSFER_NOT_PENDING');
    Object.assign(t, { status: 'CANCELLED', decidedAt: now() });
    return undefined;
  }],

  // ----- Sản phẩm -----
  ['GET', '/shops/{shopId}/products', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'catalog.read');
    return slice(ctx.db.products.filter((x) => x.shopId === shop.id).sort(byNewest('updatedAt')).map(shopProductSummary), ctx.query);
  }],
  ['POST', '/shops/{shopId}/products', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'catalog');
    const b = ctx.body;
    if (!b.name?.trim() || !b.description?.trim() || !b.categoryId) bad();
    if (!b.variants?.length) bad('PRODUCT_VARIANT_REQUIRED');
    if (!b.images?.length) bad('PRODUCT_IMAGE_REQUIRED');
    const skus = b.variants.map((v) => String(v.sellerSku).toLowerCase());
    if (new Set(skus).size !== skus.length || b.variants.some((v) => skuTaken(ctx.db, shop.id, v.sellerSku))) conflict('PRODUCT_SKU_DUPLICATED');
    const variants = b.variants.map(newVariant);
    const at = now();
    const product = {
      id: uuid(),
      shopId: shop.id,
      categoryId: b.categoryId,
      brandId: b.brandId ?? null,
      sellerProductCode: b.sellerProductCode ?? null,
      name: b.name.trim(),
      slug: `${slugify(b.name)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      description: b.description.trim(),
      material: b.material ?? null,
      fitType: b.fitType ?? null,
      targetGender: b.targetGender,
      careInstructions: b.careInstructions ?? null,
      sizeChart: b.sizeChart ?? null,
      version: 0,
      status: 'DRAFT',
      publishedAt: null,
      options: (b.options ?? []).map((o) => ({ id: uuid(), type: o.type, displayName: o.displayName, sortOrder: o.sortOrder ?? 0, values: o.values.map((v, i) => ({ id: uuid(), code: v.code, label: v.label, hexColor: v.hexColor ?? null, sortOrder: v.sortOrder ?? i })) })),
      variants,
      images: b.images.map((img, i) => ({ id: uuid(), variantId: variants.find((v) => v.sellerSku === img.variantSellerSku)?.id ?? null, storageKey: img.storageKey, url: img.storageKey, altText: img.altText ?? null, sortOrder: img.sortOrder ?? i, primary: Boolean(img.primary) })),
      createdAt: at,
      updatedAt: at,
      soldCount: 0,
    };
    if (!product.images.some((i) => i.primary)) product.images[0].primary = true;
    ctx.db.products.unshift(product);
    return productResponse(product);
  }],
  ['GET', '/shops/{shopId}/products/{productId}', (ctx) => productResponse(shopProduct(ctx, ctx.params.shopId, ctx.params.productId, 'catalog.read').product)],
  ['PATCH', '/shops/{shopId}/products/{productId}', (ctx) => {
    const { product } = shopProduct(ctx, ctx.params.shopId, ctx.params.productId);
    mutate(product, ctx.body.expectedVersion);
    ['categoryId', 'brandId', 'sellerProductCode', 'name', 'description', 'material', 'fitType', 'targetGender', 'careInstructions', 'sizeChart'].forEach((k) => {
      if (ctx.body[k] !== undefined) product[k] = ctx.body[k];
    });
    if (!product.name || !product.description) bad();
    return productResponse(product);
  }],
  ['POST', '/shops/{shopId}/products/{productId}/publish', (ctx) => {
    const { product } = shopProduct(ctx, ctx.params.shopId, ctx.params.productId);
    if (product.status === 'REMOVED') conflict('PRODUCT_REMOVED');
    if (!product.variants.some((v) => v.status === 'ACTIVE')) conflict('PRODUCT_ACTIVE_VARIANT_REQUIRED');
    if (!product.images.some((i) => i.primary)) conflict('PRODUCT_PRIMARY_IMAGE_REQUIRED');
    mutate(product, ctx.query.get('expectedVersion'));
    Object.assign(product, { status: 'ACTIVE', publishedAt: product.publishedAt ?? now() });
    return productResponse(product);
  }],
  ['POST', '/shops/{shopId}/products/{productId}/unpublish', (ctx) => {
    const { product } = shopProduct(ctx, ctx.params.shopId, ctx.params.productId);
    mutate(product, ctx.query.get('expectedVersion'));
    product.status = 'ARCHIVED';
    return productResponse(product);
  }],
  ['POST', '/shops/{shopId}/products/{productId}/variants', (ctx) => {
    const { product, shop } = shopProduct(ctx, ctx.params.shopId, ctx.params.productId);
    if (skuTaken(ctx.db, shop.id, ctx.body.sellerSku)) conflict('PRODUCT_SKU_DUPLICATED');
    mutate(product, ctx.body.expectedVersion);
    product.variants.push(newVariant(ctx.body));
    return productResponse(product);
  }],
  ['PATCH', '/shops/{shopId}/products/{productId}/variants/{variantId}', (ctx) => {
    const { product, shop } = shopProduct(ctx, ctx.params.shopId, ctx.params.productId);
    const v = product.variants.find((x) => x.id === ctx.params.variantId);
    if (!v) notFound('PRODUCT_VARIANT_NOT_FOUND');
    if (ctx.body.sellerSku && skuTaken(ctx.db, shop.id, ctx.body.sellerSku, v.id)) conflict('PRODUCT_SKU_DUPLICATED');
    mutate(product, ctx.body.expectedVersion);
    ['sellerSku', 'barcode', 'weightGrams', 'lengthMm', 'widthMm', 'heightMm'].forEach((k) => {
      if (ctx.body[k] !== undefined && ctx.body[k] !== null) v[k] = ctx.body[k];
    });
    return productResponse(product);
  }],
  ['PUT', '/shops/{shopId}/products/{productId}/variants/{variantId}/price', (ctx) => {
    const { product } = shopProduct(ctx, ctx.params.shopId, ctx.params.productId);
    const v = product.variants.find((x) => x.id === ctx.params.variantId);
    if (!v) notFound('PRODUCT_VARIANT_NOT_FOUND');
    mutate(product, ctx.body.expectedVersion);
    Object.assign(v, { priceMinor: Number(ctx.body.priceMinor), compareAtPriceMinor: ctx.body.compareAtPriceMinor ?? null });
    return productResponse(product);
  }],
  ['PUT', '/shops/{shopId}/products/{productId}/variants/{variantId}/status', (ctx) => {
    const { product } = shopProduct(ctx, ctx.params.shopId, ctx.params.productId);
    const v = product.variants.find((x) => x.id === ctx.params.variantId);
    if (!v) notFound('PRODUCT_VARIANT_NOT_FOUND');
    mutate(product, ctx.body.expectedVersion);
    v.status = ctx.body.status;
    return productResponse(product);
  }],
  ['POST', '/shops/{shopId}/products/{productId}/images', (ctx) => {
    const { product } = shopProduct(ctx, ctx.params.shopId, ctx.params.productId);
    if (product.images.length >= 30) conflict('PRODUCT_IMAGE_LIMIT');
    mutate(product, ctx.body.expectedVersion);
    if (ctx.body.primary) product.images.forEach((i) => (i.primary = false));
    product.images.push({ id: uuid(), variantId: ctx.body.variantId ?? null, storageKey: ctx.body.storageKey, url: ctx.body.storageKey, altText: ctx.body.altText ?? null, sortOrder: ctx.body.sortOrder ?? product.images.length, primary: Boolean(ctx.body.primary) || product.images.length === 0 });
    return productResponse(product);
  }],
  ['DELETE', '/shops/{shopId}/products/{productId}/images/{imageId}', (ctx) => {
    const { product } = shopProduct(ctx, ctx.params.shopId, ctx.params.productId);
    if (!product.images.some((i) => i.id === ctx.params.imageId)) notFound('PRODUCT_IMAGE_NOT_FOUND');
    if (product.images.length <= 1) conflict('PRODUCT_IMAGE_REQUIRED');
    mutate(product, ctx.query.get('expectedVersion'));
    product.images = product.images.filter((i) => i.id !== ctx.params.imageId);
    if (!product.images.some((i) => i.primary)) product.images[0].primary = true;
    return productResponse(product);
  }],
  ['PUT', '/shops/{shopId}/products/{productId}/images/order', (ctx) => {
    const { product } = shopProduct(ctx, ctx.params.shopId, ctx.params.productId);
    mutate(product, ctx.body.expectedVersion);
    (ctx.body.items ?? []).forEach(({ imageId, sortOrder }) => {
      const img = product.images.find((i) => i.id === imageId);
      if (img) img.sortOrder = sortOrder;
    });
    product.images.sort((a, b) => a.sortOrder - b.sortOrder);
    return productResponse(product);
  }],
  ['PUT', '/shops/{shopId}/products/{productId}/images/{imageId}/primary', (ctx) => {
    const { product } = shopProduct(ctx, ctx.params.shopId, ctx.params.productId);
    if (!product.images.some((i) => i.id === ctx.params.imageId)) notFound('PRODUCT_IMAGE_NOT_FOUND');
    mutate(product, ctx.body.expectedVersion);
    product.images.forEach((i) => (i.primary = i.id === ctx.params.imageId));
    return productResponse(product);
  }],
  ['PUT', '/shops/{shopId}/products/variants/{variantId}/inventory', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'inventory');
    const found = findVariant(ctx.db, ctx.params.variantId);
    if (!found || found.product.shopId !== shop.id) notFound('PRODUCT_VARIANT_NOT_FOUND');
    const qty = Number(ctx.body.quantityOnHand);
    if (!(qty >= found.variant.quantityReserved)) conflict('INVENTORY_BELOW_RESERVED');
    Object.assign(found.variant, { quantityOnHand: qty, reorderPoint: Number(ctx.body.reorderPoint ?? 0) });
    refreshVariant(found.variant);
    found.product.updatedAt = now();
    return productResponse(found.product);
  }],

  // ----- Đơn của shop -----
  ['GET', '/shops/{shopId}/orders', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'orders.read');
    const status = ctx.query.get('status');
    return slice(ctx.db.shopOrders.filter((so) => so.shopId === shop.id && (!status || so.status === status)).sort(byNewest('placedAt')).map(shopOrderSummary), ctx.query);
  }],
  ['GET', '/shops/{shopId}/orders/{shopOrderId}', (ctx) => shopOrderDetail(shopOrder(ctx, ctx.params.shopId, ctx.params.shopOrderId, 'orders.read').so)],
  ['POST', '/shops/{shopId}/orders/{shopOrderId}/confirm', (ctx) => {
    const { so } = shopOrder(ctx, ctx.params.shopId, ctx.params.shopOrderId);
    if (so.status !== 'PENDING_CONFIRMATION') fail(409, 'SHOP_ORDER_TRANSITION_INVALID', 'Invalid transition');
    Object.assign(so, { confirmedAt: now(), sellerNote: ctx.body?.sellerNote ?? so.sellerNote });
    touch(ctx.db, so, 'PROCESSING');
    notifyBuyer(ctx.db, so);
    return shopOrderDetail(so);
  }],
  ['POST', '/shops/{shopId}/orders/{shopOrderId}/ready-to-ship', (ctx) => {
    const { so } = shopOrder(ctx, ctx.params.shopId, ctx.params.shopOrderId);
    if (so.status !== 'PROCESSING') fail(409, 'SHOP_ORDER_TRANSITION_INVALID', 'Invalid transition');
    touch(ctx.db, so, 'READY_TO_SHIP');
    return shopOrderDetail(so);
  }],
  ['POST', '/shops/{shopId}/orders/{shopOrderId}/cancel', (ctx) => {
    const { so } = shopOrder(ctx, ctx.params.shopId, ctx.params.shopOrderId);
    if (!['PENDING_PAYMENT', 'PENDING_CONFIRMATION', 'PROCESSING', 'READY_TO_SHIP'].includes(so.status)) fail(409, 'SHOP_ORDER_NOT_CANCELLABLE', 'Cannot cancel');
    if (!String(ctx.body.reason ?? '').trim()) bad();
    Object.assign(so, { cancelledAt: now(), sellerNote: ctx.body.reason });
    releaseStock(ctx.db, so);
    const cod = ctx.db.cod.find((c) => c.shopOrderId === so.id);
    if (cod) Object.assign(cod, { status: 'CANCELLED', paymentStatus: 'CANCELLED', updatedAt: now() });
    touch(ctx.db, so, 'CANCELLED');
    notifyBuyer(ctx.db, so);
    return shopOrderDetail(so);
  }],
  ['POST', '/shops/{shopId}/orders/{shopOrderId}/dispatch', (ctx) => {
    const { shop, so } = shopOrder(ctx, ctx.params.shopId, ctx.params.shopOrderId);
    if (so.status !== 'READY_TO_SHIP') fail(409, 'SHOP_ORDER_TRANSITION_INVALID', 'Invalid transition');
    if (!/^[A-Za-z0-9._-]+$/.test(ctx.body.carrierCode ?? '')) bad();
    const at = now();
    so.shipment = { id: uuid(), carrierCode: ctx.body.carrierCode, serviceCode: ctx.body.serviceCode ?? null, trackingNumber: ctx.body.trackingNumber ?? null, origin: clone(shop.pickupAddress), destination: clone(so.recipient), shippingFeeMinor: so.shippingFeeMinor, status: 'PICKED_UP', shippedAt: at, estimatedDeliveryAt: ctx.body.estimatedDeliveryAt ?? null, deliveredAt: null, createdAt: at, updatedAt: at, events: [{ id: uuid(), status: 'PICKED_UP', location: shop.pickupAddress?.province ?? null, description: 'Đơn vị vận chuyển đã lấy hàng', occurredAt: at, createdAt: at }] };
    touch(ctx.db, so, 'SHIPPED');
    notifyBuyer(ctx.db, so);
    return shopOrderDetail(so);
  }],
  ['POST', '/shops/{shopId}/orders/{shopOrderId}/shipment-status', (ctx) => {
    const { so } = shopOrder(ctx, ctx.params.shopId, ctx.params.shopOrderId);
    const TRANSITIONS = { PICKED_UP: ['IN_TRANSIT', 'DELIVERY_FAILED'], IN_TRANSIT: ['OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED'], OUT_FOR_DELIVERY: ['DELIVERED', 'DELIVERY_FAILED'], DELIVERY_FAILED: ['IN_TRANSIT', 'RETURNING'], RETURNING: ['RETURNED'] };
    if (!so.shipment) fail(409, 'SHIPMENT_NOT_FOUND', 'No shipment');
    const next = ctx.body.status;
    if (!(TRANSITIONS[so.shipment.status] ?? []).includes(next)) fail(409, 'SHIPMENT_TRANSITION_INVALID', `Shipment cannot transition from ${so.shipment.status} to ${next}`);
    const at = now();
    so.shipment.events.push({ id: uuid(), status: next, location: ctx.body.location ?? null, description: ctx.body.description ?? null, occurredAt: at, createdAt: at });
    Object.assign(so.shipment, { status: next, updatedAt: at });
    if (next === 'DELIVERED') {
      so.shipment.deliveredAt = at;
      completeShopOrder(ctx.db, so);
      touch(ctx.db, so);
      notifyBuyer(ctx.db, so);
    } else if (next === 'RETURNED') {
      releaseStock(ctx.db, so);
      const cod = ctx.db.cod.find((c) => c.shopOrderId === so.id);
      if (cod) Object.assign(cod, { status: 'CANCELLED', paymentStatus: 'CANCELLED', updatedAt: at });
      touch(ctx.db, so, 'RETURNED');
    } else {
      touch(ctx.db, so);
    }
    return shopOrderDetail(so);
  }],

  // ----- COD -----
  ['GET', '/shops/{shopId}/cod-payments', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'orders.read');
    const status = ctx.query.get('status');
    return slice(ctx.db.cod.filter((c) => c.shopId === shop.id && (!status || c.status === status)).sort(byNewest()).map((c) => codSummary(ctx.db, c)), ctx.query);
  }],
  ['GET', '/shops/{shopId}/cod-payments/{collectionId}', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'orders.read');
    const c = ctx.db.cod.find((x) => x.id === ctx.params.collectionId && x.shopId === shop.id);
    if (!c) notFound('COD_COLLECTION_NOT_FOUND');
    return clone(c);
  }],
  ['POST', '/shops/{shopId}/cod-payments/{collectionId}/collect', (ctx) => {
    const { shop, me } = requireShop(ctx, ctx.params.shopId, 'orders');
    const c = ctx.db.cod.find((x) => x.id === ctx.params.collectionId && x.shopId === shop.id);
    if (!c) notFound('COD_COLLECTION_NOT_FOUND');
    const so = ctx.db.shopOrders.find((x) => x.id === c.shopOrderId);
    if (!['AWAITING_COLLECTION', 'COLLECTION_FAILED'].includes(c.status)) conflict('COD_COLLECTION_TRANSITION_INVALID');
    if (!['DELIVERED', 'COMPLETED'].includes(so.status)) fail(409, 'COD_ORDER_NOT_DELIVERED', 'Đơn chưa giao xong');
    if (Number(ctx.body.amountCollectedMinor) !== c.expectedAmountMinor) fail(422, 'COD_AMOUNT_MISMATCH', 'Số tiền thu phải bằng số tiền dự kiến');
    moveCod(c, 'COLLECTED', me.id, { amountMinor: c.expectedAmountMinor, reference: ctx.body.collectionReference });
    Object.assign(c, { collectedAmountMinor: c.expectedAmountMinor, collectionReference: ctx.body.collectionReference, collectedAt: now(), collectedBy: me.id, paymentStatus: 'PAID' });
    syncPayment(ctx.db, so);
    return clone(c);
  }],
  ['POST', '/shops/{shopId}/cod-payments/{collectionId}/fail', (ctx) => {
    const { shop, me } = requireShop(ctx, ctx.params.shopId, 'orders');
    const c = ctx.db.cod.find((x) => x.id === ctx.params.collectionId && x.shopId === shop.id);
    if (!c) notFound('COD_COLLECTION_NOT_FOUND');
    if (c.status !== 'AWAITING_COLLECTION') conflict('COD_COLLECTION_TRANSITION_INVALID');
    moveCod(c, 'COLLECTION_FAILED', me.id, { reason: ctx.body.reason });
    Object.assign(c, { failureReason: ctx.body.reason, paymentStatus: 'FAILED' });
    return clone(c);
  }],
  ['POST', '/shops/{shopId}/cod-payments/{collectionId}/reconcile', (ctx) => {
    const { shop, me } = requireShop(ctx, ctx.params.shopId, 'orders');
    const c = ctx.db.cod.find((x) => x.id === ctx.params.collectionId && x.shopId === shop.id);
    if (!c) notFound('COD_COLLECTION_NOT_FOUND');
    if (c.status !== 'COLLECTED') conflict('COD_COLLECTION_TRANSITION_INVALID');
    moveCod(c, 'RECONCILED', me.id, { reference: ctx.body.reconciliationReference });
    Object.assign(c, { reconciledAt: now(), reconciledBy: me.id, reconciliationReference: ctx.body.reconciliationReference, reconciliationNote: ctx.body.note ?? null });
    return clone(c);
  }],

  // ----- Trả hàng phía shop -----
  ['GET', '/shops/{shopId}/returns', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'orders.read');
    return slice(ctx.db.returns.filter((r) => r.shopId === shop.id).sort(byNewest()).map(returnSummary), ctx.query);
  }],
  ['GET', '/shops/{shopId}/returns/{returnId}', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'orders.read');
    const r = ctx.db.returns.find((x) => x.id === ctx.params.returnId && x.shopId === shop.id);
    if (!r) notFound('RETURN_NOT_FOUND');
    return returnResponse(ctx.db, r);
  }],
  ['POST', '/shops/{shopId}/returns/{returnId}/decision', (ctx) => {
    const { shop, me } = requireShop(ctx, ctx.params.shopId, 'returns');
    const r = ctx.db.returns.find((x) => x.id === ctx.params.returnId && x.shopId === shop.id);
    if (!r) notFound('RETURN_NOT_FOUND');
    if (r.status !== 'REQUESTED') conflict('RETURN_TRANSITION_INVALID');
    r.decisionNote = ctx.body.note ?? null;
    moveReturn(r, ctx.body.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', me.id, r.decisionNote);
    pushNotification(ctx.db, r.buyerId, 'RETURN_DECIDED', r.status === 'APPROVED' ? 'Yêu cầu trả hàng được chấp nhận' : 'Yêu cầu trả hàng bị từ chối', `Đơn ${r.shopOrderNumber}.`, { returnId: r.id });
    return returnResponse(ctx.db, r);
  }],
  ['POST', '/shops/{shopId}/returns/{returnId}/receive', (ctx) => {
    const { shop, me } = requireShop(ctx, ctx.params.shopId, 'returns');
    const r = ctx.db.returns.find((x) => x.id === ctx.params.returnId && x.shopId === shop.id);
    if (!r) notFound('RETURN_NOT_FOUND');
    if (!['APPROVED', 'RETURNING'].includes(r.status)) conflict('RETURN_TRANSITION_INVALID');
    r.items.forEach((i) => {
      const found = findVariant(ctx.db, i.variantId);
      if (found) {
        found.variant.quantityOnHand += i.returnQuantity;
        refreshVariant(found.variant);
      }
    });
    r.receivedAt = now();
    moveReturn(r, 'RECEIVED', me.id, ctx.body?.note ?? null);
    return returnResponse(ctx.db, r);
  }],
  ['POST', '/shops/{shopId}/returns/{returnId}/manual-cod-refund', (ctx) => {
    const { shop, me } = requireShop(ctx, ctx.params.shopId, 'returns');
    const r = ctx.db.returns.find((x) => x.id === ctx.params.returnId && x.shopId === shop.id);
    if (!r) notFound('RETURN_NOT_FOUND');
    if (r.status !== 'RECEIVED') conflict('RETURN_TRANSITION_INVALID');
    const cod = ctx.db.cod.find((c) => c.shopOrderId === r.shopOrderId);
    if (!cod || !['COLLECTED', 'RECONCILED'].includes(cod.status)) fail(409, 'RETURN_COD_NOT_COLLECTED', 'COD chưa thu nên chưa hoàn tiền được');
    if (Number(ctx.body.amountMinor) !== r.requestedRefundMinor) fail(422, 'RETURN_REFUND_AMOUNT_MISMATCH', 'Số tiền hoàn phải bằng số tiền yêu cầu');
    r.refund = { id: uuid(), refundNumber: `RF${Date.now().toString().slice(-8)}`, amountMinor: r.requestedRefundMinor, method: 'MANUAL_COD', status: 'SUCCEEDED', reference: ctx.body.reference, processedBy: me.id, processedAt: now() };
    moveReturn(r, 'REFUNDED', me.id, ctx.body.note ?? null);
    const settlement = ctx.db.settlements.find((s) => s.shopOrderId === r.shopOrderId);
    const feeBack = settlement ? Math.round((r.requestedRefundMinor * settlement.platformFeeRateBp) / 10000) : 0;
    financeEntry(ctx.db, shop, 'REFUND_DEBIT', -r.requestedRefundMinor, `Hoàn tiền ${r.shopOrderNumber}`, 'RETURN', r.id);
    if (feeBack) financeEntry(ctx.db, shop, 'FEE_REVERSAL', feeBack, `Hoàn phí sàn ${r.shopOrderNumber}`, 'RETURN', r.id);
    if (settlement) {
      settlement.refundedMinor += r.requestedRefundMinor;
      settlement.feeReversedMinor += feeBack;
      settlement.netRevenueMinor = settlement.grossSalesMinor - settlement.platformFeeMinor + settlement.feeReversedMinor - settlement.refundedMinor;
    }
    const so = ctx.db.shopOrders.find((x) => x.id === r.shopOrderId);
    const full = r.items.every((i) => i.returnQuantity === i.purchasedQuantity) && r.items.length === so.items.length;
    if (full) touch(ctx.db, so, 'RETURNED');
    pushNotification(ctx.db, r.buyerId, 'COD_REFUND_COMPLETED', 'Đã hoàn tiền COD', `Shop đã hoàn tiền cho đơn ${r.shopOrderNumber}.`, { returnId: r.id });
    return returnResponse(ctx.db, r);
  }],

  // ----- Trả lời đánh giá -----
  ['PUT', '/shops/{shopId}/reviews/{reviewId}/reply', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'reviews');
    const r = ctx.db.reviews.find((x) => x.id === ctx.params.reviewId && x.shopId === shop.id);
    if (!r) notFound('REVIEW_NOT_FOUND');
    if (!String(ctx.body.reply ?? '').trim()) bad();
    Object.assign(r, { sellerReply: ctx.body.reply.trim(), sellerRepliedAt: now(), updatedAt: now() });
    return reviewResponse(r);
  }],

  // ----- Voucher -----
  ['GET', '/shops/{shopId}/vouchers', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'voucher');
    return slice(ctx.db.vouchers.filter((v) => v.shopId === shop.id).sort(byNewest()).map(voucherView), ctx.query);
  }],
  ['POST', '/shops/{shopId}/vouchers', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'voucher');
    const code = String(ctx.body.code ?? '').toUpperCase();
    if (!/^[A-Z0-9_-]{1,60}$/.test(code)) bad('VOUCHER_CODE_INVALID');
    if (ctx.db.vouchers.some((v) => v.code === code)) conflict('VOUCHER_CODE_DUPLICATED');
    const v = { id: uuid(), shopId: shop.id, code, ...voucherFields(ctx.body), usedCount: 0, active: Boolean(ctx.body.active), version: 0, createdAt: now(), updatedAt: now() };
    ctx.db.vouchers.unshift(v);
    return voucherView(v);
  }],
  ['GET', '/shops/{shopId}/vouchers/{voucherId}', (ctx) => voucherView(shopVoucher(ctx))],
  ['PUT', '/shops/{shopId}/vouchers/{voucherId}', (ctx) => {
    const v = shopVoucher(ctx);
    if (Number(ctx.body.expectedVersion) !== v.version) conflict('VOUCHER_VERSION_CONFLICT');
    Object.assign(v, voucherFields(ctx.body), { version: v.version + 1, updatedAt: now() });
    return voucherView(v);
  }],
  ['POST', '/shops/{shopId}/vouchers/{voucherId}/activate', (ctx) => {
    const v = shopVoucher(ctx);
    if (Number(ctx.body.expectedVersion) !== v.version) conflict('VOUCHER_VERSION_CONFLICT');
    Object.assign(v, { active: true, version: v.version + 1, updatedAt: now() });
    return voucherView(v);
  }],
  ['POST', '/shops/{shopId}/vouchers/{voucherId}/deactivate', (ctx) => {
    const v = shopVoucher(ctx);
    if (Number(ctx.body.expectedVersion) !== v.version) conflict('VOUCHER_VERSION_CONFLICT');
    Object.assign(v, { active: false, version: v.version + 1, updatedAt: now() });
    return voucherView(v);
  }],

  // ----- Tài chính -----
  ['GET', '/shops/{shopId}/finance/account', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'sales');
    return { shopId: shop.id, currency: 'VND', ...clone(shop.finance.account) };
  }],
  ['GET', '/shops/{shopId}/finance/settings', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'sales');
    return { shopId: shop.id, ...clone(shop.finance.settings) };
  }],
  ['GET', '/shops/{shopId}/finance/transactions', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'sales');
    const type = ctx.query.get('type');
    return slice(ctx.db.financeEntries.filter((e) => e.shopId === shop.id && (!type || e.type === type)).map(({ shopId, ...e }) => (void shopId, e)), ctx.query);
  }],
  ['GET', '/shops/{shopId}/finance/settlements', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'sales');
    return slice(ctx.db.settlements.filter((s) => s.shopId === shop.id).map(({ shopId, ...s }) => (void shopId, s)), ctx.query);
  }],
  ['POST', '/shops/{shopId}/finance/payouts', (ctx) => {
    const { shop, me } = requireShop(ctx, ctx.params.shopId, 'sales');
    const amount = Number(ctx.body.amountMinor);
    if (amount < shop.finance.settings.minimumPayoutMinor) fail(422, 'PAYOUT_BELOW_MINIMUM', 'Below minimum');
    if (amount > shop.finance.account.availableBalanceMinor) fail(422, 'PAYOUT_BALANCE_INSUFFICIENT', 'Insufficient balance');
    const payout = { id: uuid(), payoutNumber: `PO${String(ctx.db.payouts.length + 1).padStart(6, '0')}`, shopId: shop.id, amountMinor: amount, currency: 'VND', status: 'REQUESTED', sellerNote: ctx.body.note ?? null, decisionNote: null, requestedBy: me.id, reviewedBy: null, reviewedAt: null, paidBy: null, paidAt: null, paymentReference: null, version: 0, createdAt: now(), updatedAt: now() };
    ctx.db.payouts.unshift(payout);
    financeEntry(ctx.db, shop, 'PAYOUT_RESERVED', -amount, `Giữ tiền chờ rút ${payout.payoutNumber}`, 'SHOP_PAYOUT', payout.id);
    shop.finance.account.pendingPayoutMinor += amount;
    return clone(payout);
  }],
  ['GET', '/shops/{shopId}/finance/payouts', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'sales');
    const status = ctx.query.get('status');
    return slice(ctx.db.payouts.filter((x) => x.shopId === shop.id && (!status || x.status === status)), ctx.query);
  }],
  ['POST', '/shops/{shopId}/finance/payouts/{payoutId}/cancel', (ctx) => {
    const { shop, me } = requireShop(ctx, ctx.params.shopId, 'sales');
    const payout = ctx.db.payouts.find((x) => x.id === ctx.params.payoutId && x.shopId === shop.id);
    if (!payout) notFound('PAYOUT_NOT_FOUND');
    if (payout.status !== 'REQUESTED') conflict('PAYOUT_NOT_CANCELLABLE');
    Object.assign(payout, { status: 'CANCELLED', decisionNote: ctx.body.note, reviewedBy: me.id, reviewedAt: now(), version: payout.version + 1, updatedAt: now() });
    shop.finance.account.pendingPayoutMinor -= payout.amountMinor;
    financeEntry(ctx.db, shop, 'PAYOUT_RELEASED', payout.amountMinor, `Hủy rút tiền ${payout.payoutNumber}`, 'SHOP_PAYOUT', payout.id);
    return clone(payout);
  }],

  // ----- Báo cáo -----
  ['GET', '/shops/{shopId}/reports/sales', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'sales');
    const settlements = ctx.db.settlements.filter((s) => s.shopId === shop.id && inRange(s.settledAt, ctx.query));
    const orders = ctx.db.shopOrders.filter((so) => so.shopId === shop.id && inRange(so.placedAt, ctx.query));
    const sum = (k) => settlements.reduce((n, s) => n + s[k], 0);
    const completed = orders.filter((o) => o.status === 'COMPLETED');
    const daily = new Map();
    settlements.forEach((s) => {
      const d = s.settledAt.slice(0, 10);
      const row = daily.get(d) ?? { date: d, settledOrders: 0, grossSalesMinor: 0, platformFeeMinor: 0, refundedMinor: 0, netRevenueMinor: 0 };
      row.settledOrders += 1;
      row.grossSalesMinor += s.grossSalesMinor;
      row.platformFeeMinor += s.platformFeeMinor - s.feeReversedMinor;
      row.refundedMinor += s.refundedMinor;
      row.netRevenueMinor += s.netRevenueMinor;
      daily.set(d, row);
    });
    return {
      shopId: shop.id,
      currency: 'VND',
      period: period(ctx.query),
      orders: { placed: orders.length, completed: completed.length, cancelled: orders.filter((o) => o.status === 'CANCELLED').length, returned: orders.filter((o) => o.status === 'RETURNED').length, averageCompletedOrderMinor: completed.length ? Math.round(completed.reduce((n, o) => n + o.totalMinor, 0) / completed.length) : 0 },
      finance: { grossSalesMinor: sum('grossSalesMinor'), platformFeeMinor: sum('platformFeeMinor'), refundedMinor: sum('refundedMinor'), feeReversedMinor: sum('feeReversedMinor'), netRevenueMinor: sum('netRevenueMinor') },
      daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)),
    };
  }],
  ['GET', '/shops/{shopId}/reports/top-products', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'sales');
    const map = new Map();
    ctx.db.shopOrders.filter((so) => so.shopId === shop.id && ['COMPLETED', 'RETURNED'].includes(so.status) && inRange(so.completedAt ?? so.placedAt, ctx.query)).forEach((so) =>
      so.items.forEach((i) => {
        const row = map.get(i.productId) ?? { productId: i.productId, productName: i.productName, quantitySold: 0, quantityReturned: 0, grossItemRevenueMinor: 0, refundedMinor: 0, netItemRevenueMinor: 0 };
        row.quantitySold += i.quantity;
        row.grossItemRevenueMinor += i.lineTotalMinor;
        row.netItemRevenueMinor += i.lineTotalMinor;
        map.set(i.productId, row);
      }),
    );
    ctx.db.returns.filter((r) => r.shopId === shop.id && r.status === 'REFUNDED').forEach((r) =>
      r.items.forEach((i) => {
        const row = map.get(i.productId);
        if (row) {
          row.quantityReturned += i.returnQuantity;
          row.refundedMinor += i.requestedRefundMinor;
          row.netItemRevenueMinor -= i.requestedRefundMinor;
        }
      }),
    );
    return [...map.values()].sort((a, b) => b.quantitySold - a.quantitySold).slice(0, Number(ctx.query.get('limit') ?? 10));
  }],
  ['GET', '/shops/{shopId}/reports/order-statuses', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'sales');
    const counts = new Map();
    ctx.db.shopOrders.filter((so) => so.shopId === shop.id && inRange(so.placedAt, ctx.query)).forEach((so) => counts.set(so.status, (counts.get(so.status) ?? 0) + 1));
    return [...counts].map(([status, count]) => ({ status, count }));
  }],
  ['GET', '/shops/{shopId}/reports/finance.csv', (ctx) => {
    const { shop } = requireShop(ctx, ctx.params.shopId, 'sales');
    const rows = ctx.db.settlements.filter((s) => s.shopId === shop.id && inRange(s.settledAt, ctx.query));
    const header = 'settled_at,shop_order_id,gross_sales,platform_fee_rate_bp,platform_fee,refunded,fee_reversed,net_revenue';
    return [header, ...rows.map((s) => [s.settledAt, s.shopOrderId, s.grossSalesMinor, s.platformFeeRateBp, s.platformFeeMinor, s.refundedMinor, s.feeReversedMinor, s.netRevenueMinor].join(','))].join('\n');
  }],
];

