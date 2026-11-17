// Xác thực, tài khoản, danh mục, sản phẩm công khai, thông báo
import { DEMO_OTP } from '../seed.js';
import { makeTokens, requireUser } from '../guard.js';
import { isPublic, publicDetail, publicSummary } from '../logic.js';
import { bad, byNewest, conflict, daysAgo, fail, notFound, now, slice, uuid } from '../util.js';

const normalizePhone = (p) => String(p ?? '').replace(/[\s.]/g, '').replace(/^\+?84/, '0');

export const userResponse = (u) => ({
  id: u.id,
  email: u.email,
  phone: u.phone,
  displayName: u.displayName,
  status: u.status,
  emailVerifiedAt: u.emailVerifiedAt,
  roles: u.roles.filter((r) => r !== 'CUSTOMER' || true),
});

function findByIdentifier(db, identifier) {
  const value = String(identifier ?? '').trim().toLowerCase();
  return db.users.find((u) => u.email.toLowerCase() === value || (u.phone && normalizePhone(u.phone) === normalizePhone(value)));
}

const STRONG = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;
const otpChallenge = () => ({ expiresIn: 300, resendAfter: 60 });

// Phiên đăng nhập (giống bảng user_sessions của BE): mỗi lần đăng nhập tạo 1 phiên,
// token chứa id phiên -> đăng xuất / đổi mật khẩu / thu hồi phiên làm token hết hiệu lực.
function openSession(ctx, user) {
  ctx.db.sessions ??= [];
  const session = {
    id: uuid(),
    userId: user.id,
    deviceLabel: ctx.headers?.get?.('X-Device-Label') || null,
    userAgent: ctx.headers?.get?.('User-Agent') || null,
    createdAt: now(),
    lastUsedAt: now(),
    expiresAt: daysAgo(-14),
    revokedAt: null,
    revokedReason: null,
  };
  ctx.db.sessions.unshift(session);
  return makeTokens(user.id, session.id);
}

function revokeSessions(db, userId, reason, exceptId = null) {
  (db.sessions ?? []).forEach((s) => {
    if (s.userId === userId && !s.revokedAt && s.id !== exceptId) Object.assign(s, { revokedAt: now(), revokedReason: reason });
  });
}

const sessionResponse = (s) => ({
  id: s.id,
  deviceLabel: s.deviceLabel,
  userAgent: s.userAgent,
  createdAt: s.createdAt,
  lastUsedAt: s.lastUsedAt,
  expiresAt: s.expiresAt,
  revokedAt: s.revokedAt,
  revokedReason: s.revokedReason,
  active: !s.revokedAt,
});

const accountResponse = (u) => ({
  id: u.id,
  email: u.email,
  phone: u.phone,
  displayName: u.displayName,
  status: u.status,
  emailVerifiedAt: u.emailVerifiedAt,
  phoneVerifiedAt: u.phoneVerifiedAt,
  lastLoginAt: u.lastLoginAt,
  createdAt: u.createdAt,
  roles: [...u.roles],
});

export const authRoutes = [
  // ----- Auth -----
  ['POST', '/auth/register/otp', ({ db, body }) => {
    if (db.users.some((u) => u.email.toLowerCase() === String(body.email).toLowerCase())) conflict('AUTH_EMAIL_EXISTS');
    return otpChallenge();
  }],
  ['POST', '/auth/register', ({ db, body }) => {
    if (body.otp !== DEMO_OTP) fail(400, 'AUTH_OTP_INVALID_OR_EXPIRED', 'Mã OTP không đúng (bản demo: 123456)');
    if (!STRONG.test(body.password ?? '')) bad('REQUEST_INVALID');
    if (db.users.some((u) => u.email.toLowerCase() === String(body.email).toLowerCase())) conflict('AUTH_EMAIL_EXISTS');
    if (db.users.some((u) => u.phone && normalizePhone(u.phone) === normalizePhone(body.phone))) conflict('AUTH_PHONE_EXISTS');
    const user = {
      id: uuid(),
      email: String(body.email).trim().toLowerCase(),
      phone: normalizePhone(body.phone),
      displayName: String(body.displayName ?? '').trim(),
      status: 'ACTIVE',
      statusReason: null,
      statusChangedBy: null,
      statusChangedAt: null,
      password: body.password,
      roles: ['CUSTOMER'],
      version: 0,
      emailVerifiedAt: now(),
      phoneVerifiedAt: null,
      lastLoginAt: null,
      createdAt: now(),
    };
    db.users.push(user);
    return userResponse(user);
  }],
  ['POST', '/auth/login', (ctx) => {
    const user = findByIdentifier(ctx.db, ctx.body.identifier);
    if (!user || user.password !== ctx.body.password) fail(401, 'AUTH_INVALID_CREDENTIALS', 'Sai email/số điện thoại hoặc mật khẩu');
    if (user.status !== 'ACTIVE') fail(403, 'AUTH_ACCOUNT_SUSPENDED', 'Tài khoản đã bị khóa');
    user.lastLoginAt = now();
    return openSession(ctx, user);
  }],
  ['POST', '/auth/refresh', ({ db, body }) => {
    const [userId, sessionId] = String(body.refreshToken ?? '').replace('mock-refresh.', '').split('~');
    const session = (db.sessions ?? []).find((s) => s.id === sessionId && s.userId === userId && !s.revokedAt);
    if (!session) fail(401, 'AUTH_REFRESH_INVALID', 'Refresh token invalid');
    session.lastUsedAt = now();
    return makeTokens(userId, sessionId);
  }],
  ['POST', '/auth/logout', (ctx) => {
    const session = (ctx.db.sessions ?? []).find((s) => s.id === ctx.sessionId);
    if (session && !session.revokedAt) Object.assign(session, { revokedAt: now(), revokedReason: 'LOGOUT' });
    return undefined;
  }],
  ['POST', '/auth/password-reset/otp', () => otpChallenge()],
  ['POST', '/auth/password-reset', ({ db, body }) => {
    if (body.otp !== DEMO_OTP) fail(400, 'AUTH_OTP_INVALID_OR_EXPIRED', 'Mã OTP không đúng (bản demo: 123456)');
    if (!STRONG.test(body.newPassword ?? '')) bad('REQUEST_INVALID');
    const user = findByIdentifier(db, body.identifier);
    if (user) {
      user.password = body.newPassword;
      revokeSessions(db, user.id, 'PASSWORD_RESET');
    }
    return undefined;
  }],

  // ----- Tài khoản (PATCH /users/me, đổi mật khẩu, phiên đăng nhập) -----
  ['GET', '/users/me', (ctx) => accountResponse(requireUser(ctx))],
  ['PATCH', '/users/me', (ctx) => {
    const me = requireUser(ctx);
    const { displayName, email, phone, currentPassword } = ctx.body;
    const emailChanged = email != null && String(email).trim().toLowerCase() !== me.email;
    const phoneChanged = phone != null && normalizePhone(phone) !== normalizePhone(me.phone);
    if (displayName != null && !String(displayName).trim()) bad('ACCOUNT_DISPLAY_NAME_INVALID');
    if ((emailChanged || phoneChanged) && currentPassword !== me.password) bad('ACCOUNT_CURRENT_PASSWORD_INVALID');
    if (emailChanged && ctx.db.users.some((u) => u.id !== me.id && u.email === String(email).trim().toLowerCase())) conflict('AUTH_EMAIL_EXISTS');
    if (phoneChanged && ctx.db.users.some((u) => u.id !== me.id && u.phone && normalizePhone(u.phone) === normalizePhone(phone))) conflict('AUTH_PHONE_EXISTS');
    if (displayName != null) me.displayName = String(displayName).trim();
    if (emailChanged) Object.assign(me, { email: String(email).trim().toLowerCase(), emailVerifiedAt: null });
    if (phoneChanged) Object.assign(me, { phone: normalizePhone(phone), phoneVerifiedAt: null });
    me.version = (me.version ?? 0) + 1;
    return accountResponse(me);
  }],
  ['POST', '/users/me/password', (ctx) => {
    const me = requireUser(ctx);
    if (ctx.body.currentPassword !== me.password) bad('ACCOUNT_CURRENT_PASSWORD_INVALID');
    if (ctx.body.newPassword === me.password) bad('ACCOUNT_PASSWORD_UNCHANGED');
    if (!STRONG.test(ctx.body.newPassword ?? '')) bad('REQUEST_INVALID');
    me.password = ctx.body.newPassword;
    revokeSessions(ctx.db, me.id, 'PASSWORD_CHANGED');
    return undefined;
  }],
  ['GET', '/users/me/sessions', (ctx) => {
    const me = requireUser(ctx);
    const list = (ctx.db.sessions ?? []).filter((s) => s.userId === me.id).sort(byNewest());
    return slice(list.map(sessionResponse), ctx.query);
  }],
  ['DELETE', '/users/me/sessions/{sessionId}', (ctx) => {
    const me = requireUser(ctx);
    const session = (ctx.db.sessions ?? []).find((s) => s.id === ctx.params.sessionId && s.userId === me.id);
    if (!session) notFound('ACCOUNT_SESSION_NOT_FOUND');
    if (!session.revokedAt) Object.assign(session, { revokedAt: now(), revokedReason: 'USER_REVOKED' });
    return undefined;
  }],

  // ----- Danh mục -----
  ['GET', '/catalog/categories', ({ db }) => db.categories.map(({ route, ...c }) => (void route, c))],
  ['GET', '/catalog/brands', () => []],

  // ----- Sản phẩm công khai -----
  ['GET', '/products', ({ db, query }) => {
    const q = String(query.get('q') ?? '').trim().toLowerCase();
    const categoryId = query.get('categoryId');
    const min = query.get('minPriceMinor');
    const max = query.get('maxPriceMinor');
    let items = db.products.filter((p) => isPublic(db, p)).map((p) => publicSummary(db, p));
    if (q) items = items.filter((p) => p.name.toLowerCase().includes(q));
    if (categoryId) items = items.filter((p) => p.categoryId === categoryId);
    if (min) items = items.filter((p) => p.minPriceMinor >= Number(min));
    if (max) items = items.filter((p) => p.minPriceMinor <= Number(max));
    if (query.get('inStock') === 'true') items = items.filter((p) => p.availableQuantity > 0);
    const sort = query.get('sort') ?? 'NEWEST';
    const sorters = {
      NEWEST: (a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)),
      PRICE_ASC: (a, b) => a.minPriceMinor - b.minPriceMinor,
      PRICE_DESC: (a, b) => b.minPriceMinor - a.minPriceMinor,
      NAME_ASC: (a, b) => a.name.localeCompare(b.name, 'vi'),
    };
    items.sort(sorters[sort] ?? sorters.NEWEST);
    const limit = Math.min(100, Math.max(1, Number(query.get('limit') ?? 20)));
    const start = Number(query.get('cursor') ?? 0) || 0;
    const page = items.slice(start, start + limit);
    const hasMore = start + limit < items.length;
    return { items: page, limit, nextCursor: hasMore ? String(start + limit) : null, hasMore };
  }],
  ['GET', '/products/{productId}', ({ db, params }) => {
    const p = db.products.find((x) => x.id === params.productId);
    if (!p || !isPublic(db, p)) notFound('PRODUCT_NOT_FOUND');
    return publicDetail(p);
  }],
  ['POST', '/products/{productId}/reports', (ctx) => {
    const me = requireUser(ctx);
    const p = ctx.db.products.find((x) => x.id === ctx.params.productId);
    if (!p) notFound('PRODUCT_NOT_FOUND');
    const row = { id: uuid(), productId: p.id, productName: p.name, shopId: p.shopId, reporterUserId: me.id, reasonCode: ctx.body.reason, description: ctx.body.description ?? null, evidenceKeys: ctx.body.evidenceKeys ?? [], status: 'OPEN', assignedTo: null, resolutionAction: null, resolutionNote: null, resolvedAt: null, createdAt: now(), updatedAt: now() };
    ctx.db.cases.unshift(row);
    return row;
  }],
  ['GET', '/products/{productId}/reviews', ({ db, params, query }) => {
    const list = db.reviews.filter((r) => r.productId === params.productId && r.status === 'PUBLISHED').sort(byNewest());
    const count = list.length;
    const averageRating = count ? Math.round((list.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
    const page = slice(list.map(reviewResponse), query);
    return { summary: { count, averageRating }, ...page };
  }],

  // ----- Thông báo -----
  ['GET', '/notifications', (ctx) => {
    const me = requireUser(ctx);
    let list = ctx.db.notifications.filter((n) => n.userId === me.id);
    if (ctx.query.get('unreadOnly') === 'true') list = list.filter((n) => !n.readAt);
    return slice(list.map(({ userId, ...n }) => (void userId, n)), ctx.query);
  }],
  ['GET', '/notifications/unread-count', (ctx) => {
    const me = requireUser(ctx);
    return { unreadCount: ctx.db.notifications.filter((n) => n.userId === me.id && !n.readAt).length };
  }],
  ['PATCH', '/notifications/{notificationId}/read', (ctx) => {
    const me = requireUser(ctx);
    const n = ctx.db.notifications.find((x) => x.id === ctx.params.notificationId && x.userId === me.id);
    if (!n) notFound('NOTIFICATION_NOT_FOUND');
    n.readAt = n.readAt ?? now();
    const { userId, ...rest } = n;
    void userId;
    return rest;
  }],
  ['POST', '/notifications/read-all', (ctx) => {
    const me = requireUser(ctx);
    ctx.db.notifications.forEach((n) => {
      if (n.userId === me.id && !n.readAt) n.readAt = now();
    });
    return undefined;
  }],
];

// ReviewResponse
export const reviewResponse = (r) => ({
  id: r.id,
  orderItemId: r.orderItemId,
  productId: r.productId,
  shopId: r.shopId,
  rating: r.rating,
  title: r.title,
  body: r.body,
  mediaKeys: r.mediaKeys ?? [],
  buyerDisplayName: r.buyerDisplayName,
  sellerReply: r.sellerReply,
  sellerRepliedAt: r.sellerRepliedAt,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});
