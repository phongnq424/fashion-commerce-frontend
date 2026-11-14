import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';
import { formatDeliveryRange, getDeliveryEstimate } from '../../../utils/delivery';

/**
 * Màn "Đặt hàng thành công" (thay cho form ở cột trái sau khi bấm Hoàn tất đơn hàng).
 * - order: { orderCode, orderId, shipping, paymentMethod }
 * Cuối màn có 2 nút: "Tiếp tục mua sắm" (về trang chủ) | "Theo dõi đơn hàng" (/account/orders/<orderId>)
 */
function OrderSuccess({ order }) {
  const { t, language } = useLanguage();
  const { orderCode, orderId, shipping, paymentMethod } = order;
  // Đơn vừa đặt -> ước tính 2–4 ngày (trừ CN) tính từ bây giờ
  const delivery = getDeliveryEstimate({ status: 'CONFIRMED', placedAt: new Date().toISOString() });

  return (
    <section className="checkout-section order-success" aria-labelledby="success-title">
      <span className="order-success__icon" aria-hidden="true">
        <Icon name="check" size={32} strokeWidth={2.4} />
      </span>
      {/* role="status": trình đọc màn hình đọc ngay khi đặt hàng xong */}
      <div role="status">
        <h1 id="success-title" className="checkout-section__title">
          {t('checkout.successTitle')}
        </h1>
        <p className="order-success__text">
          {t('checkout.successText', { name: shipping.fullName, code: orderCode })}
        </p>
      </div>
      <p className="order-success__note">{t('checkout.successNote', { phone: shipping.phone })}</p>

      <dl className="checkout-review">
        <div className="checkout-review__row">
          <dt>{t('checkout.shipTo')}</dt>
          <dd>
            {[shipping.address, shipping.wardName, shipping.districtName, shipping.provinceName]
              .filter(Boolean)
              .join(', ')}
          </dd>
        </div>
        <div className="checkout-review__row">
          <dt>{t('delivery.label')}</dt>
          <dd>
            <strong>{formatDeliveryRange(delivery, language)}</strong>
          </dd>
        </div>
        <div className="checkout-review__row">
          <dt>{t('checkout.stepPayment')}</dt>
          <dd>{t(`checkout.methods.${paymentMethod}`)}</dd>
        </div>
      </dl>

      <div className="order-success__actions">
        <Button as={Link} to="/" variant="outline">
          <Icon name="bag" size={18} />
          {t('checkout.continueShopping')}
        </Button>
        <Button as={Link} to={orderId ? `/account/orders/${orderId}` : '/account/orders'}>
          <Icon name="truck" size={18} />
          {t('checkout.trackOrder')}
        </Button>
      </div>
    </section>
  );
}

export default OrderSuccess;
