import { useContext, useEffect } from 'react';
import { ShopChatContext } from '../contexts/ShopChatContext';

// Cách dùng:  const { openChat, product } = useShopChat();
export function useShopChat() {
  const context = useContext(ShopChatContext);
  if (!context) throw new Error('useShopChat phải được dùng bên trong <ShopChatProvider>');
  return context;
}

// Trang chi tiết sản phẩm gọi hook này -> nút "Nhắn shop" biết đang hỏi về sản phẩm nào.
// Rời trang -> tự xoá, chat quay về nhắn chung với TrendyLab.
export function useChatProduct(product) {
  const { setProduct } = useShopChat();
  useEffect(() => {
    setProduct(product ?? null);
    return () => setProduct(null);
  }, [product, setProduct]);
}
