import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../../../components/common/Icon';
import Logo from '../../../components/layout/Logo';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../hooks/useLanguage';
import { getOnboardingQueue, getModerationCases, getPayouts, isPlatformStaff } from '../../../services/admin/platformService';
import '../../account/AccountScreens.css';
import '../AdminScreens.css';

// Menu bên trái. badge: số việc cần xử lý (hồ sơ chờ duyệt, báo cáo vi phạm, yêu cầu rút tiền).
const NAV_GROUPS = [
  { id: 'overview', items: [{ id: 'dashboard', to: '/admin', icon: 'home', end: true }] },
  {
    id: 'sellers',
    items: [
      { id: 'sellerReviews', to: '/admin/seller-reviews', icon: 'doc', badge: 'onboardings' },
      { id: 'shops', to: '/admin/shops', icon: 'store' },
      { id: 'productCases', to: '/admin/product-cases', icon: 'flag', badge: 'cases' },
    ],
  },
  {
    id: 'operations',
    items: [
      { id: 'orders', to: '/admin/orders', icon: 'receipt' },
      { id: 'reviews', to: '/admin/reviews', icon: 'star' },
      { id: 'payouts', to: '/admin/payouts', icon: 'card', badge: 'payouts' },
    ],
  },
  {
    id: 'system',
    items: [
      { id: 'users', to: '/admin/users', icon: 'user' },
      { id: 'roles', to: '/admin/roles', icon: 'shield' },
    ],
  },
];

function AdminShell() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [badges, setBadges] = useState({});

  useEffect(() => setMenuOpen(false), [pathname]);

  // Số việc cần xử lý trên menu (API nào không có quyền thì bỏ qua)
  useEffect(() => {
    let active = true;
    const count = (promise) => promise.then((page) => page.items.length + (page.hasMore ? '+' : '')).catch(() => 0);
    Promise.all([
      count(getOnboardingQueue({ status: 'PENDING_REVIEW', limit: 50 })),
      count(getModerationCases({ status: 'OPEN', limit: 50 })),
      count(getPayouts({ status: 'REQUESTED', limit: 50 })),
    ]).then(([onboardings, cases, payouts]) => active && setBadges({ onboardings, cases, payouts }));
    return () => {
      active = false;
    };
  }, [pathname]);

  return (
    <div className="admin">
      <header className="admin-top">
        <button type="button" className="icon-btn admin-top__menu" aria-label={t('admin.openMenu')} aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
          <Icon name={menuOpen ? 'close' : 'menu'} />
        </button>
        <div className="admin-top__brand">
          <Logo />
          <Link to="/admin" className="admin-top__tag">{t('market.admin.brandTag')}</Link>
        </div>
        <div className="admin-top__right">
          <a href="/" target="_blank" rel="noreferrer" className="admin-top__link">
            <Icon name="bag" size={18} />
            <span>{t('admin.viewStore')}</span>
          </a>
          <div className="admin-user">
            <span className="admin-avatar" style={{ width: 34, height: 34 }} aria-hidden="true">
              {(user.displayName ?? user.email ?? '?').charAt(0).toUpperCase()}
            </span>
            <span className="admin-user__text">
              <span className="admin-user__name">{user.displayName ?? user.email}</span>
              <span className="admin-user__role">{(user.roles ?? []).filter((r) => r.startsWith('PLATFORM_')).map((r) => t(`market.platformRoles.${r}`, { defaultValue: r })).join(', ')}</span>
            </span>
          </div>
          <button
            type="button"
            className="admin-top__link"
            onClick={async () => {
              await logout();
              navigate('/admin/login', { replace: true });
            }}
          >
            <Icon name="logout" size={18} />
            <span>{t('auth.logout')}</span>
          </button>
        </div>
      </header>

      <div className="admin-body">
        {menuOpen && <button type="button" className="admin-backdrop" aria-label={t('common.close')} onClick={() => setMenuOpen(false)} />}
        <aside className={`admin-side ${menuOpen ? 'admin-side--open' : ''}`} aria-label={t('admin.menuLabel')}>
          <nav>
            {NAV_GROUPS.map((group) => (
              <div key={group.id} className="admin-side__group">
                <p className="admin-side__title">{t(`market.admin.navGroups.${group.id}`)}</p>
                <ul>
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <NavLink to={item.to} end={item.end} className={({ isActive }) => `admin-side__link ${isActive ? 'admin-side__link--active' : ''}`}>
                        <Icon name={item.icon} size={18} />
                        <span>{t(`market.admin.nav.${item.id}`)}</span>
                        {item.badge && badges[item.badge] ? <span className="admin-side__badge">{badges[item.badge]}</span> : null}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>
        <main className="admin-main" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/**
 * TRANG QUẢN TRỊ SÀN (/admin/...) — CHỈ nhân viên TrendyLab (vai trò PLATFORM_ADMIN / MODERATOR / SUPPORT).
 * Dùng chung đăng nhập với web (POST /auth/login), phân quyền theo UserResponse.roles của GET /users/me.
 * Việc của sàn: duyệt người bán, kiểm duyệt shop / sản phẩm / đánh giá, hỗ trợ đơn hàng, duyệt rút tiền,
 * quản lý tài khoản. Quản lý sản phẩm / đơn của từng shop là việc của người bán ở /seller.
 */
function AdminLayout() {
  const { user, isAuthLoading } = useAuth();
  const location = useLocation();
  if (isAuthLoading) return <div className="account-skeleton" />;
  if (!user || !isPlatformStaff(user)) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <AdminShell />;
}

export default AdminLayout;
