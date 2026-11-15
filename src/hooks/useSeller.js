import { useContext } from 'react';
import { SellerContext } from '../contexts/SellerContext';

// Cách dùng (chỉ trong khu vực /seller):  const { shop, shopId, shops, refreshShops } = useSeller();
export function useSeller() {
  const context = useContext(SellerContext);
  if (!context) throw new Error('useSeller phải được dùng bên trong <SellerProvider>');
  return context;
}
