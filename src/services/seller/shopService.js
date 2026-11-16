import { apiClient } from '../apiClient';
import { currentUserId, enc, SHIPPING_PROVIDERS } from './constants';

// =====================================================================
// SHOP CỦA TÔI — API thật
//   GET    /shops/mine?limit=&offset=     -> SliceResponse<ShopSummaryResponse>
//   GET    /shops/{shopId}                -> ShopResponse
//   PATCH  /shops/{shopId}                UpdateRequest -> ShopResponse
//   DELETE /shops/{shopId}                -> 204 (chỉ chủ shop, đóng shop)
//   GET    /shops/{shopId}/settings       -> SettingsResponse
//   PUT    /shops/{shopId}/settings       UpdateSettingsRequest -> SettingsResponse
// ShopSummaryResponse KHÔNG có vai trò của tôi -> frontend tự thêm myRoles:
//   chủ shop (ownerUserId = tôi) -> ['SHOP_OWNER'];
//   còn lại -> đọc GET /shops/{id}/members (cần quyền shop.staff.read), không đọc được -> ['SHOP_STAFF'].
// =====================================================================

async function rolesInShop(shop, me) {
  if (me && shop.ownerUserId === me) return ['SHOP_OWNER'];
  try {
    const page = await apiClient.get(`/shops/${enc(shop.id)}/members?limit=100&offset=0`);
    const mine = (page?.items ?? []).find((member) => member.userId === me);
    if (mine?.roles?.length) return mine.roles;
  } catch {
    /* không có quyền xem nhân viên -> nhân viên thường */
  }
  return ['SHOP_STAFF'];
}

export async function getMyShops({ limit = 50, offset = 0 } = {}) {
  const page = await apiClient.get(`/shops/mine?limit=${limit}&offset=${offset}`);
  const me = currentUserId();
  const items = await Promise.all((page?.items ?? []).map(async (shop) => ({ ...shop, myRoles: await rolesInShop(shop, me) })));
  return { ...page, items };
}

export function getShop(shopId) {
  return apiClient.get(`/shops/${enc(shopId)}`);
}

// Chỉ gửi các trường có giá trị (PATCH)
export function updateShop(shopId, request) {
  const body = Object.fromEntries(Object.entries(request).filter(([, value]) => value !== undefined));
  return apiClient.patch(`/shops/${enc(shopId)}`, body);
}

export function deleteShop(shopId) {
  return apiClient.delete(`/shops/${enc(shopId)}`);
}

export function getSettings(shopId) {
  return apiClient.get(`/shops/${enc(shopId)}/settings`);
}

export function updateSettings(shopId, request) {
  return apiClient.put(`/shops/${enc(shopId)}/settings`, {
    handlingDays: Number(request.handlingDays),
    returnWindowDays: Number(request.returnWindowDays),
    defaultShippingFeeMinor: Number(request.defaultShippingFeeMinor),
    allowCod: Boolean(request.allowCod),
    autoAcceptOrders: Boolean(request.autoAcceptOrders),
  });
}

// Hãng vận chuyển dùng khi giao hàng. Backend chưa có API đọc danh sách hãng của shop sau khi đăng ký.
export async function getShopShippingProviders() {
  return SHIPPING_PROVIDERS;
}
