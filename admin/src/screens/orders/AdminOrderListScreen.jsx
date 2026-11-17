import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '@shared/components/common/Icon';
import StatusBadge from '@shared/components/common/StatusBadge';
import { useLanguage } from '@shared/hooks/useLanguage';
import { getOrder, getOrders, ORDER_STATUSES } from '../../services/platformService';
import { formatPrice } from '@shared/utils/format';
import { formatDateTime, statusTone } from '@shared/utils/status';
import AdminPage from '../components/AdminPage';
import { ListState, Pager, ShopCell, StatusTabs, useShopDirectory } from '../components/AdminParts';
import { useAdminList } from '../components/useAdminList';

// Đơn con theo shop của từng đơn: orderId -> [{ shopId, shopOrderNumber, status }] (lưu tạm trong phiên)
const subOrderCache = new Map();

/**
 * /admin/orders — Tra cứu đơn của mọi người mua (hỗ trợ khách hàng, chỉ xem).
 * Sàn nhiều shop: 1 đơn của khách có thể gồm hàng của nhiều shop, mỗi shop là 1 đơn con (mã riêng, trạng thái riêng,
 * shop tự xử lý). Danh sách BE (OrderSummary) chỉ có shopCount nên FE đọc chi tiết các đơn đang hiện trên trang
 * (GET /admin/orders/{id}) để ghi rõ đơn con của shop nào.
 */
function AdminOrderListScreen() {
  const { t, language } = useLanguage();
  const [params, setParams] = useSearchParams();
  const status = ORDER_STATUSES.includes(params.get('status')) ? params.get('status') : '';
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const list = useAdminList(getOrders, { status, query });
  const shops = useShopDirectory();
  const [subOrders, setSubOrders] = useState(() => new Map(subOrderCache));

  useEffect(() => {
    let active = true;
    const missing = list.items.filter((o) => !subOrderCache.has(o.id));
    if (!missing.length) return undefined;
    Promise.all(
      missing.map((o) =>
        getOrder(o.id)
          .then((detail) => subOrderCache.set(o.id, detail.order.shops.map((so) => ({ shopId: so.shopId, shopOrderNumber: so.shopOrderNumber, status: so.status }))))
          .catch(() => subOrderCache.set(o.id, null)),
      ),
    ).then(() => active && setSubOrders(new Map(subOrderCache)));
    return () => {
      active = false;
    };
  }, [list.items]);

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
                  <th>{t('admin.platform.shopRef.shopOrders')}</th>
                  <th className="num">{t('seller.orders.columns.total')}</th>
                  <th>{t('seller.orders.columns.status')}</th>
                  <th>{t('market.admin.orders.payment')}</th>
                  <th>{t('seller.orders.columns.placedAt')}</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((o) => (
                  <tr key={o.id}>
                    <td><Link to={`/orders/${o.id}`} className="account-link">{o.orderNumber}</Link><span className="cell-sub">{t('market.admin.orders.shopCount', { shops: o.shopCount, items: o.itemCount })}</span></td>
                    <td>{o.buyerEmail}</td>
                    <td>
                      {subOrders.get(o.id) ? (
                        <ul className="admin-suborders">
                          {subOrders.get(o.id).map((so) => (
                            <li key={so.shopOrderNumber}>
                              <ShopCell shopId={so.shopId} shops={shops} compact />
                              <StatusBadge tone={statusTone(so.status)}>{t(`shopOrderStatus.${so.status}`, { defaultValue: so.status })}</StatusBadge>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="cell-sub">{subOrders.has(o.id) ? '—' : '…'}</span>
                      )}
                    </td>
                    <td className="num">{formatPrice(o.grandTotalMinor, language)}</td>
                    <td><StatusBadge tone={statusTone(o.status)}>{t(`orderStatus.${o.status}`, { defaultValue: o.status })}</StatusBadge></td>
                    <td>{t(`market.paymentMethods.${o.paymentMethod}`, { defaultValue: o.paymentMethod })}<span className="cell-sub">{o.paymentStatus}</span></td>
                    <td>{formatDateTime(o.placedAt, language)}</td>
                  </tr>
                ))}
                {list.items.length === 0 && <tr><td colSpan={7} className="admin-table__empty">{t('market.admin.empty')}</td></tr>}
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
