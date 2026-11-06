import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CartContext } from './CartContext';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/apiClient';
import {
  addCartItem,
  fetchCart,
  removeCartItem,
  updateCartItem,
  updateCartSelection,
} from '../services/cartService';
import { readLocalCart, readVariantLabels, rememberVariantLabel, writeLocalCart } from '../services/localCart';
import { getProductById } from '../services/productService';
import { findVariant } from '../utils/productVariants';

const MOCK_MAX_QUANTITY = 10;

/**
 * Giỏ hàng cho toàn site. Có 2 nơi lưu, giao diện KHÔNG cần biết:
 *   - 'server': giỏ Backend (GET/POST/PUT/DELETE /cart...) khi ĐÃ đăng nhập và sản phẩm có variantId
 *   - 'local' : localStorage khi chưa đăng nhập, hoặc sản phẩm mock
 * Đăng nhập xong -> các dòng local có variantId được tự chuyển lên giỏ Backend.
 *
 * Mỗi dòng giỏ (item): { key, origin, id, productId, variantId, name, image, variantText,
 *   unitPrice, originalPrice, quantity, maxQuantity, selected, availability }
 *
 * Hàm:
 *   addItem(product, options)  -> { status: 'added' | 'needsOptions' }  (lỗi Backend thì throw ApiError)
 *   updateQuantity(item, n) | toggleSelected(item, bool) | setAllSelected(bool)
 *   changeItemOptions(item, product, { size, colorId })  -> đổi màu / size của 1 dòng (nút bút ở trang giỏ)
 *   removeItem(item) | removeItems(items) | reload()
 */
export function CartProvider({ children }) {
  const { user, isAuthLoading } = useAuth();
  const userKey = user ? (user.id ?? user.email ?? 'user') : null;

  const [serverCart, setServerCart] = useState(null); // { version, items } | null
  const [localItems, setLocalItems] = useState(readLocalCart);
  const [labels, setLabels] = useState(readVariantLabels);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'error'
  const [pendingKeys, setPendingKeys] = useState(() => new Set());
  const [lastAddedAt, setLastAddedAt] = useState(0);

  const versionRef = useRef(null);
  const queueRef = useRef(Promise.resolve());

  useEffect(() => {
    writeLocalCart(localItems);
  }, [localItems]);

  const applyServerCart = useCallback((cart) => {
    versionRef.current = cart.version;
    setServerCart(cart);
    return cart;
  }, []);

  // Các lệnh sửa giỏ Backend chạy LẦN LƯỢT (tránh 2 lệnh dùng cùng 1 version).
  // Sai version (giỏ bị sửa ở tab khác) -> tải lại giỏ rồi thử lại 1 lần.
  const runServer = useCallback(
    (operation) => {
      const task = queueRef.current.then(async () => {
        if (versionRef.current == null) applyServerCart(await fetchCart());
        try {
          return applyServerCart(await operation(versionRef.current));
        } catch (error) {
          if (error instanceof ApiError && error.code === 'CART_VERSION_CONFLICT') {
            applyServerCart(await fetchCart());
            return applyServerCart(await operation(versionRef.current));
          }
          throw error;
        }
      });
      queueRef.current = task.catch(() => {});
      return task;
    },
    [applyServerCart],
  );

  const reload = useCallback(async () => {
    if (!userKey) return;
    setStatus('loading');
    try {
      applyServerCart(await fetchCart());
      setStatus('ready');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }, [userKey, applyServerCart]);

  // Đăng nhập / đăng xuất -> tải giỏ Backend + chuyển giỏ local lên
  useEffect(() => {
    if (isAuthLoading) return undefined;
    if (!userKey) {
      versionRef.current = null;
      setServerCart(null);
      setStatus('ready');
      return undefined;
    }

    let cancelled = false;
    setStatus('loading');
    (async () => {
      try {
        const cart = await fetchCart();
        if (cancelled) return;
        applyServerCart(cart);

        for (const line of readLocalCart().filter((item) => item.variantId)) {
          if (cancelled) return;
          try {
            await runServer((version) =>
              addCartItem({ expectedVersion: version, variantId: line.variantId, quantity: line.quantity }),
            );
            setLocalItems((items) => items.filter((item) => item.key !== line.key));
          } catch (error) {
            console.warn('[Cart] Không chuyển được sản phẩm lên giỏ Backend', line.name, error);
          }
        }
        if (!cancelled) setStatus('ready');
      } catch (error) {
        console.error(error);
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userKey, isAuthLoading, applyServerCart, runServer]);

  // Giỏ Backend chỉ trả MÃ option (vd COLOR: 'XANH_NAVY'). Dòng nào chưa có nhãn đẹp (thêm từ máy khác)
  // -> tải chi tiết sản phẩm 1 lần để lấy tên màu / size hiển thị ("Xanh navy").
  const labelRequestedRef = useRef(new Set());
  useEffect(() => {
    const missing = (serverCart?.items ?? []).filter(
      (item) => !labels[item.variantId] && !labelRequestedRef.current.has(item.productId),
    );
    const productIds = [...new Set(missing.map((item) => item.productId))];
    productIds.forEach((productId) => {
      labelRequestedRef.current.add(productId);
      getProductById(productId)
        .then((product) => {
          (product?.variants ?? []).forEach((variant) => {
            const sizeCode = variant.selections?.SIZE;
            const colorCode = variant.selections?.COLOR;
            rememberVariantLabel(variant.id, {
              size: product.sizeOptions?.find((option) => option.code === sizeCode)?.label ?? sizeCode ?? null,
              color: product.colors?.find((color) => color.code === colorCode)?.name ?? colorCode ?? null,
            });
          });
          setLabels(readVariantLabels());
        })
        .catch((error) => console.warn('[Cart] Không lấy được tên phân loại', productId, error));
    });
  }, [serverCart, labels]);

  // Đánh dấu dòng đang chờ Backend trả lời -> nút của dòng đó tạm khoá
  const withPending = useCallback(async (keys, work) => {
    setPendingKeys((prev) => new Set([...prev, ...keys]));
    try {
      return await work();
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        keys.forEach((key) => next.delete(key));
        return next;
      });
    }
  }, []);

  const addItem = useCallback(
    async (product, options = {}) => {
      const quantity = options.quantity ?? 1;
      let { variant = null, size, color } = options;
      let image = options.image ?? product.image ?? null;

      // Bấm "Thêm vào giỏ" ở thẻ sản phẩm (chưa chọn phân loại)
      if (!options.variant && product.source === 'api') {
        const detail = product.variants ? product : await getProductById(product.id);
        const sellable = (detail?.variants ?? []).filter((item) => item.availableQuantity > 0);
        const needsChoice = (detail?.sizes?.length ?? 0) > 1 || (detail?.colors?.length ?? 0) > 1;
        if (!detail || sellable.length !== 1 || needsChoice) return { status: 'needsOptions' };
        variant = sellable[0];
        size = size ?? detail.sizes?.[0];
        color = color ?? detail.colors?.[0]?.name;
        image = image ?? detail.image;
      }
      if (product.source !== 'api' && !size && !options.variant) {
        const sizes = product.sizes ?? [];
        const colors = product.colors ?? [];
        if (sizes.length > 1 || colors.length > 1) return { status: 'needsOptions' };
        size = sizes[0];
        color = color ?? colors[0]?.name;
      }

      if (variant) {
        rememberVariantLabel(variant.id, { size: size ?? null, color: color ?? null });
        setLabels(readVariantLabels());
      }

      // Đã đăng nhập + sản phẩm Backend -> thêm vào giỏ Backend
      if (variant && userKey) {
        await runServer((version) => addCartItem({ expectedVersion: version, variantId: variant.id, quantity }));
        setLastAddedAt(Date.now());
        return { status: 'added' };
      }

      // Còn lại -> giỏ local
      const key = `local:${product.id}:${variant?.id ?? ''}:${size ?? ''}:${color ?? ''}`;
      const maxQuantity = variant ? Math.max(1, Math.min(99, variant.availableQuantity)) : MOCK_MAX_QUANTITY;
      setLocalItems((items) => {
        const existing = items.find((item) => item.key === key);
        if (existing) {
          return items.map((item) =>
            item.key === key
              ? { ...item, quantity: Math.min(maxQuantity, item.quantity + quantity), selected: true }
              : item,
          );
        }
        return [
          ...items,
          {
            key,
            origin: 'local',
            id: key,
            productId: product.id,
            variantId: variant?.id ?? null,
            name: product.name,
            image,
            size: size ?? null,
            color: color ?? null,
            unitPrice: variant?.priceMinor ?? product.price,
            originalPrice: variant ? (variant.compareAtPriceMinor ?? null) : (product.originalPrice ?? null),
            quantity: Math.min(maxQuantity, quantity),
            maxQuantity,
            selected: true,
            availability: 'AVAILABLE',
            addedAt: Date.now(),
          },
        ];
      });
      setLastAddedAt(Date.now());
      return { status: 'added' };
    },
    [userKey, runServer],
  );

  const updateLocal = (key, patch) =>
    setLocalItems((items) => items.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  const updateQuantity = useCallback(
    async (item, quantity) => {
      const next = Math.max(1, Math.min(item.maxQuantity ?? 99, quantity));
      if (next === item.quantity) return;
      if (item.origin === 'local') return updateLocal(item.key, { quantity: next });
      await withPending([item.key], () =>
        runServer((version) =>
          updateCartItem(item.id, { expectedVersion: version, quantity: next, selected: item.selected }),
        ),
      );
    },
    [runServer, withPending],
  );

  const toggleSelected = useCallback(
    async (item, selected) => {
      if (item.origin === 'local') return updateLocal(item.key, { selected });
      await withPending([item.key], () =>
        runServer((version) =>
          updateCartItem(item.id, { expectedVersion: version, quantity: item.quantity, selected }),
        ),
      );
    },
    [runServer, withPending],
  );

  const removeItem = useCallback(
    async (item) => {
      if (item.origin === 'local') {
        setLocalItems((items) => items.filter((line) => line.key !== item.key));
        return;
      }
      await withPending([item.key], () => runServer((version) => removeCartItem(item.id, version)));
    },
    [runServer, withPending],
  );

  // Đổi màu / size của 1 dòng giỏ hàng.
  // - Dòng local: sửa thẳng (trùng với dòng đã có -> gộp số lượng)
  // - Dòng Backend: Backend không có API "đổi variant", nên THÊM variant mới trước rồi mới XOÁ dòng cũ
  //   (thêm lỗi, vd hết hàng -> dòng cũ vẫn còn nguyên, không mất hàng của khách)
  const changeItemOptions = useCallback(
    async (item, product, { size, colorId }) => {
      const color = product.colors?.find((entry) => entry.id === colorId) ?? null;
      const hasVariants = (product.variants?.length ?? 0) > 0;
      const variant = hasVariants ? findVariant(product, { size, colorId }) : null;
      if (hasVariants && (!variant || variant.availableQuantity < 1)) {
        throw new ApiError({ status: 409, code: 'CART_VARIANT_UNAVAILABLE', message: 'Variant unavailable' });
      }
      const label = { size: size || null, color: color?.name ?? null };
      const image = color?.image ?? product.image ?? item.image;

      if (item.origin === 'server') {
        if (!variant || variant.id === item.variantId) return;
        rememberVariantLabel(variant.id, label);
        setLabels(readVariantLabels());
        const quantity = Math.min(item.quantity, variant.availableQuantity);
        await withPending([item.key], async () => {
          await runServer((version) => addCartItem({ expectedVersion: version, variantId: variant.id, quantity }));
          await runServer((version) => removeCartItem(item.id, version));
        });
        return;
      }

      const key = `local:${item.productId}:${variant?.id ?? ''}:${label.size ?? ''}:${label.color ?? ''}`;
      if (key === item.key) return;
      const maxQuantity = variant ? Math.max(1, Math.min(99, variant.availableQuantity)) : MOCK_MAX_QUANTITY;
      if (variant) {
        rememberVariantLabel(variant.id, label);
        setLabels(readVariantLabels());
      }
      setLocalItems((lines) => {
        const position = lines.findIndex((line) => line.key === item.key);
        const rest = lines.filter((line) => line.key !== item.key);
        const existing = rest.find((line) => line.key === key);
        if (existing) {
          return rest.map((line) =>
            line.key === key ? { ...line, quantity: Math.min(maxQuantity, line.quantity + item.quantity) } : line,
          );
        }
        const updated = {
          key,
          origin: 'local',
          id: key,
          productId: item.productId,
          variantId: variant?.id ?? null,
          name: item.name,
          image,
          size: label.size,
          color: label.color,
          unitPrice: variant?.priceMinor ?? product.price ?? item.unitPrice,
          originalPrice: variant ? (variant.compareAtPriceMinor ?? null) : (product.originalPrice ?? null),
          quantity: Math.min(maxQuantity, item.quantity),
          maxQuantity,
          selected: item.selected,
          availability: 'AVAILABLE',
          addedAt: item.addedAt ?? Date.now(),
        };
        rest.splice(Math.max(0, position), 0, updated); // giữ nguyên vị trí dòng trong giỏ
        return rest;
      });
    },
    [runServer, withPending],
  );

  const items = useMemo(() => {
    const fromServer = (serverCart?.items ?? []).map((item) => {
      const label = labels[item.variantId] ?? {};
      const size = label.size ?? item.options.SIZE ?? null;
      const color = label.color ?? item.options.COLOR ?? null;
      return { ...item, size, color };
    });
    return [...fromServer, ...localItems].map((item) => ({
      ...item,
      variantText: [item.color, item.size].filter(Boolean).join(' / '),
      lineTotal: item.unitPrice * item.quantity,
      pending: pendingKeys.has(item.key),
      purchasable: item.availability === 'AVAILABLE',
    }));
  }, [serverCart, localItems, labels, pendingKeys]);

  const setAllSelected = useCallback(
    async (selected) => {
      setLocalItems((lines) => lines.map((line) => ({ ...line, selected })));
      const serverItems = items.filter((item) => item.origin === 'server' && item.selected !== selected);
      if (!serverItems.length) return;
      await withPending(
        serverItems.map((item) => item.key),
        () =>
          runServer((version) =>
            updateCartSelection({ expectedVersion: version, itemIds: serverItems.map((item) => item.id), selected }),
          ),
      );
    },
    [items, runServer, withPending],
  );

  const removeItems = useCallback(
    async (list) => {
      for (const item of list) await removeItem(item);
    },
    [removeItem],
  );

  const value = useMemo(() => {
    const selectedItems = items.filter((item) => item.selected && item.purchasable);
    return {
      items,
      status,
      isServerCart: Boolean(userKey),
      lastAddedAt,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: items.reduce((sum, item) => sum + item.lineTotal, 0),
      selectedItems,
      selectedQuantity: selectedItems.reduce((sum, item) => sum + item.quantity, 0),
      selectedSubtotal: selectedItems.reduce((sum, item) => sum + item.lineTotal, 0),
      addItem,
      changeItemOptions,
      updateQuantity,
      toggleSelected,
      setAllSelected,
      removeItem,
      removeItems,
      reload,
    };
  }, [
    items,
    status,
    userKey,
    lastAddedAt,
    addItem,
    changeItemOptions,
    updateQuantity,
    toggleSelected,
    setAllSelected,
    removeItem,
    removeItems,
    reload,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
