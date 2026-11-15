import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import StatusBadge from '../../../components/common/StatusBadge';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAdmin } from '../../../hooks/useAdmin';
import { confirmShopOrder, getShopOrders, SHOP_ORDER_STATUSES } from '../../../services/admin/orderAdminService';
import { formatPrice } from '../../../utils/format';
import { formatDateTime, formatOptions, statusTone } from '../../../utils/status';
import RequireShop from '../components/RequireShop';
import AdminPage from '../components/AdminPage';
import Pagination, { pageItems } from '../components/Pagination';

// Tab: Tất cả + từng trạng thái đơn shop
const TABS = ['all', ...SHOP_ORDER_STATUSES];

// Nút việc tiếp theo của mỗi đơn (giống các sàn: Xác nhận / Chuẩn bị hàng / Giao hàng / Cập nhật vận đơn)
const NEXT_ACTION = {
  PENDING_CONFIRMATION: 'confirm',
  PROCESSING: 'pack',
  READY_TO_SHIP: 'dispatch',
  SHIPPED: 'track',
};

function OrderTable({ shopId, onNotify }) {
  const { t, language } = useLanguage();
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get('status')) ? params.get('status') : 'all';
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('loading');
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setOrders((await getShopOrders(shopId)).items);
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }, [shopId]);

  useEffect(() => {
    setStatus('loading');
    load();
  }, [load]);

  // Đổi bộ lọc -> quay về trang 1
  useEffect(() => setPage(1), [tab, query]);

  const q = query.trim().toLowerCase();
  const shown = orders.filter(
    (o) =>
      (tab === 'all' || o.status === tab) &&
      (!q || o.shopOrderNumber.toLowerCase().includes(q) || o.orderNumber.toLowerCase().includes(q) || o.recipientName.toLowerCase().includes(q)),
  );

  const quickConfirm = async (order) => {
    setBusyId(order.id);
    try {
      await confirmShopOrder(shopId, order.id);
      onNotify?.('success', t('admin.orders.confirmed', { code: order.shopOrderNumber }));
      await load();
    } catch (error) {
      console.error(error);
      onNotify?.('error', t('account.actionError'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="account-tabs" role="tablist" aria-label={t('admin.orders.tabsLabel')}>
        {TABS.map((id) => (
          <button key={id} type="button" role="tab" className="account-tabs__tab" aria-selected={id === tab} onClick={() => setParams(id === 'all' ? {} : { status: id }, { replace: true })}>
            {id === 'all' ? t('orders.tabs.all') : t(`shopOrderStatus.${id}`)}
            {status === 'success' && <span className="account-tabs__count">({id === 'all' ? orders.length : orders.filter((o) => o.status === id).length})</span>}
          </button>
        ))}
      </div>

      <section className="account-card admin-card">
        <div className="admin-toolbar">
          <label className="admin-search">
            <Icon name="search" size={18} />
            <input type="search" value={query} placeholder={t('admin.orders.search')} aria-label={t('admin.orders.search')} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <span className="admin-toolbar__count">{t('admin.orders.count', { count: shown.length })}</span>
        </div>
        {status === 'loading' && <div className="account-skeleton" />}
        {status === 'error' && <EmptyState tone="error" icon="alert" title={t('account.loadError')} action={<Button variant="secondary" onClick={load}>{t('common.retry')}</Button>} />}
        {status === 'success' && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.products.columns.product')}</th>
                  <th>{t('admin.orders.columns.code')}</th>
                  <th>{t('admin.orders.columns.buyer')}</th>
                  <th className="num">{t('admin.orders.columns.total')}</th>
                  <th>{t('admin.orders.columns.status')}</th>
                  <th>{t('admin.orders.columns.shipping')}</th>
                  <th className="actions">{t('admin.products.columns.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems(shown, page).map((order) => {
                  const first = order.items[0];
                  const action = NEXT_ACTION[order.status];
                  return (
                    <tr key={order.id}>
                      <td>
                        <div className="cell-product">
                          <span className="cell-product__img">{first?.imageUrl ? <img src={first.imageUrl} alt="" loading="lazy" /> : <Icon name="image" />}</span>
                          <span>
                            <Link to={`/admin/orders/${order.id}`} className="cell-product__name">
                              {first?.productName}
                            </Link>
                            <span className="cell-sub">
                              {formatOptions(first?.options)} · x{first?.quantity}
                              {order.items.length > 1 && ` · ${t('admin.orders.moreItems', { count: order.items.length - 1 })}`}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <Link to={`/admin/orders/${order.id}`} className="account-link">
                          {order.shopOrderNumber}
                        </Link>
                        <span className="cell-sub">{formatDateTime(order.placedAt, language)}</span>
                      </td>
                      <td>{order.recipientName}</td>
                      <td className="num">
                        <strong>{formatPrice(order.totalMinor, language)}</strong>
                        <span className="cell-sub">{t(`paymentMethod.${order.paymentMethod}`)}</span>
                      </td>
                      <td>
                        <StatusBadge tone={statusTone(order.status)}>{t(`shopOrderStatus.${order.status}`)}</StatusBadge>
                      </td>
                      <td>
                        {order.shipment ? (
                          <>
                            {order.shipment.carrierCode}
                            <span className="cell-sub">{t(`admin.shipmentStatus.${order.shipment.status}`)}</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="actions">
                        {action === 'confirm' ? (
                          <Button size="sm" disabled={busyId === order.id} onClick={() => quickConfirm(order)}>
                            {t('admin.orders.actions.confirm')}
                          </Button>
                        ) : action ? (
                          <Button as={Link} to={`/admin/orders/${order.id}`} size="sm" variant="outline">
                            {t(`admin.orders.actions.${action}`)}
                          </Button>
                        ) : (
                          <Link to={`/admin/orders/${order.id}`} className="text-btn">
                            {t('orders.viewDetail')}
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={7} className="admin-table__empty">
                      {t('admin.orders.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {status === 'success' && <Pagination total={shown.length} page={page} onChange={setPage} />}
      </section>
    </>
  );
}

/**
 * /admin/orders — Đơn hàng của shop (GET /shops/{shopId}/orders?status=).
 * Tab theo trạng thái (Chờ xác nhận / Đang chuẩn bị / Chờ lấy hàng / Đang giao / Hoàn thành / Đã hủy / Đã trả hàng),
 * tìm theo mã đơn hoặc người nhận, nút việc tiếp theo ngay trên từng dòng.
 */
function AdminOrderListScreen({ onNotify }) {
  const { t } = useLanguage();
  const { shopId } = useAdmin();
  return (
    <AdminPage title={t('admin.orders.title')} subtitle={t('admin.orders.subtitle')}>
      <RequireShop>
        <OrderTable key={shopId} shopId={shopId} onNotify={onNotify} />
      </RequireShop>
    </AdminPage>
  );
}

export default AdminOrderListScreen;
