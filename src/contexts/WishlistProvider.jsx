import { useCallback, useEffect, useMemo, useState } from 'react';
import { WishlistContext } from './WishlistContext';
import { useAuth } from '../hooks/useAuth';
import {
  addToWishlist,
  getWishlist,
  mapWishlistItem,
  removeFromWishlist as removeWishlistItem,
} from '../services/wishlistService';

// =====================================================================
// DANH SÁCH YÊU THÍCH — API thật (services/wishlistService.js, cần đăng nhập)
//   GET /wishlist | PUT /wishlist/items/{productId} | DELETE /wishlist/items/{productId}
// Đổi trạng thái ♥ ngay trên giao diện, lỗi thì trả lại như cũ.
// =====================================================================

/**
 * Dùng chung toàn site (nút ♥ trên thẻ sản phẩm, trang chi tiết, trang Yêu thích).
 *   items                   sản phẩm đã thích (mới thích nằm đầu)
 *   ids / count             Set productId / số lượng
 *   isWishlisted(id)        true/false
 *   toggleWishlist(product) thêm/bỏ. Trả về 'added' | 'removed' | 'needsLogin'
 *   removeFromWishlist(id)
 */
export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const userKey = user ? (user.id ?? user.email) : null;
  const [items, setItems] = useState([]);

  const reload = useCallback(async () => {
    if (!userKey) {
      setItems([]);
      return;
    }
    try {
      const page = await getWishlist({ limit: 100 });
      setItems(page.items);
    } catch (error) {
      console.warn('[Wishlist] Không tải được danh sách yêu thích', error);
    }
  }, [userKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  const ids = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const isWishlisted = useCallback((productId) => ids.has(productId), [ids]);

  const toggleWishlist = useCallback(
    async (product) => {
      if (!userKey) return 'needsLogin';
      const previous = items;
      if (ids.has(product.id)) {
        setItems(items.filter((item) => item.id !== product.id));
        try {
          await removeWishlistItem(product.id);
        } catch (error) {
          setItems(previous);
          throw error;
        }
        return 'removed';
      }
      setItems([
        { id: product.id, source: 'api', name: product.name, price: product.price, originalPrice: product.originalPrice ?? null, image: product.image ?? product.images?.[0] ?? null, inStock: product.inStock !== false },
        ...items,
      ]);
      try {
        const saved = await addToWishlist(product.id);
        if (saved) setItems((list) => list.map((item) => (item.id === product.id ? mapWishlistItem(saved) : item)));
      } catch (error) {
        setItems(previous);
        throw error;
      }
      return 'added';
    },
    [ids, items, userKey],
  );

  const removeFromWishlist = useCallback(
    async (productId) => {
      const previous = items;
      setItems(items.filter((item) => item.id !== productId));
      try {
        await removeWishlistItem(productId);
      } catch (error) {
        setItems(previous);
        throw error;
      }
    },
    [items],
  );

  const value = useMemo(
    () => ({ items, ids, count: items.length, isWishlisted, toggleWishlist, removeFromWishlist, reload }),
    [items, ids, isWishlisted, toggleWishlist, removeFromWishlist, reload],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
