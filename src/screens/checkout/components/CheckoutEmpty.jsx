import { Link } from 'react-router-dom';
import Logo from '../../../components/layout/Logo';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';

// Mở /checkout khi giỏ đang trống -> báo và mời quay lại mua sắm
function CheckoutEmpty() {
  const { t } = useLanguage();

  return (
    <div className="checkout-empty">
      <Logo />
      <Icon name="bag" size={48} className="checkout-empty__icon" />
      <h1 className="checkout-section__title">{t('checkout.emptyTitle')}</h1>
      <p className="checkout-empty__text">{t('checkout.emptyText')}</p>
      <Button as={Link} to="/">
        {t('checkout.continueShopping')}
      </Button>
    </div>
  );
}

export default CheckoutEmpty;
