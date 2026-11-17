import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';
import { formatAddressLine } from '../../../services/addressService';
import { formatPrice } from '../../../utils/format';

/**
 * Màn "Đặt hàng thành công".
 * - order: OrderResponse của Backend (orderNumber, recipient, shops[], paymentMethod, grandTotalMinor)
 */
function OrderSuccess({ order }) {
  const { t, language } = useLanguage();
  const recipient = order.recipient ?? {};

  return (
    <section className="checkout-section order-success" aria-labelledby="success-title">
      <span className="order-success__icon" aria-hidden="true">
        <Icon name="check" size={32} strokeWidth={2.4} />
      </span>
      <div role="status">
        <h1 id="success-title" className="checkout-section__title">
          {t('checkout.successTitle')}
        </h1>
        <p className="order-success__text">
          {t('checkout.successText', { name: recipient.recipientName, code: order.orderNumber })}
        </p>
      </div>
      {order.shops?.length > 1 && (
        <p className="order-success__note">{t('market.checkout.splitNote', { count: order.shops.length })}</p>
      )}

      <dl className="checkout-review">
        <div className="checkout-review__row">
          <dt>{t('checkout.shipTo')}</dt>
          <dd>{formatAddressLine(recipient)}</dd>
        </div>
        <div className="checkout-review__row">
          <dt>{t('checkout.stepPayment')}</dt>
          <dd>{t(`market.paymentMethods.${order.paymentMethod}`, { defaultValue: order.paymentMethod })}</dd>
        </div>
        <div className="checkout-review__row">
          <dt>{t('checkout.total')}</dt>
          <dd>
            <strong>{formatPrice(order.grandTotalMinor, language)}</strong>
          </dd>
        </div>
      </dl>

      <div className="order-success__actions">
        <Button as={Link} to="/" variant="outline">
          <Icon name="bag" size={18} />
          {t('checkout.continueShopping')}
        </Button>
        <Button as={Link} to={`/account/orders/${order.id}`}>
          <Icon name="truck" size={18} />
          {t('checkout.trackOrder')}
        </Button>
      </div>
    </section>
  );
}

export default OrderSuccess;
