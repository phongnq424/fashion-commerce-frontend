import { apiClient } from './apiClient';

/**
 * Giỏ hàng trên Backend (CHỈ ĐỌC/GỌI API có sẵn, không đổi gì ở Backend).
 * Xem fashion-commerce-backend/docs/FRONTEND_API_CONTRACT.md mục "10. Cart".
 * Mọi API đều cần đăng nhập. Sau mỗi response phải giữ lại cart.version để gửi
 * làm expectedVersion cho lần sửa tiếp theo (sai version -> 409 CART_VERSION_CONFLICT).
 */

const getImageUrl = (url, key) => url || (typeof key === 'string' && /^https?:\/\//i.test(key) ? key : null);

// CartResponse (Backend) -> { version, items[] } dạng phẳng mà giao diện dùng
export function mapCartResponse(cart) {
  if (!cart || typeof cart !== 'object' || !Array.isArray(cart.shops)) {
    throw new TypeError('Cart response không đúng API contract');
  }

  const items = cart.shops.flatMap((shop) =>
    shop.items.map((item) => ({
      key: `server:${item.id}`,
      origin: 'server',
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      sku: item.sellerSku,
      name: item.productName,
      image: getImageUrl(item.imageUrl, item.imageKey),
      // options là { SIZE: 'M', COLOR: 'BLACK' } (mã). Nhãn đẹp được bổ sung ở CartProvider nếu có.
      options: item.options ?? {},
      unitPrice: item.unitPriceMinor,
      originalPrice: item.compareAtPriceMinor ?? null,
      quantity: item.quantity,
      maxQuantity: Math.max(1, Math.min(99, item.availableQuantity)),
      selected: item.selected,
      availability: item.availability,
      shopName: shop.shopName,
    })),
  );

  return { id: cart.id, version: cart.version, items };
}

export async function fetchCart() {
  return mapCartResponse(await apiClient.get('/cart'));
}

export async function addCartItem({ expectedVersion, variantId, quantity }) {
  return mapCartResponse(await apiClient.post('/cart/items', { expectedVersion, variantId, quantity }));
}

export async function updateCartItem(itemId, { expectedVersion, quantity, selected }) {
  return mapCartResponse(
    await apiClient.put(`/cart/items/${encodeURIComponent(itemId)}`, { expectedVersion, quantity, selected }),
  );
}

export async function removeCartItem(itemId, expectedVersion) {
  return mapCartResponse(
    await apiClient.delete(`/cart/items/${encodeURIComponent(itemId)}?expectedVersion=${expectedVersion}`),
  );
}

export async function updateCartSelection({ expectedVersion, itemIds, selected }) {
  return mapCartResponse(await apiClient.put('/cart/selection', { expectedVersion, itemIds, selected }));
}
