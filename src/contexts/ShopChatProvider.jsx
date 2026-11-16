import { useCallback, useMemo, useState } from 'react';
import { ShopChatContext } from './ShopChatContext';

/**
 * Trạng thái chung của chat với shop (nút "Nhắn shop" góc phải dưới, có trên mọi trang).
 *   product       sản phẩm đang xem (trang chi tiết đăng ký qua useChatProduct) | null
 *   isOpen        khung chat đang mở?
 *   openChat() / closeChat()
 */
export function ShopChatProvider({ children }) {
  const [product, setProduct] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ product, setProduct, isOpen, openChat, closeChat }),
    [product, isOpen, openChat, closeChat],
  );

  return <ShopChatContext.Provider value={value}>{children}</ShopChatContext.Provider>;
}
