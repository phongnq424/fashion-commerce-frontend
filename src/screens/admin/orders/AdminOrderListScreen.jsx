import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../../../components/common/Icon';
import StatusBadge from '../../../components/common/StatusBadge';
import { useLanguage } from '../../../hooks/useLanguage';
import { getOrders, ORDER_STATUSES } from '../../../services/admin/platformService';
import { formatPrice } from '../../../utils/format';
import { formatDateTime, statusTone } from '../../../utils/status';
import AdminPage from '../components/AdminPage';
import { ListState, Pager, StatusTabs } from '../components/AdminParts';
import { useAdminList } from '../components/useAdminList';

/** /admin/orders — Tra cứu đơn của mọi người mua (hỗ trợ khách hàng, chỉ xem). */
function AdminOrderListScreen() {
  const { t, language } = useLanguage();
  const [params, setParams] = useSearchParams();
  const status = ORDER_STATUSES.includes(params.get('status')) ? params.get('status') : '';
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const list = useAdminList(getOrders, { status, query });

  return (
    <AdminPage title={t('market.admin.orders.title')} subtitle={t('market.admin.orders.subtitle')}>
      <StatusTabs value={status} options={ORDER_STATUSES} onChange={(v) => setParams(v ? { status: v } : {}, { replace: true })} labelPrefix="orderStatus" allLabel={t('orders.tabs.all')} />
      <section className="account-card admin-card">
        <form className="admin-toolbar" onSubmit={(e) => { e.preventDefault(); setQuery(input.trim()); }}>
          <label className="admin-search">
            <Icon name="search" size={18} />
            <input type="search" value={input} placeholder={t('market.admin.orders.search')} aria-label={t('market.admin.orders.search')} onChange={(e) => setInput(e.target.value)} />
          </label>
        </form>
        <ListState status={list.status} onRetry={list.reload} />
        {list.status === 'success' && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('seller.orders.columns.code')}</th>
                  <th>{t('market.admin.orders.buyer')}</th>
                  <th className="num">{t('seller.orders.columns.total')}</th>
                  <th>{t('seller.orders.columns.status')}</th>
                  <th>{t('market.admin.orders.payment')}</th>
                  <th>{t('seller.orders.columns.placedAt')}</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((o) => (
                  <tr key={o.id}>
                    <td><Link to={`/admin/orders/${o.id}`} className="account-link">{o.orderNumber}</Link><span className="cell-sub">{t('market.admin.orders.shopCount', { shops: o.shopCount, items: o.itemCount })}</span></td>
                    <td>{o.buyerEmail}</td>
                    <td className="num">{formatPrice(o.grandTotalMinor, language)}</td>
                    <td><StatusBadge tone={statusTone(o.status)}>{t(`orderStatus.${o.status}`, { defaultValue: o.status })}</StatusBadge></td>
                    <td>{t(`market.paymentMethods.${o.paymentMethod}`, { defaultValue: o.paymentMethod })}<span className="cell-sub">{o.paymentStatus}</span></td>
                    <td>{formatDateTime(o.placedAt, language)}</td>
                  </tr>
                ))}
                {list.items.length === 0 && <tr><td colSpan={6} className="admin-table__empty">{t('market.admin.empty')}</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={list.page} hasMore={list.hasMore} onChange={list.setPage} />
      </section>
    </AdminPage>
  );
}

export default AdminOrderListScreen;
