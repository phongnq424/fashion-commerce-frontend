import { apiClient } from '@shared/services/apiClient';

// =====================================================================
// QUẢN TRỊ SÀN (nhân viên TrendyLab: PLATFORM_ADMIN / PLATFORM_MODERATOR / PLATFORM_SUPPORT) — API thật
// Mỗi API cần quyền cấp sàn riêng; không đủ quyền -> 403 (màn hình báo "không có quyền").
//   Duyệt người bán   GET  /admin/seller-onboardings/reviews?status=   | GET /admin/seller-onboardings/{id}
//                     POST /admin/seller-onboardings/{id}/decision     { decision: APPROVED|REJECTED, note }
//   Shop              GET  /admin/shops?status=  | GET /admin/shops/{id} | POST /admin/shops/{id}/moderation { action, reason }
//                     (getShopDirectory: tra tên shop theo shopId cho báo cáo vi phạm / đơn hàng)
//   Sản phẩm bị báo cáo GET /admin/product-moderation/cases?status= | GET .../cases/{id}
//                     POST /admin/product-moderation/products/{productId}/decision { caseId?, action, reason }
//   Người dùng        GET  /admin/users?query=&status=&role= | GET /admin/users/{id}
//                     POST /admin/users/{id}/suspend|activate { reason, expectedVersion }
//                     PUT|DELETE /admin/users/{id}/roles/{roleId}
//   Vai trò           GET /admin/roles | GET /admin/permissions | POST /admin/roles/{id}/activate|deactivate { reason, expectedVersion }
//   Đơn hàng (hỗ trợ) GET  /admin/orders?query=&status= | GET /admin/orders/{id}
//   Đánh giá          GET  /admin/reviews?status=&query= | POST /admin/reviews/{id}/hide|restore { reason }
//   Rút tiền          GET  /admin/finance/payouts?status=
//                     POST /admin/finance/payouts/{id}/approve|reject { expectedVersion, note }
//                     POST /admin/finance/payouts/{id}/paid { expectedVersion, paymentReference, note? }
//                     PUT  /admin/finance/shops/{shopId}/settings { platformFeeRateBp, minimumPayoutMinor, expectedVersion }
// =====================================================================

export const ADMIN_ROLES = ['PLATFORM_ADMIN', 'PLATFORM_MODERATOR', 'PLATFORM_SUPPORT'];
export const isPlatformStaff = (user) => (user?.roles ?? []).some((role) => ADMIN_ROLES.includes(role));

export const PAGE = 20;
const enc = encodeURIComponent;
const qs = (params) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  return query.toString();
};

// ----- Duyệt hồ sơ người bán -----
export const ONBOARDING_REVIEW_STATUSES = ['PENDING_REVIEW', 'REJECTED', 'COMPLETED'];
export const getOnboardingQueue = ({ status = 'PENDING_REVIEW', limit = PAGE, offset = 0 } = {}) =>
  apiClient.get(`/admin/seller-onboardings/reviews?${qs({ status, limit, offset })}`);
export const getOnboarding = (id) => apiClient.get(`/admin/seller-onboardings/${enc(id)}`);
export const decideOnboarding = (id, { decision, note }) =>
  apiClient.post(`/admin/seller-onboardings/${enc(id)}/decision`, { decision, note: note?.trim() || null });

// ----- Shop -----
export const SHOP_STATUSES = ['DRAFT', 'ACTIVE', 'SUSPENDED', 'CLOSED'];
export const SHOP_ACTIONS = ['SUSPEND', 'REACTIVATE', 'CLOSE'];
export const getShops = ({ status = '', limit = PAGE, offset = 0 } = {}) => apiClient.get(`/admin/shops?${qs({ status, limit, offset })}`);
export const getShop = (shopId) => apiClient.get(`/admin/shops/${enc(shopId)}`);
export const moderateShop = (shopId, { action, reason }) =>
  apiClient.post(`/admin/shops/${enc(shopId)}/moderation`, { action, reason: reason.trim() });
export const updateShopFinanceSettings = (shopId, { platformFeeRateBp, minimumPayoutMinor, expectedVersion }) =>
  apiClient.put(`/admin/finance/shops/${enc(shopId)}/settings`, {
    platformFeeRateBp: Number(platformFeeRateBp),
    minimumPayoutMinor: Number(minimumPayoutMinor),
    expectedVersion,
  });

// ----- Kiểm duyệt sản phẩm (báo cáo vi phạm) -----
export const CASE_STATUSES = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'];
export const PRODUCT_ACTIONS = ['WARN', 'HIDE', 'REMOVE', 'RESTORE', 'DISMISS'];
export const getModerationCases = ({ status = 'OPEN', limit = PAGE, offset = 0 } = {}) =>
  apiClient.get(`/admin/product-moderation/cases?${qs({ status, limit, offset })}`);
export const getModerationCase = (caseId) => apiClient.get(`/admin/product-moderation/cases/${enc(caseId)}`);
export const moderateProduct = (productId, { caseId, action, reason }) =>
  apiClient.post(`/admin/product-moderation/products/${enc(productId)}/decision`, { caseId: caseId ?? null, action, reason: reason.trim() });

// ----- Người dùng & vai trò -----
export const USER_STATUSES = ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'];
export const getUsers = ({ query = '', status = '', role = '', limit = PAGE, offset = 0 } = {}) =>
  apiClient.get(`/admin/users?${qs({ query, status, role, limit, offset })}`);
export const getUser = (userId) => apiClient.get(`/admin/users/${enc(userId)}`);
export const setUserActive = (user, active, reason) =>
  apiClient.post(`/admin/users/${enc(user.id)}/${active ? 'activate' : 'suspend'}`, { reason: reason.trim(), expectedVersion: user.version });
export const assignRole = (userId, roleId) => apiClient.put(`/admin/users/${enc(userId)}/roles/${enc(roleId)}`);
export const removeRole = (userId, roleId) => apiClient.delete(`/admin/users/${enc(userId)}/roles/${enc(roleId)}`);
export const getRoles = () => apiClient.get('/admin/roles');
export const getPermissions = () => apiClient.get('/admin/permissions');
export const setRoleActive = (role, active, reason) =>
  apiClient.post(`/admin/roles/${enc(role.id)}/${active ? 'activate' : 'deactivate'}`, { reason: reason.trim(), expectedVersion: role.version });

// ----- Đơn hàng (hỗ trợ khách) -----
export const ORDER_STATUSES = ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'PARTIALLY_SHIPPED', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'PARTIALLY_CANCELLED'];
export const getOrders = ({ query = '', status = '', limit = PAGE, offset = 0 } = {}) =>
  apiClient.get(`/admin/orders?${qs({ query, status, limit, offset })}`);
export const getOrder = (orderId) => apiClient.get(`/admin/orders/${enc(orderId)}`);

// ----- Đánh giá -----
export const REVIEW_STATUSES = ['PUBLISHED', 'HIDDEN'];
export const getReviews = ({ status = '', query = '', limit = PAGE, offset = 0 } = {}) =>
  apiClient.get(`/admin/reviews?${qs({ status, query, limit, offset })}`);
export const setReviewHidden = (reviewId, hidden, reason) =>
  apiClient.post(`/admin/reviews/${enc(reviewId)}/${hidden ? 'hide' : 'restore'}`, { reason: reason.trim() });

// ----- Rút tiền của shop -----
export const PAYOUT_STATUSES = ['REQUESTED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED'];
export const getPayouts = ({ status = '', limit = PAGE, offset = 0 } = {}) => apiClient.get(`/admin/finance/payouts?${qs({ status, limit, offset })}`);
export const approvePayout = (payout, note) =>
  apiClient.post(`/admin/finance/payouts/${enc(payout.id)}/approve`, { expectedVersion: payout.version, note: note.trim() });
export const rejectPayout = (payout, note) =>
  apiClient.post(`/admin/finance/payouts/${enc(payout.id)}/reject`, { expectedVersion: payout.version, note: note.trim() });
export const markPayoutPaid = (payout, { paymentReference, note }) =>
  apiClient.post(`/admin/finance/payouts/${enc(payout.id)}/paid`, {
    expectedVersion: payout.version,
    paymentReference: paymentReference.trim(),
    note: note?.trim() || null,
  });

// ----- Gom nhiều trang (BE giới hạn limit ≤ 100, không trả tổng số) -----
// Dùng cho dashboard / tra cứu: tải lần lượt tới khi hết hoặc chạm maxPages.
export async function getAllPages(fetchPage, params = {}, maxPages = 20) {
  const items = [];
  for (let page = 0; page < maxPages; page += 1) {
    const slice = await fetchPage({ ...params, limit: 100, offset: page * 100 });
    items.push(...(slice?.items ?? []));
    if (!slice?.hasMore) return { items, truncated: false };
  }
  return { items, truncated: true };
}

// ----- Danh bạ shop: shopId -> { name, slug, logoUrl, status } -----
// Báo cáo vi phạm (ModerationCase) và đơn con (ShopOrderResponse) chỉ có shopId, không có tên shop,
// nên FE tải danh sách shop 1 lần (GET /admin/shops) rồi tra theo id. Lưu tạm 60 giây.
let shopDirectory = null;
let shopDirectoryAt = 0;
export function getShopDirectory({ fresh = false } = {}) {
  if (fresh || !shopDirectory || Date.now() - shopDirectoryAt > 60000) {
    shopDirectoryAt = Date.now();
    shopDirectory = getAllPages(getShops, {}, 10)
      .then(({ items }) => new Map(items.map((shop) => [shop.id, shop])))
      .catch((error) => {
        shopDirectory = null;
        throw error;
      });
  }
  return shopDirectory;
}
