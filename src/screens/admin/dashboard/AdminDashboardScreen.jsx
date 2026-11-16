import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';
import { getModerationCases, getOnboardingQueue, getOrders, getPayouts, getReviews, getShops } from '../../../services/admin/platformService';
import AdminPage from '../components/AdminPage';

// Đếm nhanh 1 hàng đợi (tối đa 100, Backend không trả tổng số). Không có quyền -> null.
const count = (promise) =>
  promise.then((page) => `${page.items.length}${page.hasMore ? '+' : ''}`).catch(() => null);

/** /admin — Tổng quan việc cần xử lý của sàn. */
function AdminDashboardScreen() {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      count(getOnboardingQueue({ status: 'PENDING_REVIEW', limit: 100 })),
      count(getModerationCases({ status: 'OPEN', limit: 100 })),
      count(getPayouts({ status: 'REQUESTED', limit: 100 })),
      count(getShops({ status: 'ACTIVE', limit: 100 })),
      count(getShops({ status: 'SUSPENDED', limit: 100 })),
      count(getOrders({ status: 'PENDING_PAYMENT', limit: 100 })),
      count(getReviews({ status: 'HIDDEN', limit: 100 })),
    ]).then(([onboardings, cases, payouts, activeShops, suspendedShops, pendingPayment, hiddenReviews]) => {
      if (!active) return;
      setStats([
        { id: 'onboardings', value: onboardings, to: '/admin/seller-reviews', icon: 'doc' },
        { id: 'cases', value: cases, to: '/admin/product-cases', icon: 'flag' },
        { id: 'payouts', value: payouts, to: '/admin/payouts', icon: 'card' },
        { id: 'activeShops', value: activeShops, to: '/admin/shops', icon: 'store' },
        { id: 'suspendedShops', value: suspendedShops, to: '/admin/shops?status=SUSPENDED', icon: 'alert' },
        { id: 'pendingPayment', value: pendingPayment, to: '/admin/orders?status=PENDING_PAYMENT', icon: 'receipt' },
        { id: 'hiddenReviews', value: hiddenReviews, to: '/admin/reviews', icon: 'star' },
      ]);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <AdminPage title={t('market.admin.dashboard.title')} subtitle={t('market.admin.dashboard.subtitle')}>
      <section className="account-card">
        {!stats ? (
          <div className="account-skeleton" />
        ) : (
          <ul className="admin-stats">
            {stats.map((item) => (
              <li key={item.id}>
                <Link to={item.to} className="admin-stat">
                  <span className="admin-stat__value">{item.value ?? '—'}</span>
                  <span className="admin-stat__label">
                    <Icon name={item.icon} size={14} /> {t(`market.admin.dashboard.stats.${item.id}`)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="account-muted">{t('market.admin.dashboard.note')}</p>
      </section>
    </AdminPage>
  );
}

export default AdminDashboardScreen;
