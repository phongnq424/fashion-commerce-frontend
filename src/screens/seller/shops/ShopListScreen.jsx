import { Link, useNavigate } from 'react-router-dom';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import StatusBadge from '../../../components/common/StatusBadge';
import { useLanguage } from '../../../hooks/useLanguage';
import { useSeller } from '../../../hooks/useSeller';
import { formatDateTime, statusTone } from '../../../utils/status';
import { ShopAvatar } from '../components/SellerLayout';
import SellerPage from '../components/SellerPage';

/**
 * /seller/shops — Các shop của tôi (GET /shops/mine): shop tôi làm chủ + shop tôi là nhân viên.
 * Bấm "Vào shop" -> chọn shop đó cho cả Seller Center.
 */
function ShopListScreen() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { shops, shopId, selectShop, onboarding } = useSeller();
  const canRegister = !onboarding || onboarding.status === 'CANCELLED';

  return (
    <SellerPage
      title={t('seller.shops.title')}
      subtitle={t('seller.shops.subtitle', { count: shops.length })}
      actions={
        canRegister && (
          <Button as={Link} to="/seller/register">
            <Icon name="plus" size={18} />
            {t('seller.shops.register')}
          </Button>
        )
      }
    >
      {shops.length === 0 ? (
        <div className="account-card">
          <EmptyState
            icon="store"
            title={t('seller.noShop.title')}
            text={t('seller.noShop.text')}
            action={<Button as={Link} to="/seller">{t('seller.noShop.start')}</Button>}
          />
        </div>
      ) : (
        <ul className="shop-cards">
          {shops.map((shop) => (
            <li key={shop.id} className={`account-card shop-card ${shop.id === shopId ? 'shop-card--current' : ''}`}>
              <div className="shop-card__head">
                <ShopAvatar shop={shop} size={48} />
                <div>
                  <p className="shop-card__name">{shop.name}</p>
                  <p className="cell-sub">/{shop.slug}</p>
                </div>
                <StatusBadge tone={statusTone(shop.status)}>{t(`seller.shopStatus.${shop.status}`)}</StatusBadge>
              </div>
              <div className="role-chips">
                {shop.myRoles.map((role) => (
                  <span key={role} className={`role-chip ${role === 'SHOP_OWNER' ? 'role-chip--owner' : ''}`}>
                    {t(`seller.roles.${role}`)}
                  </span>
                ))}
              </div>
              <p className="cell-sub">{t('seller.shops.activatedAt', { date: formatDateTime(shop.activatedAt, language) })}</p>
              <Button
                variant={shop.id === shopId ? 'outline' : 'primary'}
                fullWidth
                onClick={() => {
                  selectShop(shop.id);
                  navigate('/seller');
                }}
              >
                {shop.id === shopId ? t('seller.shops.current') : t('seller.shops.enter')}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Link to="/seller/invitations" className="seller-note shop-cards__invite">
        <Icon name="mail" size={18} />
        <span>{t('seller.shops.invitationsHint')}</span>
      </Link>
    </SellerPage>
  );
}

export default ShopListScreen;
