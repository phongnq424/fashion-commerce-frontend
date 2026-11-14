import { useContext } from 'react';
import { WishlistContext } from '../contexts/WishlistContext';

// Cách dùng:  const { isWishlisted, toggleWishlist } = useWishlist();
export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist phải được dùng bên trong <WishlistProvider>');
  return context;
}
