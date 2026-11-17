// Quản trị sàn (/admin/**)
import { requireAdmin } from '../guard.js';
import { financeEntry, orderResponse, shopResponse, shopSummary } from '../logic.js';
import { bad, byNewest, clone, conflict, fail, notFound, now, pushNotification, slice, uuid } from '../util.js';

const MODERATORS = ['PLATFORM_ADMIN', 'PLATFORM_MODERATOR'];
const SUPPORT = ['PLATFORM_ADMIN', 'PLATFORM_SUPPORT'];
const ADMIN = ['PLATFORM_ADMIN'];

const platformRoles = (u) => u.roles.filter((r) => r !== 'CUSTOMER');
const userSummary = (u) => ({ id: u.id, email: u.email, phone: u.phone, displayName: u.displayName, status: u.status, version: u.version, roles: platformRoles(u), lastLoginAt: u.lastLoginAt, createdAt: u.createdAt });
const userDetail = (u) => ({ ...userSummary(u), statusReason: u.statusReason, statusChangedBy: u.statusChangedBy, statusChangedAt: u.statusChangedAt, emailVerifiedAt: u.emailVerifiedAt, phoneVerifiedAt: u.phoneVerifiedAt });

function onboardingSummary(db, o) {
  const u = db.users.find((x) => x.id === o.applicantUserId);
  return { id: o.id, applicantUserId: o.applicantUserId, applicantEmail: u?.email ?? null, applicantDisplayName: u?.displayName ?? null, shopId: o.shop?.shopId ?? null, shopName: o.shop?.name ?? null, shopSlug: o.shop?.slug ?? null, status: o.status, taxStatus: o.taxProfile?.status ?? null, identityStatus: o.identityVerification?.status ?? null, submittedAt: o.submittedAt, updatedAt: o.updatedAt };
}

function reviewSummary(db, r) {
  const p = db.products.find((x) => x.id === r.productId);
  const s = db.shops.find((x) => x.id === r.shopId);
  return { id: r.id, buyerId: r.buyerId, buyerDisplayName: r.buyerDisplayName, productId: r.productId, productName: p?.name ?? null, shopId: r.shopId, shopName: s?.name ?? null, rating: r.rating, title: r.title, body: r.body, mediaKeys: r.mediaKeys ?? [], sellerReply: r.sellerReply, status: r.status, moderationReason: r.moderationReason, createdAt: r.createdAt, updatedAt: r.updatedAt };
}

function adminOrderSummary(db, o) {
  const shops = db.shopOrders.filter((so) => so.orderId === o.id);
  return { id: o.id, orderNumber: o.orderNumber, buyerId: o.buyerId, buyerEmail: o.buyerEmail, status: o.status, paymentMethod: o.paymentMethod, grandTotalMinor: o.grandTotalMinor, currency: 'VND', shopCount: shops.length, itemCount: shops.reduce((n, so) => n + so.items.reduce((m, i) => m + i.quantity, 0), 0), paymentStatus: o.payment?.status ?? null, placedAt: o.placedAt };
}

const findPayout = (db, id) => db.payouts.find((p) => p.id === id) ?? notFound('PAYOUT_NOT_FOUND');
const checkVersion = (row, expected, code) => {
  if (Number(expected) !== row.version) conflict(code);
};
const required = (text) => {
  if (!String(text ?? '').trim()) bad();
  return String(text).trim();
};

export const adminRoutes = [
  // ----- Duyệt hồ sơ người bán -----
  ['GET', '/admin/seller-onboardings/reviews', (ctx) => {
    requireAdmin(ctx, MODERATORS);
    const status = ctx.query.get('status') ?? 'PENDING_REVIEW';
    return slice(ctx.db.onboardings.filter((o) => o.status === status).sort(byNewest('updatedAt')).map((o) => onboardingSummary(ctx.db, o)), ctx.query);
  }],
  ['GET', '/admin/seller-onboardings/{onboardingId}', (ctx) => {
    requireAdmin(ctx, MODERATORS);
    const o = ctx.db.onboardings.find((x) => x.id === ctx.params.onboardingId);
    if (!o) notFound('SELLER_ONBOARDING_NOT_FOUND');
    return clone(o);
  }],
  ['POST', '/admin/seller-onboardings/{onboardingId}/decision', (ctx) => {
    const me = requireAdmin(ctx, MODERATORS);
    const o = ctx.db.onboardings.find((x) => x.id === ctx.params.onboardingId);
    if (!o) notFound('SELLER_ONBOARDING_NOT_FOUND');
    if (o.status !== 'PENDING_REVIEW') conflict('SELLER_ONBOARDING_NOT_PENDING');
    const at = now();
    const app = ctx.db.applications.find((a) => a.applicantUserId === o.applicantUserId && a.status === 'UNDER_REVIEW');
    if (ctx.body.decision === 'REJECTED') {
      Object.assign(o, { status: 'REJECTED', reviewedBy: me.id, reviewedAt: at, reviewNote: ctx.body.note ?? 'Hồ sơ chưa đạt yêu cầu', updatedAt: at });
      if (app) Object.assign(app, { status: 'REJECTED', reviewedAt: at, updatedAt: at });
      pushNotification(ctx.db, o.applicantUserId, 'SELLER_ONBOARDING_REJECTED', 'Hồ sơ bán hàng bị từ chối', o.reviewNote, { onboardingId: o.id });
      return clone(o);
    }
    const applicant = ctx.db.users.find((u) => u.id === o.applicantUserId);
    const pickup = o.pickupAddresses[0];
    const slugTaken = ctx.db.shops.some((s) => s.slug === o.shop.slug);
    const shop = {
      id: o.shop.shopId,
      ownerUserId: applicant.id,
      applicationId: app?.id ?? null,
      name: o.shop.name,
      slug: slugTaken ? `${o.shop.slug}-${Math.floor(Math.random() * 900 + 100)}` : o.shop.slug,
      description: o.shop.description,
      logoKey: o.shop.avatarKey,
      logoUrl: o.shop.avatarUrl,
      bannerKey: o.shop.coverKey,
      bannerUrl: o.shop.coverUrl,
      contactEmail: o.shop.email,
      contactPhone: o.shop.phone,
      pickupAddress: pickup ? { contactName: pickup.contactName, contactPhone: pickup.contactPhone, addressLine1: pickup.addressDetail, addressLine2: null, ward: pickup.wardName, district: null, province: pickup.provinceName, provinceCode: pickup.provinceCode, postalCode: null, countryCode: 'VN' } : null,
      status: 'ACTIVE',
      activatedAt: at,
      suspendedAt: null,
      createdAt: o.createdAt,
      updatedAt: at,
      settings: { handlingDays: 2, returnWindowDays: 7, defaultShippingFeeMinor: 30000, allowCod: true, autoAcceptOrders: false },
      finance: { settings: { platformFeeRateBp: 500, minimumPayoutMinor: 100000, version: 0, updatedAt: at }, account: { availableBalanceMinor: 0, pendingPayoutMinor: 0, paidOutMinor: 0, version: 0, updatedAt: at } },
      members: [{ memberId: uuid(), userId: applicant.id, email: applicant.email, displayName: applicant.displayName, status: 'ACTIVE', invitedBy: null, joinedAt: at, createdAt: at, roles: ['SHOP_OWNER'] }],
    };
    ctx.db.shops.push(shop);
    o.shop.status = 'ACTIVE';
    if (o.taxProfile) Object.assign(o.taxProfile, { status: 'APPROVED', reviewedBy: me.id, reviewedAt: at });
    if (o.identityVerification) Object.assign(o.identityVerification, { status: 'APPROVED', reviewedBy: me.id, reviewedAt: at });
    Object.assign(o, { status: 'COMPLETED', reviewedBy: me.id, reviewedAt: at, reviewNote: ctx.body.note ?? null, completedAt: at, updatedAt: at });
    if (app) Object.assign(app, { status: 'APPROVED', reviewedAt: at, updatedAt: at });
    pushNotification(ctx.db, applicant.id, 'SELLER_ONBOARDING_APPROVED', 'Shop đã được duyệt', `${shop.name} đã hoạt động. Vào Kênh người bán để đăng sản phẩm.`, { shopId: shop.id });
    return clone(o);
  }],
  ['GET', '/admin/seller-applications', (ctx) => {
    requireAdmin(ctx, MODERATORS);
    const status = ctx.query.get('status');
    return slice(ctx.db.applications.filter((a) => !status || a.status === status), ctx.query);
  }],

  // ----- Shop -----
  ['GET', '/admin/shops', (ctx) => {
    requireAdmin(ctx, MODERATORS);
    const status = ctx.query.get('status');
    return slice(ctx.db.shops.filter((s) => !status || s.status === status).map(shopSummary), ctx.query);
  }],
  ['GET', '/admin/shops/{shopId}', (ctx) => {
    requireAdmin(ctx, MODERATORS);
    const s = ctx.db.shops.find((x) => x.id === ctx.params.shopId);
    if (!s) notFound('SHOP_NOT_FOUND');
    return shopResponse(s);
  }],
  ['POST', '/admin/shops/{shopId}/moderation', (ctx) => {
    requireAdmin(ctx, MODERATORS);
    const s = ctx.db.shops.find((x) => x.id === ctx.params.shopId);
    if (!s) notFound('SHOP_NOT_FOUND');
    const reason = required(ctx.body.reason);
    const at = now();
    if (ctx.body.action === 'SUSPEND') Object.assign(s, { status: 'SUSPENDED', suspendedAt: at });
    else if (ctx.body.action === 'REACTIVATE') Object.assign(s, { status: 'ACTIVE', suspendedAt: null });
    else if (ctx.body.action === 'CLOSE') s.status = 'CLOSED';
    else bad();
    s.updatedAt = at;
    pushNotification(ctx.db, s.ownerUserId, `SHOP_${ctx.body.action}`, 'Trạng thái shop thay đổi', `${s.name}: ${reason}`, { shopId: s.id });
    return shopResponse(s);
  }],
  ['PUT', '/admin/finance/shops/{shopId}/settings', (ctx) => {
    requireAdmin(ctx, ADMIN);
    const s = ctx.db.shops.find((x) => x.id === ctx.params.shopId);
    if (!s) notFound('SHOP_NOT_FOUND');
    const settings = s.finance.settings;
    checkVersion(settings, ctx.body.expectedVersion, 'FINANCE_VERSION_CONFLICT');
    Object.assign(settings, { platformFeeRateBp: Number(ctx.body.platformFeeRateBp), minimumPayoutMinor: Number(ctx.body.minimumPayoutMinor), version: settings.version + 1, updatedAt: now() });
    return { shopId: s.id, ...clone(settings) };
  }],

  // ----- Kiểm duyệt sản phẩm -----
  ['GET', '/admin/product-moderation/cases', (ctx) => {
    requireAdmin(ctx, MODERATORS);
    const status = ctx.query.get('status') ?? 'OPEN';
    return slice(ctx.db.cases.filter((c) => c.status === status).sort(byNewest()).map(({ description, evidenceKeys, resolutionAction, resolutionNote, resolvedAt, ...c }) => (void description, void evidenceKeys, void resolutionAction, void resolutionNote, void resolvedAt, c)), ctx.query);
  }],
  ['GET', '/admin/product-moderation/cases/{caseId}', (ctx) => {
    requireAdmin(ctx, MODERATORS);
    const c = ctx.db.cases.find((x) => x.id === ctx.params.caseId);
    if (!c) notFound('MODERATION_CASE_NOT_FOUND');
    return clone(c);
  }],
  ['POST', '/admin/product-moderation/products/{productId}/decision', (ctx) => {
    const me = requireAdmin(ctx, MODERATORS);
    const p = ctx.db.products.find((x) => x.id === ctx.params.productId);
    if (!p) notFound('PRODUCT_NOT_FOUND');
    const reason = required(ctx.body.reason);
    const action = ctx.body.action;
    if (action === 'HIDE') p.status = 'HIDDEN';
    else if (action === 'REMOVE') p.status = 'REMOVED';
    else if (action === 'RESTORE') p.status = p.publishedAt ? 'ACTIVE' : 'DRAFT';
    else if (!['WARN', 'DISMISS'].includes(action)) bad();
    p.version += 1;
    p.updatedAt = now();
    const cases = ctx.db.cases.filter((c) => (ctx.body.caseId ? c.id === ctx.body.caseId : c.productId === p.id) && ['OPEN', 'UNDER_REVIEW'].includes(c.status));
    cases.forEach((c) => Object.assign(c, { status: action === 'DISMISS' ? 'DISMISSED' : 'RESOLVED', assignedTo: me.id, resolutionAction: action, resolutionNote: reason, resolvedAt: now(), updatedAt: now() }));
    const shop = ctx.db.shops.find((s) => s.id === p.shopId);
    if (action !== 'DISMISS') pushNotification(ctx.db, shop.ownerUserId, `PRODUCT_${action}`, 'Sản phẩm bị kiểm duyệt', `${p.name}: ${reason}`, { productId: p.id });
    const { soldCount, ...rest } = clone(p);
    void soldCount;
    return rest;
  }],

  // ----- Người dùng & vai trò -----
  ['GET', '/admin/users', (ctx) => {
    requireAdmin(ctx, ADMIN);
    const q = String(ctx.query.get('query') ?? '').toLowerCase();
    const status = ctx.query.get('status');
    const role = ctx.query.get('role');
    return slice(ctx.db.users.filter((u) => (!q || [u.email, u.phone, u.displayName].some((x) => String(x ?? '').toLowerCase().includes(q))) && (!status || u.status === status) && (!role || u.roles.includes(role))).sort(byNewest()).map(userSummary), ctx.query);
  }],
  ['GET', '/admin/users/{userId}', (ctx) => {
    requireAdmin(ctx, ADMIN);
    const u = ctx.db.users.find((x) => x.id === ctx.params.userId);
    if (!u) notFound('USER_NOT_FOUND');
    return userDetail(u);
  }],
  ['POST', '/admin/users/{userId}/suspend', (ctx) => {
    const me = requireAdmin(ctx, ADMIN);
    const u = ctx.db.users.find((x) => x.id === ctx.params.userId);
    if (!u) notFound('USER_NOT_FOUND');
    if (u.id === me.id) fail(409, 'ADMIN_CANNOT_SUSPEND_SELF', 'Không thể tự khóa tài khoản đang dùng');
    checkVersion(u, ctx.body.expectedVersion, 'USER_VERSION_CONFLICT');
    Object.assign(u, { status: 'SUSPENDED', statusReason: required(ctx.body.reason), statusChangedBy: me.id, statusChangedAt: now(), version: u.version + 1 });
    return userDetail(u);
  }],
  ['POST', '/admin/users/{userId}/activate', (ctx) => {
    const me = requireAdmin(ctx, ADMIN);
    const u = ctx.db.users.find((x) => x.id === ctx.params.userId);
    if (!u) notFound('USER_NOT_FOUND');
    checkVersion(u, ctx.body.expectedVersion, 'USER_VERSION_CONFLICT');
    Object.assign(u, { status: 'ACTIVE', statusReason: required(ctx.body.reason), statusChangedBy: me.id, statusChangedAt: now(), version: u.version + 1 });
    return userDetail(u);
  }],
  ['PUT', '/admin/users/{userId}/roles/{roleId}', (ctx) => {
    requireAdmin(ctx, ADMIN);
    const u = ctx.db.users.find((x) => x.id === ctx.params.userId);
    const r = ctx.db.roles.find((x) => x.id === ctx.params.roleId);
    if (!u || !r) notFound('USER_OR_ROLE_NOT_FOUND');
    if (!u.roles.includes(r.code)) u.roles.push(r.code);
    u.version += 1;
    return userDetail(u);
  }],
  ['DELETE', '/admin/users/{userId}/roles/{roleId}', (ctx) => {
    const me = requireAdmin(ctx, ADMIN);
    const u = ctx.db.users.find((x) => x.id === ctx.params.userId);
    const r = ctx.db.roles.find((x) => x.id === ctx.params.roleId);
    if (!u || !r) notFound('USER_OR_ROLE_NOT_FOUND');
    if (r.code === 'CUSTOMER') conflict('ROLE_IMMUTABLE');
    if (r.code === 'PLATFORM_ADMIN' && ctx.db.users.filter((x) => x.roles.includes('PLATFORM_ADMIN') && x.status === 'ACTIVE').length <= 1) conflict('LAST_ADMIN_REQUIRED');
    if (r.code === 'PLATFORM_ADMIN' && u.id === me.id) conflict('ADMIN_CANNOT_DEMOTE_SELF');
    u.roles = u.roles.filter((x) => x !== r.code);
    u.version += 1;
    return userDetail(u);
  }],
  ['GET', '/admin/roles', (ctx) => {
    requireAdmin(ctx, ADMIN);
    return clone(ctx.db.roles);
  }],
  ['GET', '/admin/permissions', (ctx) => {
    requireAdmin(ctx, ADMIN);
    return clone(ctx.db.permissions);
  }],
  ['POST', '/admin/roles/{roleId}/activate', (ctx) => {
    requireAdmin(ctx, ADMIN);
    const r = ctx.db.roles.find((x) => x.id === ctx.params.roleId) ?? notFound('ROLE_NOT_FOUND');
    if (r.system) conflict('ROLE_IMMUTABLE');
    checkVersion(r, ctx.body.expectedVersion, 'ROLE_VERSION_CONFLICT');
    Object.assign(r, { active: true, version: r.version + 1 });
    return clone(r);
  }],
  ['POST', '/admin/roles/{roleId}/deactivate', (ctx) => {
    requireAdmin(ctx, ADMIN);
    const r = ctx.db.roles.find((x) => x.id === ctx.params.roleId) ?? notFound('ROLE_NOT_FOUND');
    if (r.system) conflict('ROLE_IMMUTABLE');
    checkVersion(r, ctx.body.expectedVersion, 'ROLE_VERSION_CONFLICT');
    Object.assign(r, { active: false, version: r.version + 1 });
    return clone(r);
  }],

  // ----- Đơn hàng (hỗ trợ) -----
  ['GET', '/admin/orders', (ctx) => {
    requireAdmin(ctx, SUPPORT);
    const q = String(ctx.query.get('query') ?? '').toLowerCase();
    const status = ctx.query.get('status');
    return slice(ctx.db.orders.filter((o) => (!status || o.status === status) && (!q || o.orderNumber.toLowerCase().includes(q) || o.buyerEmail.toLowerCase().includes(q))).sort(byNewest('placedAt')).map((o) => adminOrderSummary(ctx.db, o)), ctx.query);
  }],
  ['GET', '/admin/orders/{orderId}', (ctx) => {
    requireAdmin(ctx, SUPPORT);
    const o = ctx.db.orders.find((x) => x.id === ctx.params.orderId);
    if (!o) notFound('ORDER_NOT_FOUND');
    return { buyerId: o.buyerId, buyerEmail: o.buyerEmail, order: orderResponse(ctx.db, o) };
  }],

  // ----- Đánh giá -----
  ['GET', '/admin/reviews', (ctx) => {
    requireAdmin(ctx, MODERATORS);
    const q = String(ctx.query.get('query') ?? '').toLowerCase();
    const status = ctx.query.get('status');
    return slice(ctx.db.reviews.map((r) => reviewSummary(ctx.db, r)).filter((r) => (!status || r.status === status) && (!q || [r.title, r.body, r.productName, r.shopName].some((x) => String(x ?? '').toLowerCase().includes(q)))).sort(byNewest()), ctx.query);
  }],
  ['POST', '/admin/reviews/{reviewId}/hide', (ctx) => {
    requireAdmin(ctx, MODERATORS);
    const r = ctx.db.reviews.find((x) => x.id === ctx.params.reviewId) ?? notFound('REVIEW_NOT_FOUND');
    Object.assign(r, { status: 'HIDDEN', moderationReason: required(ctx.body.reason), updatedAt: now() });
    return reviewSummary(ctx.db, r);
  }],
  ['POST', '/admin/reviews/{reviewId}/restore', (ctx) => {
    requireAdmin(ctx, MODERATORS);
    const r = ctx.db.reviews.find((x) => x.id === ctx.params.reviewId) ?? notFound('REVIEW_NOT_FOUND');
    Object.assign(r, { status: 'PUBLISHED', moderationReason: null, updatedAt: now() });
    return reviewSummary(ctx.db, r);
  }],

  // ----- Rút tiền -----
  ['GET', '/admin/finance/payouts', (ctx) => {
    requireAdmin(ctx, ADMIN);
    const status = ctx.query.get('status');
    return slice(ctx.db.payouts.filter((p) => !status || p.status === status).sort(byNewest()), ctx.query);
  }],
  ['POST', '/admin/finance/payouts/{payoutId}/approve', (ctx) => {
    const me = requireAdmin(ctx, ADMIN);
    const p = findPayout(ctx.db, ctx.params.payoutId);
    checkVersion(p, ctx.body.expectedVersion, 'FINANCE_VERSION_CONFLICT');
    if (p.status !== 'REQUESTED') conflict('PAYOUT_NOT_APPROVABLE');
    Object.assign(p, { status: 'APPROVED', decisionNote: required(ctx.body.note), reviewedBy: me.id, reviewedAt: now(), version: p.version + 1, updatedAt: now() });
    return clone(p);
  }],
  ['POST', '/admin/finance/payouts/{payoutId}/reject', (ctx) => {
    const me = requireAdmin(ctx, ADMIN);
    const p = findPayout(ctx.db, ctx.params.payoutId);
    checkVersion(p, ctx.body.expectedVersion, 'FINANCE_VERSION_CONFLICT');
    if (!['REQUESTED', 'APPROVED'].includes(p.status)) conflict('PAYOUT_NOT_REJECTABLE');
    Object.assign(p, { status: 'REJECTED', decisionNote: required(ctx.body.note), reviewedBy: me.id, reviewedAt: now(), version: p.version + 1, updatedAt: now() });
    const shop = ctx.db.shops.find((s) => s.id === p.shopId);
    shop.finance.account.pendingPayoutMinor -= p.amountMinor;
    financeEntry(ctx.db, shop, 'PAYOUT_RELEASED', p.amountMinor, `Từ chối rút tiền ${p.payoutNumber}`, 'SHOP_PAYOUT', p.id);
    pushNotification(ctx.db, shop.ownerUserId, 'SHOP_PAYOUT_REJECTED', 'Yêu cầu rút tiền bị từ chối', p.decisionNote, { payoutId: p.id });
    return clone(p);
  }],
  ['POST', '/admin/finance/payouts/{payoutId}/paid', (ctx) => {
    const me = requireAdmin(ctx, ADMIN);
    const p = findPayout(ctx.db, ctx.params.payoutId);
    checkVersion(p, ctx.body.expectedVersion, 'FINANCE_VERSION_CONFLICT');
    if (p.status !== 'APPROVED') conflict('PAYOUT_NOT_PAYABLE');
    const reference = required(ctx.body.paymentReference);
    if (ctx.db.payouts.some((x) => x.paymentReference === reference)) conflict('PAYOUT_REFERENCE_EXISTS');
    Object.assign(p, { status: 'PAID', paymentReference: reference, paidBy: me.id, paidAt: now(), version: p.version + 1, updatedAt: now() });
    const shop = ctx.db.shops.find((s) => s.id === p.shopId);
    shop.finance.account.pendingPayoutMinor -= p.amountMinor;
    shop.finance.account.paidOutMinor += p.amountMinor;
    ctx.db.financeEntries.unshift({ id: uuid(), shopId: shop.id, type: 'PAYOUT_PAID', amountMinor: 0, balanceAfterMinor: shop.finance.account.availableBalanceMinor, currency: 'VND', referenceType: 'SHOP_PAYOUT', referenceId: p.id, description: `Đã chuyển khoản ${p.payoutNumber} (${reference})`, occurredAt: now() });
    pushNotification(ctx.db, shop.ownerUserId, 'SHOP_PAYOUT_PAID', 'Đã chuyển tiền cho shop', `${p.payoutNumber}: ${reference}`, { payoutId: p.id });
    return clone(p);
  }],
];
