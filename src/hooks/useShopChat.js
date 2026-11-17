import { useContext, useEffect } from 'react';
import { ShopChatContext } from '../contexts/ShopChatContext';

// Cách dùng:  const { openChat, closeChat, isOpen } = useShopChat();
export function useShopChat() {
  const context = useContext(ShopChatContext);
  if (!context) throw new Error('useShopChat phải được dùng bên trong <ShopChatProvider>');
  return context;
}

// Trang chi tiết sản phẩm gọi hook này -> bấm nút chat góc phải là nhắn đúng shop bán, kèm sản phẩm đang xem.
// Rời trang -> tự xoá.
export function useChatContext(shop, product) {
  const { setContext } = useShopChat();
  useEffect(() => {
    setContext(shop ? { shop, product: product ?? null } : null);
    return () => setContext(null);
  }, [shop, product, setContext]);
}
