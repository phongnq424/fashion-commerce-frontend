import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../../components/common/Button';
import Dialog from '../../../components/common/Dialog';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import StatusBadge from '../../../components/common/StatusBadge';
import Textarea from '../../../components/common/Textarea';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAdmin } from '../../../hooks/useAdmin';
import { formatAddressLine } from '../../../services/addressService';
import {
  CANCELLABLE,
  cancelShopOrder,
  confirmShopOrder,
  dispatchShopOrder,
  getShopOrder,
  markReadyToShip,
  SHIPMENT_TRANSITIONS,
  updateShipmentStatus,
} from '../../../services/admin/orderAdminService';
import { getShopShippingProviders } from '../../../services/admin/shopService';
import { formatPrice } from '../../../utils/format';
import { formatDateTime, formatOptions, statusTone } from '../../../utils/status';
import RequireShop from '../components/RequireShop';
import AdminPage from '../components/AdminPage';

const STEPS = ['PENDING_CONFIRMATION', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED'];

const ERROR_KEYS = {
  SHOP_ORDER_NOT_CONFIRMABLE: 'admin.orders.errors.notConfirmable',
  SHOP_ORDER_NOT_CANCELLABLE: 'admin.orders.errors.notCancellable',
  SHOP_ORDER_NOT_DISPATCHABLE: 'admin.orders.errors.notDispatchable',
  SHIPMENT_TRANSITION_INVALID: 'admin.orders.errors.transition',
  SHIPPING_PROVIDER_NOT_CONFIGURED: 'admin.orders.errors.provider',
  SHIPMENT_ESTIMATE_INVALID: 'admin.orders.errors.estimate',
};

// Ngày mai (yyyy-mm-dd) — mặc định cho "Dự kiến giao"
const plusDays = (days) => {
  const date = new Date(Date.now() + days * 86400000);
  return date.toISOString().slice(0, 10);
};

// Khối VIỆC CẦN LÀM theo trạng thái đơn (đặt trên cùng để người bán thấy ngay)
function ActionPanel({ order, providers, busy, onRun, onCancel }) {
  const { t } = useLanguage();
  const [note, setNote] = useState('');
  const [dispatch, setDispatch] = useState({ carrierCode: '', trackingNumber: '', eta: plusDays(3) });
  const nextStatuses = SHIPMENT_TRANSITIONS[order.shipment?.status] ?? [];
  const [shipment, setShipment] = useState({ status: nextStatuses[0] ?? '', location: '', description: '' });

  useEffect(() => {
    setDispatch((d) => ({ ...d, carrierCode: d.carrierCode || providers[0]?.code || '' }));
  }, [providers]);

  useEffect(() => {
    setShipment((s) => ({ ...s, status: (SHIPMENT_TRANSITIONS[order.shipment?.status] ?? [])[0] ?? '' }));
  }, [order.shipment?.status]);

  const canCancel = CANCELLABLE.includes(order.status);
  const cancelBtn = canCancel && (
    <Button variant="outline" className="btn--danger-outline" disabled={busy} onClick={onCancel}>
      {t('admin.orders.actions.cancel')}
    </Button>
  );

  if (order.status === 'PENDING_CONFIRMATION') {
    return (
      <section className="account-card action-panel">
        <h2 className="account-card__title">
          <Icon name="clock" size={18} />
          {t('admin.orders.panel.confirmTitle')}
        </h2>
        <p className="account-muted">{t('admin.orders.panel.confirmText')}</p>
        <Textarea label={t('admin.orders.panel.sellerNote')} value={note} maxLength={500} rows={2} onChange={(e) => setNote(e.target.value)} />
        <div className="admin-form__actions">
          {cancelBtn}
          <Button disabled={busy} onClick={() => onRun((shopId) => confirmShopOrder(shopId, order.id, note), 'admin.orders.toast.confirmed')}>
            {t('admin.orders.actions.confirm')}
          </Button>
        </div>
      </section>
    );
  }

  if (order.status === 'PROCESSING') {
    return (
      <section className="account-card action-panel">
        <h2 className="account-card__title">
          <Icon name="package" size={18} />
          {t('admin.orders.panel.packTitle')}
        </h2>
        <p className="account-muted">{t('admin.orders.panel.packText')}</p>
        <div className="admin-form__actions">
          {cancelBtn}
          <Button disabled={busy} onClick={() => onRun((shopId) => markReadyToShip(shopId, order.id), 'admin.orders.toast.packed')}>
            {t('admin.orders.actions.pack')}
          </Button>
        </div>
      </section>
    );
  }

  if (order.status === 'READY_TO_SHIP') {
    return (
      <section className="account-card action-panel">
        <h2 className="account-card__title">
          <Icon name="truck" size={18} />
          {t('admin.orders.panel.dispatchTitle')}
        </h2>
        <p className="account-muted">{t('admin.orders.panel.dispatchText')}</p>
        {providers.length === 0 ? (
          <p className="admin-note admin-note--warning">
            <Icon name="alert" size={18} />
            <span>{t('admin.orders.errors.provider')}</span>
          </p>
        ) : (
          <div className="admin-form__row admin-form__row--3">
            <Select label={t('admin.orders.panel.carrier')} options={providers.map((p) => ({ id: p.code, name: p.name }))} value={dispatch.carrierCode} onChange={(value) => setDispatch({ ...dispatch, carrierCode: value })} />
            <Input label={t('returns.trackingNumber')} value={dispatch.trackingNumber} maxLength={120} onChange={(e) => setDispatch({ ...dispatch, trackingNumber: e.target.value })} />
            <Input label={t('admin.orders.panel.eta')} type="date" min={plusDays(1)} value={dispatch.eta} onChange={(e) => setDispatch({ ...dispatch, eta: e.target.value })} />
          </div>
        )}
        <div className="admin-form__actions">
          {cancelBtn}
          <Button
            disabled={busy || providers.length === 0 || !dispatch.carrierCode}
            onClick={() =>
              onRun(
                (shopId) =>
                  dispatchShopOrder(shopId, order.id, {
                    carrierCode: dispatch.carrierCode,
                    trackingNumber: dispatch.trackingNumber,
                    estimatedDeliveryAt: dispatch.eta ? new Date(`${dispatch.eta}T17:00:00`).toISOString() : null,
                  }),
                'admin.orders.toast.dispatched',
              )
            }
          >
            {t('admin.orders.actions.dispatch')}
          </Button>
        </div>
      </section>
    );
  }

  if (order.status === 'SHIPPED' && nextStatuses.length > 0) {
    return (
      <section className="account-card action-panel">
        <h2 className="account-card__title">
          <Icon name="truck" size={18} />
          {t('admin.orders.panel.trackTitle')}
        </h2>
        <p className="account-muted">{t('admin.orders.panel.trackText')}</p>
        <div className="admin-form__row admin-form__row--3">
          <Select label={t('admin.orders.panel.newStatus')} options={nextStatuses.map((s) => ({ id: s, name: t(`admin.shipmentStatus.${s}`) }))} value={shipment.status} onChange={(value) => setShipment({ ...shipment, status: value })} />
          <Input label={t('admin.orders.panel.location')} value={shipment.location} onChange={(e) => setShipment({ ...shipment, location: e.target.value })} />
          <Input label={t('admin.orders.panel.description')} value={shipment.description} onChange={(e) => setShipment({ ...shipment, description: e.target.value })} />
        </div>
        {shipment.status === 'DELIVERED' && <p className="cell-sub">{t('admin.orders.panel.deliveredHint')}</p>}
        <div className="admin-form__actions">
          <Button disabled={busy || !shipment.status} onClick={() => onRun((shopId) => updateShipmentStatus(shopId, order.id, shipment), 'admin.orders.toast.tracked')}>
            {t('admin.orders.actions.updateShipment')}
          </Button>
        </div>
      </section>
    );
  }

  return null;
}

function OrderDetail({ shopId, shopOrderId, onNotify }) {
  const { t, language } = useLanguage();
  const [order, setOrder] = useState(null);
  const [providers, setProviders] = useState([]);
  const [status, setStatus] = useState('loading');
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    try {
      const [data, list] = await Promise.all([getShopOrder(shopId, shopOrderId), getShopShippingProviders(shopId)]);
      setOrder(data);
      setProviders(list);
      setStatus('success');
    } catch (error) {
      setStatus(error?.status === 404 ? 'notFound' : 'error');
    }
  }, [shopId, shopOrderId]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action, successKey) => {
    setBusy(true);
    try {
      setOrder(await action(shopId));
      onNotify?.('success', t(successKey));
      return true;
    } catch (error) {
      console.error(error);
      onNotify?.('error', t(ERROR_KEYS[error?.code] ?? 'account.actionError'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (status === 'loading') return <div className="account-skeleton" />;
  if (status !== 'success') {
    return (
      <div className="account-card">
        <EmptyState tone={status === 'error' ? 'error' : 'default'} icon="receipt" title={status === 'error' ? t('account.loadError') : t('admin.orders.notFound')} action={<Button as={Link} to="/admin/orders" variant="outline">{t('admin.orders.backToList')}</Button>} />
      </div>
    );
  }

  const step = STEPS.indexOf(order.status);
  const closed = ['CANCELLED', 'RETURNED'].includes(order.status);
  const shipment = order.shipment;

  return (
    <AdminPage
      title={t('admin.orders.detailTitle', { code: order.shopOrderNumber })}
      subtitle={t('admin.orders.detailSubtitle', { order: order.orderNumber, date: formatDateTime(order.placedAt, language) })}
      badge={<StatusBadge tone={statusTone(order.status)}>{t(`shopOrderStatus.${order.status}`)}</StatusBadge>}
      back={{ to: '/admin/orders', label: t('admin.nav.orders') }}
    >
      <div className="account-card">
        {closed ? (
          <p className="order-cancelled" role="status">
            <Icon name="info" size={18} />
            {order.status === 'CANCELLED'
              ? t('admin.orders.cancelledAt', { date: formatDateTime(order.cancelledAt, language), reason: order.cancelReason ?? '—' })
              : t('admin.orders.returnedNote')}
          </p>
        ) : (
          <ol className="order-steps order-steps--5">
            {STEPS.map((id, index) => (
              <li key={id} className={`order-steps__step ${index <= step ? 'order-steps__step--done' : ''} ${index === step ? 'order-steps__step--current' : ''}`}>
                <span className="order-steps__dot" aria-hidden="true">
                  {index < step || (index === step && id === 'COMPLETED') ? <Icon name="check" size={16} /> : index + 1}
                </span>
                <span className="order-steps__label">{t(`shopOrderStatus.${id}`)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <ActionPanel order={order} providers={providers} busy={busy} onRun={run} onCancel={() => setCancelOpen(true)} />

      <div className="admin-detail">
        <div className="admin-detail__main">
          <section className="account-card shop-order">
            <header className="shop-order__head">
              <p className="shop-order__title">
                <Icon name="package" size={18} />
                {t('admin.orders.itemsTitle', { count: order.items.reduce((s, i) => s + i.quantity, 0) })}
              </p>
            </header>
            <ul className="order-items">
              {order.items.map((item) => (
                <li key={item.id} className="order-item">
                  <span className="item-thumb" aria-hidden="true">
                    {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <Icon name="hanger" size={26} />}
                  </span>
                  <div className="order-item__info">
                    <p className="order-item__name">{item.productName}</p>
                    <p className="account-muted">
                      {formatOptions(item.options)} · SKU <code className="sku">{item.sellerSku}</code>
                    </p>
                    <p className="account-muted">
                      {formatPrice(item.unitPriceMinor, language)} × {item.quantity}
                    </p>
                  </div>
                  <div className="order-item__price">
                    <strong>{formatPrice(item.lineTotalMinor, language)}</strong>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="shop-order__foot">
              <dl className="order-sum admin-order-sum">
                <div>
                  <dt>{t('orderDetail.subtotal')}</dt>
                  <dd>{formatPrice(order.itemsSubtotalMinor, language)}</dd>
                </div>
                <div>
                  <dt>{t('orderDetail.shipping')}</dt>
                  <dd>{formatPrice(order.shippingFeeMinor, language)}</dd>
                </div>
                {order.discountTotalMinor > 0 && (
                  <div>
                    <dt>{t('orderDetail.discount')}</dt>
                    <dd>−{formatPrice(order.discountTotalMinor, language)}</dd>
                  </div>
                )}
                <div className="order-sum__total">
                  <dt>{t('orders.total')}</dt>
                  <dd>{formatPrice(order.totalMinor, language)}</dd>
                </div>
              </dl>
            </footer>
          </section>

          {shipment && (
            <section className="account-card">
              <h2 className="account-card__title admin-section-title">
                <Icon name="truck" size={18} />
                {t('admin.orders.shipmentTitle')}
              </h2>
              <dl className="info-list">
                <div className="info-list__row">
                  <dt>{t('admin.orders.panel.carrier')}</dt>
                  <dd>{shipment.carrierCode}</dd>
                </div>
                <div className="info-list__row">
                  <dt>{t('returns.trackingNumber')}</dt>
                  <dd>{shipment.trackingNumber ?? '—'}</dd>
                </div>
                <div className="info-list__row">
                  <dt>{t('admin.orders.shipmentStatusLabel')}</dt>
                  <dd>
                    <StatusBadge tone={statusTone(shipment.status)}>{t(`admin.shipmentStatus.${shipment.status}`)}</StatusBadge>
                  </dd>
                </div>
                {shipment.estimatedDeliveryAt && (
                  <div className="info-list__row">
                    <dt>{t('delivery.label')}</dt>
                    <dd>{formatDateTime(shipment.estimatedDeliveryAt, language)}</dd>
                  </div>
                )}
              </dl>
              <ol className="timeline admin-timeline">
                {[...shipment.events].reverse().map((event) => (
                  <li key={event.id} className="timeline__item">
                    <p className="timeline__title">{t(`admin.shipmentStatus.${event.status}`)}</p>
                    {(event.location || event.description) && <p className="account-muted">{[event.location, event.description].filter(Boolean).join(' · ')}</p>}
                    <time className="timeline__time">{formatDateTime(event.occurredAt, language)}</time>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <aside className="admin-detail__side">
          <section className="account-card">
            <h2 className="account-card__title admin-section-title">
              <Icon name="mapPin" size={18} />
              {t('orderDetail.recipient')}
            </h2>
            <address className="order-address">
              <strong>{order.recipient.recipientName}</strong>
              <span>{order.recipient.recipientPhone}</span>
              <span className="account-muted">{formatAddressLine(order.recipient)}</span>
            </address>
          </section>
          <section className="account-card">
            <h2 className="account-card__title admin-section-title">
              <Icon name="card" size={18} />
              {t('orderDetail.paymentTitle')}
            </h2>
            <dl className="order-sum">
              <div>
                <dt>{t('orderDetail.method')}</dt>
                <dd>{t(`paymentMethod.${order.paymentMethod}`)}</dd>
              </div>
              {order.paymentMethod === 'COD' && (
                <div>
                  <dt>{t('admin.nav.cod')}</dt>
                  <dd>
                    <Link to="/admin/cod" className="account-link">
                      {t('admin.orders.viewCod')}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </section>
          {(order.buyerNote || order.sellerNote) && (
            <section className="account-card">
              <h2 className="account-card__title admin-section-title">
                <Icon name="doc" size={18} />
                {t('admin.orders.notes')}
              </h2>
              {order.buyerNote && (
                <p className="order-note">
                  <strong>{t('admin.orders.buyerNote')}:</strong> {order.buyerNote}
                </p>
              )}
              {order.sellerNote && (
                <p className="order-note">
                  <strong>{t('admin.orders.panel.sellerNote')}:</strong> {order.sellerNote}
                </p>
              )}
            </section>
          )}
          <section className="account-card">
            <h2 className="account-card__title admin-section-title">
              <Icon name="clock" size={18} />
              {t('admin.orders.timeline')}
            </h2>
            <dl className="order-sum">
              {[
                ['placedAt', order.placedAt],
                ['confirmedAt', order.confirmedAt],
                ['shippedAt', shipment?.shippedAt],
                ['completedAt', order.completedAt],
                ['cancelledAt', order.cancelledAt],
              ]
                .filter(([, value]) => value)
                .map(([key, value]) => (
                  <div key={key}>
                    <dt>{t(`admin.orders.times.${key}`)}</dt>
                    <dd>{formatDateTime(value, language)}</dd>
                  </div>
                ))}
            </dl>
          </section>
        </aside>
      </div>

      <Dialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        size="sm"
        title={t('admin.orders.cancelTitle')}
        description={t('admin.orders.cancelText')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              {t('cancelOrder.keep')}
            </Button>
            <Button
              className="btn--danger"
              disabled={busy || !reason.trim()}
              onClick={async () => {
                if (await run((id) => cancelShopOrder(id, order.id, reason), 'admin.orders.toast.cancelled')) {
                  setCancelOpen(false);
                  setReason('');
                }
              }}
            >
              {t('cancelOrder.confirm')}
            </Button>
          </>
        }
      >
        <Textarea label={t('admin.orders.cancelReason')} value={reason} maxLength={500} rows={3} placeholder={t('admin.orders.cancelPlaceholder')} onChange={(e) => setReason(e.target.value)} />
      </Dialog>
    </AdminPage>
  );
}

/**
 * /admin/orders/:shopOrderId — Xử lý 1 đơn của shop (GET /shops/{shopId}/orders/{id}).
 * Trên cùng là khối VIỆC CẦN LÀM theo trạng thái:
 *   Chờ xác nhận -> Xác nhận (kèm ghi chú) | Đang chuẩn bị -> Đã đóng gói | Chờ lấy hàng -> Giao cho vận chuyển
 *   (chọn hãng đã bật, mã vận đơn, ngày dự kiến) | Đang giao -> Cập nhật hành trình (DELIVERED = hoàn tất đơn)
 *   Hủy đơn: được ở 3 trạng thái đầu, bắt buộc nhập lý do.
 */
function AdminOrderDetailScreen({ onNotify }) {
  const { shopOrderId } = useParams();
  const { shopId } = useAdmin();
  return (
    <RequireShop>
      <OrderDetail key={`${shopId}-${shopOrderId}`} shopId={shopId} shopOrderId={shopOrderId} onNotify={onNotify} />
    </RequireShop>
  );
}

export default AdminOrderDetailScreen;
