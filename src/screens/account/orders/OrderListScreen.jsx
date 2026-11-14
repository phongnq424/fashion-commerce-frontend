import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../hooks/useLanguage';
import { cancelMyOrder, getMyOrders, ORDERS_PAGE_SIZE } from '../../../services/myOrderService';
import { ORDER_TABS } from '../../../utils/status';
import AccountLayout from '../components/AccountLayout';
import CancelOrderDialog from './components/CancelOrderDialog';
import OrderCard from './components/OrderCard';

/**
 * /account/orders — Đơn hàng của tôi.
 * Tab trạng thái phía trên (Tất cả / Chờ xác nhận / Đang xử lý / Đang giao / Hoàn thành / Đã hủy),
 * bên dưới là danh sách thẻ đơn. Tab nằm trên đường dẫn (?tab=shipping).
 * Mỗi đơn là 1 thẻ (components/OrderCard.jsx): ảnh + tên sản phẩm, trạng thái, thành tiền, nút thao tác.
 * Lọc theo tab ngay trên trình duyệt (GET /orders của backend chưa lọc theo trạng thái).
 * - onNotify(type, message): báo kết quả hủy đơn
 */
function OrderListScreen({ onNotify }) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabId = ORDER_TABS.some((tab) => tab.id === searchParams.get('tab')) ? searchParams.get('tab') : 'all';
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('loading');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cancelling, setCancelling] = useState(null); // đơn đang mở hộp thoại hủy

  const handleCancel = async (reason) => {
    const target = cancelling;
    setCancelling(null);
    try {
      const updated = await cancelMyOrder(target.id, reason);
      // Cập nhật ngay thẻ đơn trong danh sách, không cần tải lại
      setOrders((current) =>
        current.map((order) =>
          order.id === target.id
            ? { ...order, status: updated.status, paymentStatus: updated.payment?.status ?? order.paymentStatus, shops: updated.shops }
            : order,
        ),
      );
      onNotify?.('success', t('orderDetail.cancelled'));
    } catch (error) {
      console.error(error);
      onNotify?.('error', t(error?.code === 'ORDER_NOT_CANCELLABLE' ? 'orderDetail.errors.notCancellable' : 'account.actionError'));
    }
  };

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const page = await getMyOrders({ limit: ORDERS_PAGE_SIZE, offset: 0 });
      setOrders(page.items ?? []);
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

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const page = await getMyOrders({ limit: ORDERS_PAGE_SIZE, offset: orders.length });
      setOrders((current) => [...current, ...(page.items ?? [])]);
      setHasMore(Boolean(page.hasMore));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMore(false);
    }
  };

  const countFor = (tab) => (tab.statuses ? orders.filter((o) => tab.statuses.includes(o.status)).length : orders.length);
  const activeTab = ORDER_TABS.find((tab) => tab.id === tabId);
  const shown = activeTab.statuses ? orders.filter((order) => activeTab.statuses.includes(order.status)) : orders;

  return (
    <AccountLayout title={t('orders.title')} subtitle={t('orders.subtitle')} breadcrumb={[{ label: t('orders.title') }]}>
      <div className="account-tabs" role="tablist" aria-label={t('orders.tabsLabel')}>
        {ORDER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className="account-tabs__tab"
            aria-selected={tab.id === tabId}
            onClick={() => setSearchParams(tab.id === 'all' ? {} : { tab: tab.id }, { replace: true })}
          >
            {t(`orders.tabs.${tab.id}`)}
            {status === 'success' && <span className="account-tabs__count">({countFor(tab)})</span>}
          </button>
        ))}
      </div>

      {status === 'loading' && (
        <>
          <div className="account-skeleton" />
          <div className="account-skeleton" />
          <div className="account-skeleton" />
        </>
      )}

      {status === 'error' && (
        <div className="account-card">
          <EmptyState
            tone="error"
            icon="alert"
            title={t('account.loadError')}
            action={<Button variant="secondary" onClick={load}>{t('common.retry')}</Button>}
          />
        </div>
      )}

      {status === 'success' && shown.length === 0 && (
        <div className="account-card">
          <EmptyState
            icon="package"
            title={tabId === 'all' ? t('orders.emptyAll') : t('orders.emptyTab')}
            text={t('orders.emptyText')}
            action={<Button as={Link} to="/products">{t('orders.shopNow')}</Button>}
          />
        </div>
      )}

      {status === 'success' && shown.length > 0 && (
        <ul className="order-list">
          {shown.map((order) => (
            <li key={order.id}>
              <OrderCard order={order} onCancel={setCancelling} />
            </li>
          ))}
        </ul>
      )}

      {status === 'success' && hasMore && (
        <div className="account-more">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? t('common.loading') : t('common.loadMore')}
          </Button>
        </div>
      )}

      <CancelOrderDialog
        open={cancelling !== null}
        orderNumber={cancelling?.orderNumber}
        onClose={() => setCancelling(null)}
        onConfirm={handleCancel}
      />
    </AccountLayout>
  );
}

export default OrderListScreen;
