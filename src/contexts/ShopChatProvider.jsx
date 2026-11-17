import { useCallback, useMemo, useState } from 'react';
import { ShopChatContext } from './ShopChatContext';

/**
 * Trạng thái chung của khung chat với shop (nút chat góc phải dưới, có trên các trang của khách).
 *   context      { shop, product } của trang đang xem (trang chi tiết đăng ký qua useChatContext) | null
 *   isOpen       khung chat đang mở?
 *   target       shop được chọn khi mở chat: { id, name, productCount } | null (null = shop của trang / shop đầu danh sách)
 *   openChat({ shop, product }?) / closeChat()
 */
export function ShopChatProvider({ children }) {
  const [context, setContext] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [target, setTarget] = useState(null);

  const openChat = useCallback((options = {}) => {
    setTarget(options.shop ? { shop: options.shop, product: options.product ?? null } : null);
    setIsOpen(true);
  }, []);
  const closeChat = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ context, setContext, isOpen, target, openChat, closeChat }),
    [context, isOpen, target, openChat, closeChat],
  );

  return <ShopChatContext.Provider value={value}>{children}</ShopChatContext.Provider>;
}
