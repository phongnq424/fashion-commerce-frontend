import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import StatusBadge from '../../../components/common/StatusBadge';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../hooks/useLanguage';
import { formatAddressLine } from '../../../services/addressService';
import {
  cancelMyOrder,
  CANCELLABLE_ORDER_STATUSES,
  getMyOrder,
  RETURNABLE_SHOP_ORDER_STATUSES,
  REVIEWABLE_SHOP_ORDER_STATUSES,
} from '../../../services/myOrderService';
import { createReview, getRememberedReview, updateReview } from '../../../services/myReviewService';
import { formatDeliveryRange, getDeliveryEstimate } from '../../../utils/delivery';
import { formatPrice } from '../../../utils/format';
import { formatDateTime, formatOptions, ORDER_STEPS, orderStepIndex, statusTone } from '../../../utils/status';
import AccountLayout from '../components/AccountLayout';
import CancelOrderDialog from './components/CancelOrderDialog';
import ReviewDialog from './components/ReviewDialog';

const ERROR_KEYS = {
  ORDER_NOT_CANCELLABLE: 'orderDetail.errors.notCancellable',
  REVIEW_NOT_ELIGIBLE: 'orderDetail.errors.reviewNotEligible',
};

/**
 * /account/orders/:orderId — Chi tiết đơn hàng (GET /orders/{orderId}).
 * Bố cục 2 cột:
 *   [Trái]  thanh tiến trình • mỗi shop 1 khối (mã đơn shop, trạng thái, sản phẩm, nút Đánh giá / Trả hàng)
 *   [Phải]  địa chỉ nhận hàng • thanh toán • tổng tiền • nút Hủy đơn  (dính khi cuộn)
 */
function OrderDetailScreen({ onNotify }) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('loading');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reviewing, setReviewing] = useState(null); // OrderItemResponse đang đánh giá
  const [, setReviewTick] = useState(0); // gửi đánh giá xong -> vẽ lại để nút đổi thành "Sửa đánh giá"

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setOrder(await getMyOrder(orderId));
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus(error?.status === 404 ? 'notFound' : 'error');
    }
  }, [orderId]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const fail = (error) => {
    console.error(error);
    onNotify?.('error', t(ERROR_KEYS[error?.code] ?? 'account.actionError'));
  };

  const handleCancel = async (reason) => {
    try {
      setOrder(await cancelMyOrder(orderId, reason));
      setCancelOpen(false);
      onNotify?.('success', t('orderDetail.cancelled'));
    } catch (error) {
      setCancelOpen(false);
      fail(error);
    }
  };

  const handleReview = async (data) => {
    const previous = getRememberedReview(reviewing.id);
    try {
      if (previous) await updateReview(previous.id, data);
      else await createReview(reviewing.id, data);
      onNotify?.('success', t(previous ? 'reviewForm.updated' : 'reviewForm.sent'));
      setReviewing(null);
      setReviewTick((value) => value + 1);
    } catch (error) {
      setReviewing(null);
      fail(error);
    }
  };

  const crumbs = [{ label: t('orders.title'), to: '/account/orders' }, { label: order ? `#${order.orderNumber}` : '…' }];

  if (status !== 'success') {
    return (
      <AccountLayout title={t('orderDetail.title')} breadcrumb={crumbs}>
        {status === 'loading' && (
          <>
            <div className="account-skeleton" />
            <div className="account-skeleton" />
          </>
        )}
        {status !== 'loading' && (
          <div className="account-card">
            <EmptyState
              tone={status === 'error' ? 'error' : 'default'}
              icon={status === 'error' ? 'alert' : 'package'}
              title={status === 'error' ? t('account.loadError') : t('orderDetail.notFound')}
              action={
                status === 'error' ? (
                  <Button variant="secondary" onClick={load}>{t('common.retry')}</Button>
                ) : (
                  <Button as={Link} to="/account/orders" variant="outline">{t('orderDetail.backToList')}</Button>
                )
              }
            />
          </div>
        )}
      </AccountLayout>
    );
  }

  const step = orderStepIndex(order.status);
  const cancelled = step < 0;
  const canCancel = CANCELLABLE_ORDER_STATUSES.includes(order.status);
  const recipient = order.recipient ?? {};
  const delivery = getDeliveryEstimate(order);
  const hasExactDate = order.shops?.some((shop) => shop.shipment?.estimatedDeliveryAt);

  return (
    <AccountLayout
      title={t('orders.orderNumber', { number: order.orderNumber })}
      subtitle={t('orderDetail.placedOn', { date: formatDateTime(order.placedAt, language) })}
      breadcrumb={crumbs}
      actions={<StatusBadge tone={statusTone(order.status)}>{t(`orderStatus.${order.status}`)}</StatusBadge>}
    >
      <Link to="/account/orders" className="account-link order-back">
        <Icon name="chevronLeft" size={16} />
        {t('orderDetail.backToList')}
      </Link>

      {/* ----- Thanh tiến trình ----- */}
      <div className="account-card">
        {cancelled ? (
          <p className="order-cancelled" role="status">
            <Icon name="info" size={18} />
            {order.status === 'CANCELLED'
              ? t('orderDetail.cancelledAt', { date: formatDateTime(order.cancelledAt, language) })
              : t('orderDetail.partiallyCancelled')}
          </p>
        ) : (
          <ol className="order-steps">
            {ORDER_STEPS.map((id, index) => (
              <li
                key={id}
                className={`order-steps__step ${index <= step ? 'order-steps__step--done' : ''} ${index === step ? 'order-steps__step--current' : ''}`}
                aria-current={index === step ? 'step' : undefined}
              >
                <span className="order-steps__dot" aria-hidden="true">
                  {index < step || step === ORDER_STEPS.length - 1 ? <Icon name="check" size={16} /> : index + 1}
                </span>
                <span className="order-steps__label">{t(`orderDetail.steps.${id}`)}</span>
                {id === 'placed' && <span className="order-steps__time">{formatDateTime(order.placedAt, language)}</span>}
                {id === 'completed' && order.completedAt && (
                  <span className="order-steps__time">{formatDateTime(order.completedAt, language)}</span>
                )}
              </li>
            ))}
          </ol>
        )}

        {/* Dự kiến giao: hiện khi đơn còn đang chờ giao (ẩn khi đã hoàn thành / đã hủy) */}
        {delivery && (
          <p className="order-eta">
            <Icon name="truck" size={20} />
            <span>
              {t('delivery.label')}: <strong>{formatDeliveryRange(delivery, language)}</strong>
              <span className="order-eta__note">{hasExactDate ? t('delivery.exactNote') : t('delivery.estimateNote')}</span>
            </span>
          </p>
        )}
        {order.status === 'COMPLETED' && order.completedAt && (
          <p className="order-eta order-eta--done">
            <Icon name="check" size={20} />
            <span>{t('delivery.deliveredOn', { date: formatDateTime(order.completedAt, language) })}</span>
          </p>
        )}
      </div>

      <div className="order-detail">
        {/* ----- Cột trái: từng shop ----- */}
        <div className="order-detail__main">
          {(order.shops ?? []).map((shop) => {
            const canReview = REVIEWABLE_SHOP_ORDER_STATUSES.includes(shop.status);
            const canReturn = RETURNABLE_SHOP_ORDER_STATUSES.includes(shop.status);
            return (
              <section key={shop.id} className="account-card shop-order" aria-label={shop.shopOrderNumber}>
                <header className="shop-order__head">
                  <p className="shop-order__title">
                    <Icon name="store" size={18} />
                    {t('orderDetail.shopOrder', { number: shop.shopOrderNumber })}
                  </p>
                  <StatusBadge tone={statusTone(shop.status)}>{t(`shopOrderStatus.${shop.status}`)}</StatusBadge>
                </header>

                <ul className="order-items">
                  {(shop.items ?? []).map((item) => {
                    const reviewed = getRememberedReview(item.id);
                    return (
                      <li key={item.id} className="order-item">
                        <Link to={`/product/${item.productId}`} className="item-thumb" aria-hidden="true" tabIndex={-1}>
                          {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <Icon name="hanger" size={26} />}
                        </Link>
                        <div className="order-item__info">
                          <Link to={`/product/${item.productId}`} className="order-item__name">
                            {item.productName}
                          </Link>
                          {item.isGift && (
                            <p className="order-item__gift">
                              <Icon name="gift" size={14} />
                              {t('checkout.giftTitle')}
                            </p>
                          )}
                          {formatOptions(item.options) && (
                            <p className="account-muted">
                              {t('orderDetail.variant')}: {formatOptions(item.options)}
                            </p>
                          )}
                          <p className="account-muted">
                            {formatPrice(item.unitPriceMinor, language)} × {item.quantity}
                          </p>
                          {canReview && !item.isGift && (
                            <button type="button" className="text-btn order-item__review" onClick={() => setReviewing(item)}>
                              <Icon name="star" size={16} />
                              {reviewed ? t('orderDetail.editReview') : t('orderDetail.writeReview')}
                            </button>
                          )}
                        </div>
                        <div className="order-item__price">
                          {item.discountMinor > 0 && (
                            <s className="account-muted">{formatPrice(item.unitPriceMinor * item.quantity, language)}</s>
                          )}
                          <strong>{formatPrice(item.lineTotalMinor, language)}</strong>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <footer className="shop-order__foot">
                  <span className="account-muted">
                    {t('orderDetail.shipping')}: {formatPrice(shop.shippingFeeMinor, language)}
                  </span>
                  <span>
                    {t('orderDetail.shopTotal')}: <strong>{formatPrice(shop.totalMinor, language)}</strong>
                  </span>
                  {canReturn && (
                    <Button
                      as={Link}
                      to={`/account/returns/new?orderId=${order.id}&shopOrderId=${shop.id}`}
                      variant="outline"
                      size="sm"
                    >
                      <Icon name="refresh" size={16} />
                      {t('orderDetail.requestReturn')}
                    </Button>
                  )}
                </footer>
              </section>
            );
          })}
          {order.buyerNote && (
            <div className="account-card">
              <h2 className="account-card__title">
                <Icon name="doc" size={18} />
                {t('orderDetail.note')}
              </h2>
              <p className="order-note">{order.buyerNote}</p>
            </div>
          )}
        </div>

        {/* ----- Cột phải: thông tin + tổng tiền ----- */}
        <aside className="order-detail__side">
          <div className="account-card">
            <h2 className="account-card__title">
              <Icon name="mapPin" size={18} />
              {t('orderDetail.recipient')}
            </h2>
            <address className="order-address">
              <strong>{recipient.recipientName}</strong>
              <span>{recipient.recipientPhone}</span>
              <span className="account-muted">{formatAddressLine(recipient)}</span>
            </address>
          </div>

          <div className="account-card">
            <h2 className="account-card__title">
              <Icon name="card" size={18} />
              {t('orderDetail.paymentTitle')}
            </h2>
            <dl className="order-sum">
              <div>
                <dt>{t('orderDetail.method')}</dt>
                <dd>{t(`paymentMethod.${order.paymentMethod}`)}</dd>
              </div>
              {order.payment && (
                <div>
                  <dt>{t('orderDetail.paymentStatus')}</dt>
                  <dd>
                    <StatusBadge tone={statusTone(order.payment.status)}>{t(`paymentStatus.${order.payment.status}`)}</StatusBadge>
                  </dd>
                </div>
              )}
              {order.paidAt && (
                <div>
                  <dt>{t('orderDetail.paidAt')}</dt>
                  <dd>{formatDateTime(order.paidAt, language)}</dd>
                </div>
              )}
            </dl>
            {order.payment?.checkoutUrl && order.payment.status === 'PENDING' && (
              <Button as="a" href={order.payment.checkoutUrl} fullWidth className="order-paynow">
                {t('orderDetail.payNow')}
              </Button>
            )}
          </div>

          <div className="account-card">
            <h2 className="account-card__title">
              <Icon name="receipt" size={18} />
              {t('orderDetail.summary')}
            </h2>
            <dl className="order-sum">
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
                  <dd className="order-sum__discount">−{formatPrice(order.discountTotalMinor, language)}</dd>
                </div>
              )}
              <div className="order-sum__total">
                <dt>{t('orders.total')}</dt>
                <dd>{formatPrice(order.grandTotalMinor, language)}</dd>
              </div>
            </dl>
            {canCancel && (
              <Button variant="outline" fullWidth className="order-cancel-btn" onClick={() => setCancelOpen(true)}>
                {t('orderDetail.cancel')}
              </Button>
            )}
          </div>
        </aside>
      </div>

      <CancelOrderDialog
        open={cancelOpen}
        orderNumber={order.orderNumber}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
      />
      <ReviewDialog
        open={reviewing !== null}
        item={reviewing}
        review={reviewing ? getRememberedReview(reviewing.id) : null}
        onClose={() => setReviewing(null)}
        onSubmit={handleReview}
      />
    </AccountLayout>
  );
}

export default OrderDetailScreen;
