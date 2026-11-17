import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '@shared/components/common/StatusBadge';
import RevenueChart from '@shared/components/dashboard/RevenueChart';
import { buildStats, KpiCard, PeriodFilter, StatusBars, TodoList, usePeriod } from '@shared/components/dashboard/dashboardKit';
import { useLanguage } from '@shared/hooks/useLanguage';
import {
  getAllPages,
  getModerationCases,
  getOnboardingQueue,
  getOrders,
  getPayouts,
  getShopDirectory,
  ORDER_STATUSES,
  SHOP_STATUSES,
} from '../../services/platformService';
import { formatPrice } from '@shared/utils/format';
import { formatDateTime, statusTone } from '@shared/utils/status';
import AdminPage from '../components/AdminPage';
import { ShopCell } from '../components/AdminParts';

// =====================================================================
// /admin — TỔNG QUAN SÀN (theo thiết kế dashboard ban đầu, số liệu của TOÀN SÀN, mọi shop):
//   [Chọn kỳ 7 / 30 / 90 ngày / Tùy chọn]
//   [GMV • Đơn hàng • Giá trị đơn TB • Tỉ lệ hủy — so với kỳ trước]
//   [Biểu đồ GMV (2/3)                 | Việc cần xử lý (1/3)]
//   [Đơn theo trạng thái               | Shop trên sàn]
//   [Đơn hàng mới (2/3)                | Báo cáo vi phạm mới — ghi rõ shop (1/3)]
// Nguồn: GET /admin/orders (gom tối đa 2.000 đơn gần nhất), /admin/shops, /admin/product-moderation/cases,
//        /admin/seller-onboardings/reviews, /admin/finance/payouts. API nào vai trò không có quyền -> ô đó hiện "—".
// =====================================================================

const optional = (promise) => promise.catch(() => null);
const countOf = (page) => (page ? `${page.items.length}${page.hasMore ? '+' : ''}` : null);

function AdminDashboardScreen() {
  const { t, language } = useLanguage();
  const periodState = usePeriod(30);
  const { range } = periodState;
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      optional(getAllPages(getOrders, {}, 20)),
      optional(getShopDirectory({ fresh: true })),
      optional(getModerationCases({ status: 'OPEN', limit: 100 })),
      optional(getOnboardingQueue({ status: 'PENDING_REVIEW', limit: 100 })),
      optional(getPayouts({ status: 'REQUESTED', limit: 100 })),
    ]).then(([orders, shops, cases, onboardings, payouts]) => {
      if (active) setData({ orders, shops, cases, onboardings, payouts });
    });
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(
    () => (data?.orders ? buildStats(data.orders.items, range, { amount: (o) => o.grandTotalMinor, statuses: ORDER_STATUSES }) : null),
    [data, range],
  );

  const page = (children) => (
    <AdminPage title={t('market.admin.dashboard.title')} subtitle={t('admin.platform.subtitle')}>
      {children}
    </AdminPage>
  );
  if (!data) return page(<div className="account-skeleton" />);

  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const num = (value) => value.toLocaleString(locale);
  const shopList = data.shops ? [...data.shops.values()] : [];
  const shopsByStatus = SHOP_STATUSES.map((status) => ({ status, count: shopList.filter((s) => s.status === status).length }));
  const end = range.to + 86400000;
  const newShops = shopList.filter((s) => s.activatedAt && new Date(s.activatedAt).getTime() >= range.from && new Date(s.activatedAt).getTime() < end).length;
  const orders = data.orders?.items ?? [];

  const todos = [
    { id: 'onboardings', icon: 'doc', value: countOf(data.onboardings), to: '/seller-reviews' },
    { id: 'cases', icon: 'flag', value: countOf(data.cases), to: '/product-cases' },
    { id: 'payouts', icon: 'card', value: countOf(data.payouts), to: '/payouts' },
    { id: 'pendingPayment', icon: 'receipt', value: data.orders ? orders.filter((o) => o.status === 'PENDING_PAYMENT').length : null, to: '/orders?status=PENDING_PAYMENT' },
    { id: 'suspendedShops', icon: 'alert', value: data.shops ? shopsByStatus.find((r) => r.status === 'SUSPENDED').count : null, to: '/shops?status=SUSPENDED' },
  ].map((item) => ({ ...item, label: t(`market.admin.dashboard.stats.${item.id}`) }));

  const recent = orders.slice(0, 6);
  const openCases = (data.cases?.items ?? []).slice(0, 5);
  const compareLabel = stats ? t('admin.dashboard.vsPrevious', { days: stats.days }) : '';

  return page(
    <div className="dashboard">
      {stats ? (
        <>
          <PeriodFilter state={periodState} days={stats.days} />
          <div className="kpi-grid">
            <KpiCard icon="receipt" label={t('admin.platform.gmv')} hint={t('admin.platform.gmvHint')} value={formatPrice(stats.current.revenue, language)} change={stats.change('revenue')} compareLabel={compareLabel} />
            <KpiCard icon="bag" label={t('admin.dashboard.kpi.orders')} value={num(stats.current.orders)} change={stats.change('orders')} compareLabel={compareLabel} />
            <KpiCard icon="tag" label={t('admin.dashboard.kpi.average')} value={formatPrice(stats.current.average, language)} change={stats.change('average')} compareLabel={compareLabel} />
            <KpiCard icon="close" label={t('admin.dashboard.kpi.cancelRate')} value={`${(stats.current.cancelRate * 100).toFixed(1)}%`} change={stats.change('cancelRate')} inverse compareLabel={compareLabel} />
          </div>
        </>
      ) : (
        <p className="account-muted">{t('admin.platform.noOrderAccess')}</p>
      )}

      <div className={`dashboard__row ${stats ? 'dashboard__row--chart' : ''}`}>
        {stats && (
          <section className="account-card dashboard-card">
            <div className="dashboard-card__head">
              <div>
                <h2 className="account-card__title">{t('admin.platform.gmvTitle')}</h2>
                <p className="cell-sub">
                  {t(`admin.dashboard.by.${stats.unit}`)}
                  {data.orders.truncated && <> · {t('admin.platform.truncated', { count: num(orders.length) })}</>}
                </p>
              </div>
              <p className="dashboard-card__total">{formatPrice(stats.current.revenue, language)}</p>
            </div>
            <RevenueChart buckets={stats.buckets} unit={stats.unit} />
          </section>
        )}
        <section className="account-card dashboard-card">
          <h2 className="account-card__title">{t('admin.platform.todo')}</h2>
          <TodoList items={todos} LinkComponent={Link} />
        </section>
      </div>

      <div className="dashboard__row">
        {stats && (
          <section className="account-card dashboard-card">
            <div className="dashboard-card__head">
              <h2 className="account-card__title">{t('admin.dashboard.statusTitle')}</h2>
              <span className="cell-sub">{t('admin.dashboard.totalOrders', { count: stats.totalOrders })}</span>
            </div>
            <StatusBars rows={stats.byStatus} labelOf={(status) => t(`orderStatus.${status}`, { defaultValue: status })} />
          </section>
        )}
        {data.shops && (
          <section className="account-card dashboard-card">
            <div className="dashboard-card__head">
              <div>
                <h2 className="account-card__title">{t('admin.platform.shopsTitle')}</h2>
                <p className="cell-sub">{t('admin.platform.shopsTotal', { count: num(shopList.length), fresh: num(newShops) })}</p>
              </div>
              <Link to="/shops" className="account-link">
                {t('admin.dashboard.viewAll')}
              </Link>
            </div>
            <StatusBars rows={shopsByStatus} labelOf={(status) => t(`seller.shopStatus.${status}`, { defaultValue: status })} />
          </section>
        )}
      </div>

      <div className={`dashboard__row ${data.cases ? 'dashboard__row--wide' : ''}`}>
        {data.orders && (
          <section className="account-card admin-card">
            <div className="admin-toolbar">
              <h2 className="account-card__title">{t('admin.dashboard.recentOrders')}</h2>
              <Link to="/orders" className="account-link seller-toolbar__end">
                {t('admin.dashboard.viewAll')}
              </Link>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('seller.orders.columns.code')}</th>
                    <th>{t('market.admin.orders.buyer')}</th>
                    <th className="num">{t('seller.orders.columns.total')}</th>
                    <th>{t('seller.orders.columns.status')}</th>
                    <th>{t('seller.orders.columns.placedAt')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link to={`/orders/${o.id}`} className="account-link">
                          {o.orderNumber}
                        </Link>
                        <span className="cell-sub">{t('market.admin.orders.shopCount', { shops: o.shopCount, items: o.itemCount })}</span>
                      </td>
                      <td>{o.buyerEmail}</td>
                      <td className="num">{formatPrice(o.grandTotalMinor, language)}</td>
                      <td>
                        <StatusBadge tone={statusTone(o.status)}>{t(`orderStatus.${o.status}`, { defaultValue: o.status })}</StatusBadge>
                      </td>
                      <td>{formatDateTime(o.placedAt, language)}</td>
                    </tr>
                  ))}
                  {recent.length === 0 && (
                    <tr>
                      <td colSpan={5} className="admin-table__empty">
                        {t('market.admin.empty')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {data.cases && (
          <section className="account-card dashboard-card">
            <div className="dashboard-card__head">
              <h2 className="account-card__title">{t('admin.platform.casesTitle')}</h2>
              <Link to="/product-cases" className="account-link">
                {t('admin.dashboard.viewAll')}
              </Link>
            </div>
            {openCases.length === 0 ? (
              <p className="account-muted">{t('admin.platform.noCases')}</p>
            ) : (
              <ul className="admin-case-list">
                {openCases.map((c) => (
                  <li key={c.id} className="admin-case-list__item">
                    <span className="admin-case-list__name">{c.productName}</span>
                    <span className="admin-case-list__meta">
                      <ShopCell shopId={c.shopId} shops={data.shops ?? new Map()} compact />
                      <span className="cell-sub">{t(`market.reportReasons.${c.reasonCode}`, { defaultValue: c.reasonCode })}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>,
  );
}

export default AdminDashboardScreen;
