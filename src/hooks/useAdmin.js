import { useContext } from 'react';
import { AdminContext } from '../contexts/AdminContext';

// Cách dùng (chỉ trong khu vực /admin):  const { admin, shop, shopId, roles } = useAdmin();
export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin phải được dùng bên trong <AdminProvider>');
  return context;
}
