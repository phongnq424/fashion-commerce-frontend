import { useCallback, useEffect, useMemo, useState } from 'react';
import { SellerContext } from './SellerContext';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useAuth } from '../hooks/useAuth';
import { getMyOnboarding } from '../services/seller/onboardingService';
import { getMyShops } from '../services/seller/shopService';

const readSaved = () => {
  try {
    return localStorage.getItem(STORAGE_KEYS.sellerShop);
  } catch {
    return null;
  }
};

/**
 * Trạng thái dùng chung của Seller Center:
 *   shops        danh sách shop tôi có quyền vào (GET /shops/mine)
 *   shop/shopId  shop đang chọn (nhớ trên trình duyệt)
 *   onboarding   hồ sơ đăng ký bán hàng của tôi (GET /seller/onboarding/me) — null nếu chưa đăng ký
 *   status       'loading' | 'ready' | 'error'
 *   selectShop(id), refreshShops(), refreshOnboarding()
 */
export function SellerProvider({ children }) {
  const { user } = useAuth();
  const [shops, setShops] = useState([]);
  const [shopId, setShopId] = useState(readSaved);
  const [onboarding, setOnboarding] = useState(null);
  const [status, setStatus] = useState('loading');

  const refreshShops = useCallback(async () => {
    const page = await getMyShops();
    setShops(page.items);
    setShopId((current) => (page.items.some((item) => item.id === current) ? current : page.items[0]?.id ?? null));
    return page.items;
  }, []);

  const refreshOnboarding = useCallback(async () => {
    const row = await getMyOnboarding();
    setOnboarding(row);
    return row;
  }, []);

  useEffect(() => {
    if (!user) {
      setStatus('ready');
      return;
    }
    let active = true;
    setStatus('loading');
    Promise.all([refreshShops(), refreshOnboarding()])
      .then(() => active && setStatus('ready'))
      .catch((error) => {
        console.error(error);
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [user, refreshShops, refreshOnboarding]);

  useEffect(() => {
    try {
      if (shopId) localStorage.setItem(STORAGE_KEYS.sellerShop, shopId);
    } catch {
      /* bỏ qua */
    }
  }, [shopId]);

  const shop = shops.find((item) => item.id === shopId) ?? null;
  const roles = shop?.myRoles ?? [];
  const value = useMemo(
    () => ({
      shops,
      shop,
      shopId: shop?.id ?? null,
      roles,
      isOwner: roles.includes('SHOP_OWNER'),
      onboarding,
      status,
      selectShop: setShopId,
      refreshShops,
      refreshOnboarding,
    }),
    [shops, shop, roles, onboarding, status, refreshShops, refreshOnboarding],
  );

  return <SellerContext.Provider value={value}>{children}</SellerContext.Provider>;
}
