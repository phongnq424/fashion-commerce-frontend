import { useContext } from 'react';
import { CartContext } from '../contexts/CartContext';

// Cách dùng:  const { items, totalQuantity, addItem, removeItem } = useCart();
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart phải được dùng bên trong <CartProvider>');
  }
  return context;
}
