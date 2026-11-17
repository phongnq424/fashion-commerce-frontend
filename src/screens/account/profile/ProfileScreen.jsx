import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import StatusBadge from '../../../components/common/StatusBadge';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../hooks/useLanguage';
import { useNotifications } from '../../../hooks/useNotifications';
import { useWishlist } from '../../../hooks/useWishlist';
import { formatAddressLine, getAddresses } from '../../../services/addressService';
import { getMyOrders } from '../../../services/myOrderService';
import { formatPrice } from '../../../utils/format';
import { formatDateTime, statusTone } from '../../../utils/status';
import AccountLayout from '../components/AccountLayout';

/**
 * /account — Tổng quan tài khoản (dạng "dashboard" như các sàn TMĐT):
 *   - Thẻ thông tin cá nhân (GET /users/me: displayName, email, phone, emailVerifiedAt)
 *   - 4 ô số liệu nhanh: đơn hàng, chờ xử lý, yêu thích, thông báo chưa đọc
 *   - Đơn hàng gần đây (3 đơn) + địa chỉ mặc định
 * Sửa hồ sơ / đổi mật khẩu / phiên đăng nhập: trang /account/security (PATCH /users/me, POST /users/me/password...).
 */
function ProfileScreen() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const { count: wishlistCount } = useWishlist();
  const [orders, setOrders] = useState({ status: 'loading', items: [], hasMore: false });
  const [address, setAddress] = useState({ status: 'loading', value: null });

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    getMyOrders({ limit: 20 })
      .then((page) => active && setOrders({ status: 'success', items: page.items ?? [], hasMore: page.hasMore }))
      .catch(() => active && setOrders({ status: 'error', items: [], hasMore: false }));
    getAddresses()
      .then((items) => active && setAddress({ status: 'success', value: items[0] ?? null }))
      .catch(() => active && setAddress({ status: 'error', value: null }));
    return () => {
      active = false;
    };
  }, [user]);

  const pendingCount = orders.items.filter((order) =>
    ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'PARTIALLY_SHIPPED', 'SHIPPED'].includes(order.status),
  ).length;

  const stats = [
    { id: 'orders', icon: 'package', value: orders.hasMore ? `${orders.items.length}+` : orders.items.length, to: '/account/orders' },
    { id: 'inProgress', icon: 'truck', value: pendingCount, to: '/account/orders' },
    { id: 'wishlist', icon: 'heart', value: wishlistCount, to: '/account/wishlist' },
    { id: 'unread', icon: 'bell', value: unreadCount, to: '/account/notifications' },
  ];

  return (
    <AccountLayout title={t('account.profile.title')} subtitle={t('account.profile.subtitle')}>
      {user && (
        <>
          <div className="account-card">
            <div className="account-card__head">
              <h2 className="account-card__title">
                <Icon name="user" size={18} />
                {t('account.profile.infoTitle')}
              </h2>
              <Button as={Link} variant="outline" size="sm" to="/account/security">
                <Icon name="edit" size={16} />
                {t('market.security.editButton')}
              </Button>
            </div>
            <dl className="info-list">
              <div className="info-list__row">
                <dt>{t('account.profile.displayName')}</dt>
                <dd>{user.displayName ?? user.name}</dd>
              </div>
              <div className="info-list__row">
                <dt>{t('account.profile.email')}</dt>
                <dd className="profile__email">
                  {user.email}
                  {user.emailVerifiedAt ? (
                    <StatusBadge tone="success">{t('account.profile.verified')}</StatusBadge>
                  ) : (
                    <StatusBadge tone="warning">{t('account.profile.unverified')}</StatusBadge>
                  )}
                </dd>
              </div>
              <div className="info-list__row">
                <dt>{t('account.profile.phone')}</dt>
                <dd>{user.phone ?? t('account.profile.notSet')}</dd>
              </div>
            </dl>
          </div>

          <ul className="profile-stats">
            {stats.map((stat) => (
              <li key={stat.id}>
                <Link to={stat.to} className="profile-stats__item">
                  <span className="profile-stats__icon" aria-hidden="true">
                    <Icon name={stat.icon} size={20} />
                  </span>
                  <span className="profile-stats__value">{orders.status === 'loading' && stat.id !== 'wishlist' && stat.id !== 'unread' ? '–' : stat.value}</span>
                  <span className="profile-stats__label">{t(`account.profile.stats.${stat.id}`)}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="profile-grid">
            <div className="account-card">
              <div className="account-card__head">
                <h2 className="account-card__title">
                  <Icon name="receipt" size={18} />
                  {t('account.profile.recentOrders')}
                </h2>
                <Link to="/account/orders" className="account-link">
                  {t('common.viewAll')} <Icon name="chevronRight" size={14} />
                </Link>
              </div>
              {orders.status === 'loading' && <div className="account-skeleton" />}
              {orders.status === 'error' && <p className="account-muted">{t('account.loadError')}</p>}
              {orders.status === 'success' && orders.items.length === 0 && (
                <p className="account-muted">{t('orders.emptyAll')}</p>
              )}
              {orders.status === 'success' && orders.items.length > 0 && (
                <ul className="mini-orders">
                  {orders.items.slice(0, 3).map((order) => (
                    <li key={order.id}>
                      <Link to={`/account/orders/${order.id}`} className="mini-orders__row">
                        <span>
                          <span className="mini-orders__number">#{order.orderNumber}</span>
                          <span className="account-muted">{formatDateTime(order.placedAt, language)}</span>
                        </span>
                        <span className="mini-orders__right">
                          <StatusBadge tone={statusTone(order.status)}>{t(`orderStatus.${order.status}`)}</StatusBadge>
                          <strong>{formatPrice(order.grandTotalMinor, language)}</strong>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="account-card">
              <div className="account-card__head">
                <h2 className="account-card__title">
                  <Icon name="mapPin" size={18} />
                  {t('account.profile.defaultAddress')}
                </h2>
                <Link to="/account/addresses" className="account-link">
                  {t('account.profile.manage')} <Icon name="chevronRight" size={14} />
                </Link>
              </div>
              {address.status === 'loading' && <div className="account-skeleton" />}
              {address.status === 'error' && <p className="account-muted">{t('account.loadError')}</p>}
              {address.status === 'success' && !address.value && (
                <div>
                  <p className="account-muted">{t('addresses.empty')}</p>
                  <Button as={Link} to="/account/addresses" variant="soft" size="sm" className="profile__add">
                    <Icon name="plus" size={16} />
                    {t('addresses.add')}
                  </Button>
                </div>
              )}
              {address.value && (
                <address className="profile__address">
                  <strong>{address.value.recipientName}</strong>
                  <span>{address.value.recipientPhone}</span>
                  <span className="account-muted">{formatAddressLine(address.value)}</span>
                </address>
              )}
            </div>
          </div>
        </>
      )}
    </AccountLayout>
  );
}

export default ProfileScreen;
