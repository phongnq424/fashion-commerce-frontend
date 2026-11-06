import { createContext } from 'react';

// Hộp dữ liệu giỏ hàng. Logic nằm trong CartProvider.jsx, cách lấy ra nằm trong hooks/useCart.js
export const CartContext = createContext(null);
