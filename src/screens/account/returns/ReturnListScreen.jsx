import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import StatusBadge from '../../../components/common/StatusBadge';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../hooks/useLanguage';
import { getMyReturns } from '../../../services/returnService';
import { formatPrice } from '../../../utils/format';
import { formatDateTime, statusTone } from '../../../utils/status';
import AccountLayout from '../components/AccountLayout';

/**
 * /account/returns — Danh sách yêu cầu trả hàng / hoàn tiền (GET /returns).
 * Máy tính: dạng bảng. Mobile: mỗi dòng thành 1 thẻ.
 * Tạo yêu cầu mới từ trang Chi tiết đơn (nút "Yêu cầu trả hàng" của đơn đã hoàn thành).
 */
function ReturnListScreen() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (offset = 0) => {
    if (offset === 0) setStatus('loading');
    try {
      const page = await getMyReturns({ limit: 20, offset });
      setItems((current) => (offset === 0 ? page.items : [...current, ...page.items]));
      setHasMore(Boolean(page.hasMore));
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  return (
    <AccountLayout title={t('returns.title')} subtitle={t('returns.subtitle')} breadcrumb={[{ label: t('returns.title') }]}>
      <p className="return-hint account-card">
        <Icon name="info" size={18} />
        <span>{t('returns.howTo')}</span>
      </p>

      {status === 'loading' && <div className="account-skeleton" />}
      {/* Không có yêu cầu nào (hoặc không đọc được dữ liệu) -> chỉ báo "Không có đơn hàng nào" */}
      {(status === 'error' || (status === 'success' && items.length === 0)) && (
        <div className="account-card">
          <EmptyState
            icon="refresh"
            title={t('returns.emptyTitle')}
            text={t('returns.emptyText')}
            action={<Button as={Link} to="/account/orders?tab=completed" variant="outline">{t('returns.goOrders')}</Button>}
          />
        </div>
      )}

      {status === 'success' && items.length > 0 && (
        <div className="account-card return-table-wrap">
          <table className="return-table">
            <thead>
              <tr>
                <th scope="col">{t('returns.columns.code')}</th>
                <th scope="col">{t('returns.columns.reason')}</th>
                <th scope="col">{t('returns.columns.createdAt')}</th>
                <th scope="col">{t('returns.columns.refund')}</th>
                <th scope="col">{t('returns.columns.status')}</th>
                <th scope="col">
                  <span className="visually-hidden">{t('returns.columns.action')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td data-label={t('returns.columns.code')}>
                    <strong>{item.shopOrderNumber}</strong>
                  </td>
                  <td data-label={t('returns.columns.reason')}>{t(`returns.reasons.${item.reasonCode}`)}</td>
                  <td data-label={t('returns.columns.createdAt')}>{formatDateTime(item.createdAt, language)}</td>
                  <td data-label={t('returns.columns.refund')}>{formatPrice(item.requestedRefundMinor, language)}</td>
                  <td data-label={t('returns.columns.status')}>
                    <StatusBadge tone={statusTone(item.status)}>{t(`returnStatus.${item.status}`)}</StatusBadge>
                  </td>
                  <td className="return-table__action">
                    <Link to={`/account/returns/${item.id}`} className="account-link">
                      {t('orders.viewDetail')} <Icon name="chevronRight" size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {status === 'success' && hasMore && (
        <div className="account-more">
          <Button variant="outline" onClick={() => load(items.length)}>
            {t('common.loadMore')}
          </Button>
        </div>
      )}
    </AccountLayout>
  );
}

export default ReturnListScreen;
