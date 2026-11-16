import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import Logo from '../../../components/layout/Logo';
import { SellerProvider } from '../../../contexts/SellerProvider';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../hooks/useLanguage';
import { useSeller } from '../../../hooks/useSeller';
import { getShopOrders } from '../../../services/seller/sellerOrderService';
import { getShopReturns } from '../../../services/seller/sellerReturnService';
import '../../account/AccountScreens.css';
import '../SellerScreens.css';

// Menu bên trái. Thêm mục: thêm 1 dòng + chữ trong i18n (seller.nav.<id>). badge: số việc cần làm.
const NAV_GROUPS = [
  { id: 'overview', items: [{ id: 'dashboard', to: '/seller', icon: 'home', end: true }] },
  {
    id: 'orders',
    items: [
      { id: 'orders', to: '/seller/orders', icon: 'receipt', badge: 'pendingOrders' },
      { id: 'returns', to: '/seller/returns', icon: 'refresh', badge: 'requestedReturns' },
      { id: 'cod', to: '/seller/cod', icon: 'card' },
    ],
  },
  {
    id: 'products',
    items: [
      { id: 'products', to: '/seller/products', icon: 'hanger', end: true },
      { id: 'newProduct', to: '/seller/products/new', icon: 'plus' },
      { id: 'inventory', to: '/seller/inventory', icon: 'package' },
    ],
  },
  {
    id: 'marketing',
    items: [
      { id: 'vouchers', to: '/seller/vouchers', icon: 'ticket' },
      { id: 'reviews', to: '/seller/reviews', icon: 'star' },
    ],
  },
  {
    id: 'finance',
    items: [
      { id: 'finance', to: '/seller/finance', icon: 'card' },
      { id: 'reports', to: '/seller/reports', icon: 'receipt' },
    ],
  },
  {
    id: 'shop',
    items: [
      { id: 'profile', to: '/seller/profile', icon: 'store' },
      { id: 'settings', to: '/seller/settings', icon: 'settings' },
      { id: 'staff', to: '/seller/staff', icon: 'user' },
      { id: 'ownership', to: '/seller/ownership', icon: 'shield' },
    ],
  },
  {
    id: 'account',
    items: [
      { id: 'invitations', to: '/seller/invitations', icon: 'mail' },
      { id: 'shops', to: '/seller/shops', icon: 'grid' },
    ],
  },
];

function ShopAvatar({ shop, size = 32 }) {
  return (
    <span className="seller-avatar" style={{ width: size, height: size }} aria-hidden="true">
      {shop?.logoUrl ? <img src={shop.logoUrl} alt="" /> : (shop?.name ?? '?').charAt(0).toUpperCase()}
    </span>
  );
}

export { ShopAvatar };

// Nút chọn shop trên thanh trên cùng
function ShopSwitcher() {
  const { t } = useLanguage();
  const { shops, shop, selectShop } = useSeller();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => !ref.current?.contains(event.target) && setOpen(false);
    const onKey = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!shop) return null;

  return (
    <div className="shop-switcher" ref={ref}>
      <button type="button" className="shop-switcher__btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <ShopAvatar shop={shop} />
        <span className="shop-switcher__text">
          <span className="shop-switcher__name">{shop.name}</span>
          <span className="shop-switcher__role">{t(`seller.roles.${shop.myRoles[0] ?? 'SHOP_OWNER'}`)}</span>
        </span>
        <Icon name="chevronDown" size={16} />
      </button>
      {open && (
        <div className="shop-switcher__menu">
          <p className="shop-switcher__label">{t('seller.switcher.label')}</p>
          <ul role="listbox" aria-label={t('seller.switcher.label')}>
            {shops.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={item.id === shop.id}
                  className="shop-switcher__item"
                  onClick={() => {
                    selectShop(item.id);
                    setOpen(false);
                  }}
                >
                  <ShopAvatar shop={item} size={28} />
                  <span className="shop-switcher__text">
                    <span className="shop-switcher__name">{item.name}</span>
                    <span className="shop-switcher__role">{t(`seller.roles.${item.myRoles[0] ?? 'SHOP_OWNER'}`)}</span>
                  </span>
                  {item.id === shop.id && <Icon name="check" size={16} />}
                </button>
              </li>
            ))}
          </ul>
          <Link to="/seller/shops" className="shop-switcher__footer" onClick={() => setOpen(false)}>
            <Icon name="grid" size={16} />
            {t('seller.switcher.manage')}
          </Link>
        </div>
      )}
    </div>
  );
}

function SellerShell() {
  const { t } = useLanguage();
  const { user, isAuthLoading, openAuth, logout } = useAuth();
  const { shopId, status } = useSeller();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [badges, setBadges] = useState({});

  // Đóng menu (mobile) khi đổi trang
  useEffect(() => setMenuOpen(false), [pathname]);

  // Số việc cần làm trên menu: đơn chờ xác nhận, trả hàng chờ duyệt
  useEffect(() => {
    if (!shopId) {
      setBadges({});
      return;
    }
    let active = true;
    Promise.all([getShopOrders(shopId, { status: 'PENDING_CONFIRMATION' }), getShopReturns(shopId)])
      .then(([orders, returns]) => {
        if (!active) return;
        setBadges({
          pendingOrders: orders.items.length,
          requestedReturns: returns.items.filter((r) => r.status === 'REQUESTED').length,
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [shopId, pathname]);

  return (
    <div className="seller">
      <header className="seller-top">
        <button
          type="button"
          className="icon-btn seller-top__menu"
          aria-label={t('seller.openMenu')}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} />
        </button>
        {/* Dùng lại đúng logo của site (components/layout/Logo) để giữ nguyên font chữ thương hiệu */}
        <div className="seller-top__brand">
          <Logo />
          <Link to="/seller" className="seller-top__tag">
            {t('seller.brandTag')}
          </Link>
        </div>
        <div className="seller-top__right">
          {user && <ShopSwitcher />}
          <Link to="/" className="seller-top__link">
            <Icon name="bag" size={18} />
            <span>{t('seller.backToStore')}</span>
          </Link>
          {user && (
            <button type="button" className="seller-top__link" onClick={logout}>
              <Icon name="logout" size={18} />
              <span>{t('auth.logout')}</span>
            </button>
          )}
        </div>
      </header>

      {!user ? (
        <main className="seller-guest" id="main-content">
          <div className="account-card">
            {isAuthLoading ? (
              <p role="status">{t('common.loading')}</p>
            ) : (
              <EmptyState
                icon="store"
                title={t('seller.guestTitle')}
                text={t('seller.guestText')}
                action={<Button onClick={() => openAuth('login')}>{t('account.loginNow')}</Button>}
              />
            )}
          </div>
        </main>
      ) : (
        <div className="seller-body">
          {menuOpen && <button type="button" className="seller-backdrop" aria-label={t('common.close')} onClick={() => setMenuOpen(false)} />}
          <aside className={`seller-side ${menuOpen ? 'seller-side--open' : ''}`} aria-label={t('seller.menuLabel')}>
            <nav>
              {NAV_GROUPS.map((group) => (
                <div key={group.id} className="seller-side__group">
                  <p className="seller-side__title">{t(`seller.navGroups.${group.id}`)}</p>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <NavLink
                          to={item.to}
                          end={item.end}
                          className={({ isActive }) => `seller-side__link ${isActive ? 'seller-side__link--active' : ''}`}
                        >
                          <Icon name={item.icon} size={18} />
                          <span>{t(`seller.nav.${item.id}`)}</span>
                          {item.badge && badges[item.badge] > 0 && <span className="seller-side__badge">{badges[item.badge]}</span>}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>
          <main className="seller-main" id="main-content" tabIndex={-1}>
            {status === 'loading' ? <div className="account-skeleton" /> : <Outlet />}
          </main>
        </div>
      )}
    </div>
  );
}

/**
 * KHU VỰC NGƯỜI BÁN (/seller/...) — bố cục riêng, không dùng Header / Footer của trang mua sắm:
 *   [☰ TrendyLab Kênh Người Bán            (Shop ▾)  Về trang mua sắm  Đăng xuất]
 *   [Menu nhóm: Tổng quan / Đơn hàng / Sản phẩm / Khách hàng / Shop / Tài khoản | Nội dung trang]
 * Mobile: menu trái thành ngăn trượt (nút ☰).
 */
function SellerLayout() {
  return (
    <SellerProvider>
      <SellerShell />
    </SellerProvider>
  );
}

export default SellerLayout;
