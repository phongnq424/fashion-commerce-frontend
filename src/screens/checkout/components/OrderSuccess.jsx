import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';

/**
 * Màn "Đặt hàng thành công" (thay cho form ở cột trái sau khi bấm Hoàn tất đơn hàng).
 * - order: { orderCode, shipping, paymentMethod }
 */
function OrderSuccess({ order }) {
  const { t } = useLanguage();
  const { orderCode, shipping, paymentMethod } = order;

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
          <dt>{t('checkout.stepPayment')}</dt>
          <dd>{t(`checkout.methods.${paymentMethod}`)}</dd>
        </div>
      </dl>

      <Button as={Link} to="/">
        {t('checkout.continueShopping')}
      </Button>
    </section>
  );
}

export default OrderSuccess;
