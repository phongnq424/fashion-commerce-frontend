import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import StatusBadge from '../../../components/common/StatusBadge';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAdmin } from '../../../hooks/useAdmin';
import { getShopReturns } from '../../../services/admin/returnAdminService';
import { formatPrice } from '../../../utils/format';
import { formatDateTime, statusTone } from '../../../utils/status';
import RequireShop from '../components/RequireShop';
import AdminPage from '../components/AdminPage';

const TABS = ['all', 'REQUESTED', 'APPROVED', 'RETURNING', 'RECEIVED', 'REFUNDED', 'REJECTED', 'CANCELLED'];

function ReturnTable({ shopId }) {
  const { t, language } = useLanguage();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [tab, setTab] = useState('all');

  const load = useCallback(async () => {
    try {
      setItems((await getShopReturns(shopId)).items);
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }, [shopId]);

  useEffect(() => {
    load();
  }, [load]);

  const shown = items.filter((r) => tab === 'all' || r.status === tab);

  return (
    <>
      <div className="account-tabs" role="tablist" aria-label={t('admin.returns.title')}>
        {TABS.map((id) => (
          <button key={id} type="button" role="tab" className="account-tabs__tab" aria-selected={id === tab} onClick={() => setTab(id)}>
            {id === 'all' ? t('orders.tabs.all') : t(`returnStatus.${id}`)}
            {status === 'success' && <span className="account-tabs__count">({id === 'all' ? items.length : items.filter((r) => r.status === id).length})</span>}
          </button>
        ))}
      </div>
      <section className="account-card admin-card">
        {status === 'loading' && <div className="account-skeleton" />}
        {status === 'error' && <EmptyState tone="error" icon="alert" title={t('account.loadError')} action={<Button variant="secondary" onClick={load}>{t('common.retry')}</Button>} />}
        {status === 'success' && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('returns.columns.code')}</th>
                  <th>{t('admin.orders.columns.buyer')}</th>
                  <th>{t('returns.columns.reason')}</th>
                  <th className="num">{t('returns.columns.refund')}</th>
                  <th>{t('returns.columns.status')}</th>
                  <th>{t('returns.columns.createdAt')}</th>
                  <th className="actions">{t('admin.products.columns.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.shopOrderNumber}</strong>
                      <span className="cell-sub">{t('admin.returns.itemCount', { count: item.itemCount })}</span>
                    </td>
                    <td>{item.buyerName ?? '—'}</td>
                    <td>{t(`returns.reasons.${item.reasonCode}`)}</td>
                    <td className="num">{formatPrice(item.requestedRefundMinor, language)}</td>
                    <td>
                      <StatusBadge tone={statusTone(item.status)}>{t(`returnStatus.${item.status}`)}</StatusBadge>
                    </td>
                    <td>{formatDateTime(item.createdAt, language)}</td>
                    <td className="actions">
                      {item.status === 'REQUESTED' ? (
                        <Button as={Link} to={`/admin/returns/${item.id}`} size="sm">
                          {t('admin.returns.review')}
                        </Button>
                      ) : (
                        <Link to={`/admin/returns/${item.id}`} className="text-btn">
                          {t('orders.viewDetail')}
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={7} className="admin-table__empty">
                      {t('admin.returns.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

/**
 * /admin/returns — Yêu cầu trả hàng / hoàn tiền gửi tới shop (GET /shops/{shopId}/returns).
 * Tab trạng thái • bảng: mã đơn shop, người mua, lý do, số tiền hoàn, trạng thái • "Xem xét" cho yêu cầu mới.
 */
function AdminReturnListScreen() {
  const { t } = useLanguage();
  const { shopId } = useAdmin();
  return (
    <AdminPage title={t('admin.returns.title')} subtitle={t('admin.returns.subtitle')}>
      <RequireShop>
        <ReturnTable key={shopId} shopId={shopId} />
      </RequireShop>
    </AdminPage>
  );
}

export default AdminReturnListScreen;
