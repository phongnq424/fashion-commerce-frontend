import { apiError, now, requireShop, shopSummary, STORE_ID, transact } from './adminDb';

// =====================================================================
// THÔNG TIN CỬA HÀNG TRENDYLAB — GIẢ LẬP, đúng dạng backend (contract mục 6).
// TrendyLab là 1 thương hiệu, chỉ có 1 cửa hàng (STORE_ID). Backend vẫn tổ chức dữ liệu theo "shop",
// nên mọi API quản trị đều có {shopId} = id cửa hàng TrendyLab.
//   GET    /shops/mine                    -> lấy cửa hàng TrendyLab + vai trò của tôi
//   GET    /shops/{shopId}                -> ShopResponse
//   PATCH  /shops/{shopId}                UpdateShopRequest -> ShopResponse
//   GET    /shops/{shopId}/settings       -> SettingsResponse
//   PUT    /shops/{shopId}/settings       UpdateSettingsRequest -> SettingsResponse
// Riêng bản giả lập: ShopSummaryResponse có thêm myRoles (vai trò của tôi trong shop).
// =====================================================================

export function getStore() {
  return transact((db, me) => shopSummary(requireShop(db, me, STORE_ID), me), 120);
}

export function getShop(shopId) {
  return transact((db, me) => requireShop(db, me, shopId).profile, 120);
}

export function updateShop(shopId, request) {
  return transact((db, me) => {
    const shop = requireShop(db, me, shopId);
    if (request.slug && request.slug !== shop.profile.slug) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(request.slug)) throw apiError(400, 'SHOP_SLUG_INVALID');
      const taken = Object.values(db.shops).some((s) => s.profile.id !== shopId && s.profile.slug === request.slug);
      if (taken) throw apiError(409, 'SHOP_SLUG_TAKEN');
    }
    const p = shop.profile;
    Object.assign(p, {
      name: request.name ?? p.name,
      slug: request.slug ?? p.slug,
      description: request.description !== undefined ? request.description : p.description,
      logoKey: request.logoKey !== undefined ? request.logoKey : p.logoKey,
      logoUrl: request.logoKey !== undefined ? request.logoKey : p.logoUrl,
      bannerKey: request.bannerKey !== undefined ? request.bannerKey : p.bannerKey,
      bannerUrl: request.bannerKey !== undefined ? request.bannerKey : p.bannerUrl,
      contactEmail: request.contactEmail ?? p.contactEmail,
      contactPhone: request.contactPhone ?? p.contactPhone,
      pickupAddress: request.pickupAddress ?? p.pickupAddress,
      updatedAt: now(),
    });
    return p;
  });
}


export function getSettings(shopId) {
  return transact((db, me) => ({ shopId, ...requireShop(db, me, shopId).settings }), 120);
}

export function updateSettings(shopId, request) {
  return transact((db, me) => {
    const shop = requireShop(db, me, shopId);
    const n = (value, min, max) => {
      const number = Number(value);
      if (!Number.isInteger(number) || number < min || number > max) throw apiError(400, 'SHOP_SETTINGS_INVALID');
      return number;
    };
    shop.settings = {
      handlingDays: n(request.handlingDays, 0, 30),
      returnWindowDays: n(request.returnWindowDays, 0, 90),
      defaultShippingFeeMinor: n(request.defaultShippingFeeMinor, 0, 10_000_000),
      allowCod: Boolean(request.allowCod),
      autoAcceptOrders: Boolean(request.autoAcceptOrders),
    };
    return { shopId, ...shop.settings };
  });
}

// Đơn vị vận chuyển shop đang bật (dùng khi giao hàng). Backend: cấu hình ở bước đăng ký.
export function getShopShippingProviders(shopId) {
  return transact((db, me) => requireShop(db, me, shopId).shippingProviders.filter((p) => p.enabled), 80);
}
