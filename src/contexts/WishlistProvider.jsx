import { useCallback, useEffect, useMemo, useState } from 'react';
import { WishlistContext } from './WishlistContext';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useAuth } from '../hooks/useAuth';

// =====================================================================
// DANH SÁCH YÊU THÍCH (GIẢ LẬP ở frontend) — lưu trong localStorage, tách theo email người dùng:
//   { "ngoc.anh@gmail.com": [ { id, name, price, originalPrice, image, inStock, isNew, addedAt }, ... ] }
// Lưu kèm "ảnh chụp" thông tin sản phẩm lúc bấm ♥, để trang Yêu thích hiện được ngay.
// Sau này dùng backend: thay phần đọc/ghi bằng services/wishlistService.js
//   (GET /wishlist, PUT/DELETE /wishlist/items/{productId}) — giao diện giữ nguyên.
// =====================================================================

function readAll() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.mockWishlist) ?? '{}');
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(STORAGE_KEYS.mockWishlist, JSON.stringify(data));
  } catch {
    /* bỏ qua nếu không lưu được */
  }
}

const ownerKey = (user) => String(user?.email ?? '').trim().toLowerCase();

// Chỉ giữ các trường ProductCard cần
const snapshot = (product) => ({
  id: product.id,
  source: product.source ?? 'mock',
  name: product.name,
  price: product.price,
  originalPrice: product.originalPrice ?? null,
  image: product.image ?? product.images?.[0] ?? null,
  inStock: product.inStock !== false,
  isNew: Boolean(product.isNew),
  addedAt: new Date().toISOString(),
});

/**
 * Dùng chung toàn site (nút ♥ trên thẻ sản phẩm, trang chi tiết, trang Yêu thích).
 *   items                   sản phẩm đã thích (mới thích nằm đầu)
 *   ids / count             Set productId / số lượng
 *   isWishlisted(id)        true/false
 *   toggleWishlist(product) thêm/bỏ. Trả về 'added' | 'removed' | 'needsLogin'
 *   removeFromWishlist(id)
 * Chưa đăng nhập -> 'needsLogin' (nơi gọi tự mở popup đăng nhập).
 */
export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const key = ownerKey(user);
  const [items, setItems] = useState(() => (key ? readAll()[key] ?? [] : []));

  // Đổi tài khoản / đăng xuất -> nạp lại danh sách của người đó
  useEffect(() => {
    setItems(key ? readAll()[key] ?? [] : []);
  }, [key]);

  // Đồng bộ giữa các tab đang mở
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === STORAGE_KEYS.mockWishlist && key) setItems(readAll()[key] ?? []);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  const save = useCallback(
    (next) => {
      setItems(next);
      const all = readAll();
      all[key] = next;
      writeAll(all);
    },
    [key],
  );

  const ids = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const isWishlisted = useCallback((productId) => ids.has(productId), [ids]);

  const toggleWishlist = useCallback(
    async (product) => {
      if (!key) return 'needsLogin';
      if (ids.has(product.id)) {
        save(items.filter((item) => item.id !== product.id));
        return 'removed';
      }
      save([snapshot(product), ...items]);
      return 'added';
    },
    [ids, items, key, save],
  );

  const removeFromWishlist = useCallback(
    (productId) => save(items.filter((item) => item.id !== productId)),
    [items, save],
  );

  const value = useMemo(
    () => ({ items, ids, count: items.length, isWishlisted, toggleWishlist, removeFromWishlist }),
    [items, ids, isWishlisted, toggleWishlist, removeFromWishlist],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
