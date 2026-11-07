import { Link } from 'react-router-dom';
import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';

/**
 * Thanh điều hướng các bước:  Giỏ hàng  >  Thông tin giao hàng  >  Phương thức thanh toán
 * - current: 'shipping' | 'payment'
 * - onStepChange(step): quay lại bước giao hàng khi đang ở bước thanh toán
 * Bước đang mở có aria-current="step" để trình đọc màn hình biết đang ở đâu.
 */
function CheckoutSteps({ current, onStepChange }) {
  const { t } = useLanguage();

  return (
    <nav className="checkout-steps" aria-label={t('checkout.stepsLabel')}>
      <ol className="checkout-steps__list">
        <li className="checkout-steps__item">
          <Link to="/cart" className="checkout-steps__link">
            {t('checkout.stepCart')}
          </Link>
          <Icon name="chevronRight" size={14} className="checkout-steps__sep" />
        </li>

        <li className="checkout-steps__item">
          {current === 'shipping' ? (
            <span className="checkout-steps__current" aria-current="step">
              {t('checkout.stepShipping')}
            </span>
          ) : (
            <button type="button" className="checkout-steps__link" onClick={() => onStepChange('shipping')}>
              {t('checkout.stepShipping')}
            </button>
          )}
          <Icon name="chevronRight" size={14} className="checkout-steps__sep" />
        </li>

        <li className="checkout-steps__item">
          <span
            className={current === 'payment' ? 'checkout-steps__current' : 'checkout-steps__upcoming'}
            aria-current={current === 'payment' ? 'step' : undefined}
          >
            {t('checkout.stepPayment')}
          </span>
        </li>
      </ol>
    </nav>
  );
}

export default CheckoutSteps;
