import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../../../components/common/Icon';
import Logo from '../../../components/layout/Logo';
import { AdminProvider } from '../../../contexts/AdminProvider';
import { logoutAdmin } from '../../../services/admin/adminAuth';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAdmin } from '../../../hooks/useAdmin';
import { useAdminSession } from '../../../hooks/useAdminSession';
import { getShopOrders } from '../../../services/admin/orderAdminService';
import { getShopReturns } from '../../../services/admin/returnAdminService';
import '../../account/AccountScreens.css';
import '../AdminScreens.css';

// Menu bên trái. Thêm mục: thêm 1 dòng + chữ trong i18n (admin.nav.<id>). badge: số việc cần làm.
const NAV_GROUPS = [
  { id: 'overview', items: [{ id: 'dashboard', to: '/admin', icon: 'home', end: true }] },
  {
    id: 'orders',
    items: [
      { id: 'orders', to: '/admin/orders', icon: 'receipt', badge: 'pendingOrders' },
      { id: 'returns', to: '/admin/returns', icon: 'refresh', badge: 'requestedReturns' },
      { id: 'cod', to: '/admin/cod', icon: 'card' },
    ],
  },
  {
    id: 'products',
    items: [
      { id: 'products', to: '/admin/products', icon: 'hanger', end: true },
      { id: 'newProduct', to: '/admin/products/new', icon: 'plus' },
      { id: 'inventory', to: '/admin/inventory', icon: 'package' },
    ],
  },
  { id: 'customers', items: [{ id: 'reviews', to: '/admin/reviews', icon: 'star' }] },
  {
    id: 'shop',
    items: [
      { id: 'profile', to: '/admin/profile', icon: 'store' },
      { id: 'settings', to: '/admin/settings', icon: 'settings' },
      { id: 'staff', to: '/admin/staff', icon: 'user' },
    ],
  },
];

function ShopAvatar({ shop, size = 32 }) {
  return (
    <span className="admin-avatar" style={{ width: size, height: size }} aria-hidden="true">
      {shop?.logoUrl ? <img src={shop.logoUrl} alt="" /> : (shop?.name ?? '?').charAt(0).toUpperCase()}
    </span>
  );
}

export { ShopAvatar };

// Nhân viên đang đăng nhập (góc phải thanh trên cùng)
function AdminUser() {
  const { t } = useLanguage();
  const { admin, roles } = useAdmin();
  if (!admin) return null;
  return (
    <div className="admin-user">
      <span className="admin-avatar" style={{ width: 34, height: 34 }} aria-hidden="true">
        {admin.displayName.charAt(0).toUpperCase()}
      </span>
      <span className="admin-user__text">
        <span className="admin-user__name">{admin.displayName}</span>
        <span className="admin-user__role">{roles[0] ? t(`admin.roles.${roles[0]}`) : admin.email}</span>
      </span>
    </div>
  );
}

function AdminShell() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { admin, shopId, status } = useAdmin();
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
    <div className="admin">
      <header className="admin-top">
        <button
          type="button"
          className="icon-btn admin-top__menu"
          aria-label={t('admin.openMenu')}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} />
        </button>
        {/* Dùng lại đúng logo của site (components/layout/Logo) để giữ nguyên font chữ thương hiệu */}
        <div className="admin-top__brand">
          <Logo />
          <Link to="/admin" className="admin-top__tag">
            {t('admin.brandTag')}
          </Link>
        </div>
        <div className="admin-top__right">
          {/* Mở web bán hàng ở tab mới để xem sản phẩm hiển thị với khách */}
          <a href="/" target="_blank" rel="noreferrer" className="admin-top__link">
            <Icon name="bag" size={18} />
            <span>{t('admin.viewStore')}</span>
          </a>
          <AdminUser />
          <button
            type="button"
            className="admin-top__link"
            onClick={() => {
              logoutAdmin();
              navigate('/admin/login', { replace: true });
            }}
          >
            <Icon name="logout" size={18} />
            <span>{t('auth.logout')}</span>
          </button>
        </div>
      </header>

      {admin && (
        <div className="admin-body">
          {menuOpen && <button type="button" className="admin-backdrop" aria-label={t('common.close')} onClick={() => setMenuOpen(false)} />}
          <aside className={`admin-side ${menuOpen ? 'admin-side--open' : ''}`} aria-label={t('admin.menuLabel')}>
            <nav>
              {NAV_GROUPS.map((group) => (
                <div key={group.id} className="admin-side__group">
                  <p className="admin-side__title">{t(`admin.navGroups.${group.id}`)}</p>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <NavLink
                          to={item.to}
                          end={item.end}
                          className={({ isActive }) => `admin-side__link ${isActive ? 'admin-side__link--active' : ''}`}
                        >
                          <Icon name={item.icon} size={18} />
                          <span>{t(`admin.nav.${item.id}`)}</span>
                          {item.badge && badges[item.badge] > 0 && <span className="admin-side__badge">{badges[item.badge]}</span>}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>
          <main className="admin-main" id="main-content" tabIndex={-1}>
            {status === 'loading' || !shopId ? <div className="account-skeleton" /> : <Outlet />}
          </main>
        </div>
      )}
    </div>
  );
}

/**
 * TRANG QUẢN TRỊ (/admin/...) — CHỈ dành cho nhân viên TrendyLab, tách hẳn khỏi web khách hàng:
 *   - Web khách không có đường dẫn nào tới đây; nhân viên tự mở /admin.
 *   - Chưa đăng nhập quản trị -> chuyển sang /admin/login (đăng nhập riêng, không dùng popup của khách).
 *   [☰ TRENDY Lab  Quản trị            Xem cửa hàng  (Nhân viên)  Đăng xuất]
 *   [Menu nhóm: Tổng quan / Đơn hàng / Sản phẩm / Khách hàng / Cửa hàng | Nội dung trang]
 * Mobile: menu trái thành ngăn trượt (nút ☰).
 */
function AdminLayout() {
  const session = useAdminSession();
  const location = useLocation();
  if (!session) return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />;
  return (
    <AdminProvider>
      <AdminShell />
    </AdminProvider>
  );
}

export default AdminLayout;
