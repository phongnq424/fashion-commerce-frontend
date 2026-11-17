// Kiểm tra đăng nhập / quyền giống Backend (đơn giản hoá cho bản demo)
import { fail, forbidden, notFound } from './util.js';

export const TOKEN_PREFIX = 'mock-access.';

// Token giả có dạng mock-access.<userId>~<sessionId> (BE thật dùng JWT, FE không cần đọc nội dung token)
export const makeTokens = (userId, sessionId) => ({
  tokenType: 'Bearer',
  accessToken: `${TOKEN_PREFIX}${userId}~${sessionId}`,
  expiresIn: 60 * 60 * 24 * 30,
  refreshToken: `mock-refresh.${userId}~${sessionId}`,
  refreshExpiresAt: new Date(Date.now() + 60 * 86400000).toISOString(),
});



export function requireUser(ctx) {
  if (!ctx.me) fail(401, 'AUTH_UNAUTHORIZED', 'Login required');
  return ctx.me;
}

const isPlatform = (user, roles) => user.roles.some((r) => roles.includes(r));

export function requireAdmin(ctx, roles = ['PLATFORM_ADMIN', 'PLATFORM_MODERATOR', 'PLATFORM_SUPPORT']) {
  const me = requireUser(ctx);
  if (!isPlatform(me, roles)) forbidden();
  return me;
}

// Quyền theo vai trò trong shop (rút gọn từ bảng role_permissions của Backend)
const SHOP_PERMS = {
  SHOP_OWNER: ['*'],
  SHOP_MANAGER: ['profile', 'settings', 'catalog', 'inventory', 'orders', 'voucher', 'returns', 'reviews', 'sales', 'staff.read'],
  SHOP_CATALOG: ['profile.read', 'catalog', 'inventory.read'],
  SHOP_ORDERS: ['profile.read', 'inventory.read', 'orders'],
  SHOP_SUPPORT: ['profile.read', 'orders.read', 'returns', 'reviews'],
  SHOP_FINANCE: ['profile.read', 'orders.read', 'sales'],
};

const allows = (roles, perm) =>
  roles.some((role) =>
    (SHOP_PERMS[role] ?? []).some((p) => p === '*' || p === perm || perm.startsWith(`${p}.`) || p === perm.split('.')[0]),
  );

/** perm ví dụ: 'catalog', 'orders.read', 'sales', 'staff.read', 'owner' */
export function requireShop(ctx, shopId, perm = 'profile.read') {
  const me = requireUser(ctx);
  const shop = ctx.db.shops.find((s) => s.id === shopId);
  if (!shop) notFound('SHOP_NOT_FOUND');
  const member = shop.members.find((m) => m.userId === me.id && m.status === 'ACTIVE');
  if (!member) forbidden();
  if (perm === 'owner' ? shop.ownerUserId !== me.id : !allows(member.roles, perm)) forbidden();
  if (shop.status !== 'ACTIVE' && !['profile.read', 'owner'].includes(perm)) fail(409, 'SHOP_NOT_ACTIVE', 'Shop is not active');
  return { me, shop, member };
}
