import { NavLink } from 'react-router-dom';
import Breadcrumb from '../../../components/common/Breadcrumb';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../hooks/useLanguage';
import { useNotifications } from '../../../hooks/useNotifications';
import '../AccountScreens.css';

// Menu bên trái khu vực tài khoản. Thêm mục mới: thêm 1 dòng + chữ trong i18n (account.nav.<id>)
export const ACCOUNT_NAV = [
  { id: 'profile', to: '/account', icon: 'user', end: true },
  { id: 'orders', to: '/account/orders', icon: 'package' },
  { id: 'returns', to: '/account/returns', icon: 'refresh' },
  { id: 'addresses', to: '/account/addresses', icon: 'mapPin' },
  { id: 'wishlist', to: '/account/wishlist', icon: 'heart' },
  { id: 'notifications', to: '/account/notifications', icon: 'bell' },
];

/**
 * Khung chung cho mọi trang tài khoản (bố cục phổ biến của các sàn TMĐT):
 *   Breadcrumb
 *   [ Sidebar: avatar + tên + menu ] [ Nội dung trang ]
 * Mobile: sidebar thành hàng tab cuộn ngang ở trên.
 * - title: tiêu đề trang       - actions: nút bên phải tiêu đề (tuỳ chọn)
 * - breadcrumb: các mục thêm sau "Tài khoản" (tuỳ chọn)
 * Chưa đăng nhập -> hiện khối mời đăng nhập thay cho nội dung.
 */
function AccountLayout({ title, subtitle, actions, breadcrumb = [], children }) {
  const { t } = useLanguage();
  const { user, isAuthLoading, openAuth, logout } = useAuth();
  const { unreadCount } = useNotifications();

  const crumbs = [
    { label: t('breadcrumb.home'), to: '/' },
    { label: t('account.title'), to: breadcrumb.length ? '/account' : undefined },
    ...breadcrumb,
  ];

  if (!user) {
    return (
      <>
        <Breadcrumb items={crumbs} />
        <section className="account-page container">
          <div className="account-card account-guest">
            {isAuthLoading ? (
              <p role="status">{t('common.loading')}</p>
            ) : (
              <EmptyState
                icon="user"
                title={t('account.guestTitle')}
                text={t('account.guestText')}
                action={<Button onClick={() => openAuth('login')}>{t('account.loginNow')}</Button>}
              />
            )}
          </div>
        </section>
      </>
    );
  }

  const initial = user.name?.trim().charAt(0).toUpperCase() || '?';

  return (
    <>
      <Breadcrumb items={crumbs} />
      <section className="account-page container">
        <aside className="account-side" aria-label={t('account.navLabel')}>
          <div className="account-side__user">
            <span className="account-side__avatar" aria-hidden="true">
              {initial}
            </span>
            <div className="account-side__who">
              <p className="account-side__name">{user.name}</p>
              <p className="account-side__email">{user.email}</p>
            </div>
          </div>
          <nav>
            <ul className="account-side__nav">
              {ACCOUNT_NAV.map((item) => (
                <li key={item.id}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `account-side__link ${isActive ? 'account-side__link--active' : ''}`}
                  >
                    <Icon name={item.icon} size={18} />
                    <span>{t(`account.nav.${item.id}`)}</span>
                    {item.id === 'notifications' && unreadCount > 0 && (
                      <span className="account-side__count" aria-label={t('notifications.unreadLabel', { count: unreadCount })}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
              <li className="account-side__logout">
                <button type="button" className="account-side__link" onClick={logout}>
                  <Icon name="logout" size={18} />
                  <span>{t('auth.logout')}</span>
                </button>
              </li>
            </ul>
          </nav>
        </aside>

        <div className="account-main">
          <header className="account-main__head">
            <div>
              <h1 className="account-main__title">{title}</h1>
              {subtitle && <p className="account-main__subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="account-main__actions">{actions}</div>}
          </header>
          {children}
        </div>
      </section>
    </>
  );
}

export default AccountLayout;
