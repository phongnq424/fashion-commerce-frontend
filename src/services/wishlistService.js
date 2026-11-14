import { apiClient } from './apiClient';

// =====================================================================
// DANH SÁCH YÊU THÍCH — theo backend (HIỆN CHƯA DÙNG: đang giả lập trong contexts/WishlistProvider.jsx).
// Khi nối backend, WishlistProvider gọi các hàm dưới đây:
//   GET    /wishlist?limit=&offset=      -> SliceResponse<WishlistItemResponse>
//   PUT    /wishlist/items/{productId}   -> WishlistItemResponse (thêm, gọi lại nhiều lần vẫn an toàn)
//   DELETE /wishlist/items/{productId}   -> 204
// =====================================================================

const imageOf = (item) =>
  item.primaryImageUrl || (/^https?:\/\//i.test(item.primaryImageKey ?? '') ? item.primaryImageKey : null);

// WishlistItemResponse -> dạng product mà ProductCard hiểu
export function mapWishlistItem(item) {
  return {
    source: 'api',
    id: item.productId,
    shopId: item.shopId,
    slug: item.productSlug,
    name: item.productName,
    price: item.minPriceMinor ?? 0,
    maxPrice: item.maxPriceMinor ?? null,
    originalPrice: null,
    image: imageOf(item),
    inStock: Boolean(item.available),
    addedAt: item.addedAt,
  };
}

export async function getWishlist({ limit = 100, offset = 0 } = {}) {
  const page = await apiClient.get(`/wishlist?limit=${limit}&offset=${offset}`);
  return { ...page, items: (page?.items ?? []).map(mapWishlistItem) };
}

export function addToWishlist(productId) {
  return apiClient.put(`/wishlist/items/${encodeURIComponent(productId)}`);
}

export function removeFromWishlist(productId) {
  return apiClient.delete(`/wishlist/items/${encodeURIComponent(productId)}`);
}
