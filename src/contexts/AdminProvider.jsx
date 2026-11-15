import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminContext } from './AdminContext';
import { useAdminSession } from '../hooks/useAdminSession';
import { getStore } from '../services/admin/shopService';

/**
 * Trạng thái dùng chung của trang quản trị:
 *   admin      nhân viên quản trị đang đăng nhập (phiên riêng, không phải tài khoản khách)
 *   shop       cửa hàng TrendyLab (TrendyLab chỉ có 1 cửa hàng) — backend gọi là "shop"
 *   shopId     id cửa hàng, truyền vào các API /shops/{shopId}/...
 *   roles      vai trò của tôi trong cửa hàng (SHOP_OWNER, SHOP_MANAGER, ...)
 *   status     'loading' | 'ready' | 'error'
 *   refreshStore()
 */
export function AdminProvider({ children }) {
  const session = useAdminSession();
  const admin = session?.user ?? null;
  const [shop, setShop] = useState(null);
  const [status, setStatus] = useState('loading');

  const refreshStore = useCallback(async () => {
    const data = await getStore();
    setShop(data);
    return data;
  }, []);

  useEffect(() => {
    if (!admin) {
      setShop(null);
      setStatus('ready');
      return undefined;
    }
    let active = true;
    setStatus('loading');
    refreshStore()
      .then(() => active && setStatus('ready'))
      .catch((error) => {
        console.error(error);
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [admin?.id, refreshStore]); // eslint-disable-line react-hooks/exhaustive-deps

  const roles = shop?.myRoles ?? [];
  const value = useMemo(
    () => ({ admin, shop, shopId: shop?.id ?? null, roles, isOwner: roles.includes('SHOP_OWNER'), status, refreshStore }),
    [admin, shop, roles, status, refreshStore],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
