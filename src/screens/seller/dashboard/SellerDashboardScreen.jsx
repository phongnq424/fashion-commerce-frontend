import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import StatusBadge from '../../../components/common/StatusBadge';
import { useLanguage } from '../../../hooks/useLanguage';
import { useSeller } from '../../../hooks/useSeller';
import { onboardingProgress } from '../../../services/seller/onboardingService';
import { getMyInvitations } from '../../../services/seller/staffService';
import SellerPage from '../components/SellerPage';
import ShopDashboard from './ShopDashboard';

const STEPS = ['shop', 'pickup', 'shipping', 'tax', 'identity', 'policies'];

// Chưa có shop: trang giới thiệu + mời đăng ký (hoặc tiếp tục hồ sơ đang làm dở)
function Welcome() {
  const { t } = useLanguage();
  const { onboarding } = useSeller();
  const [invites, setInvites] = useState(0);
  const progress = onboardingProgress(onboarding);
  const done = STEPS.filter((step) => progress[step]).length;

  useEffect(() => {
    getMyInvitations().then((items) => setInvites(items.length)).catch(() => {});
  }, []);

  if (onboarding?.status === 'PENDING_REVIEW') {
    return (
      <div className="account-card seller-welcome seller-welcome--compact">
        <StatusBadge tone="warning">{t('seller.onboardingStatus.PENDING_REVIEW')}</StatusBadge>
        <h1 className="seller-welcome__title">{t('seller.welcome.pendingTitle')}</h1>
        <p className="account-muted">{t('seller.welcome.pendingText')}</p>
        <Button as={Link} to="/seller/register/status">{t('seller.noShop.viewStatus')}</Button>
      </div>
    );
  }

  return (
    <div className="seller-welcome-wrap">
      <section className="account-card seller-welcome">
        <span className="seller-welcome__icon" aria-hidden="true">
          <Icon name="store" size={30} />
        </span>
        <h1 className="seller-welcome__title">
          {onboarding ? t('seller.welcome.continueTitle') : t('seller.welcome.title')}
        </h1>
        <p className="seller-welcome__text">
          {onboarding ? t('seller.welcome.continueText', { done, total: STEPS.length }) : t('seller.welcome.text')}
        </p>
        {onboarding?.status === 'REJECTED' && (
          <p className="seller-note seller-note--danger">
            <Icon name="alert" size={18} />
            <span>
              {t('seller.status.rejectedNote')}: <strong>{onboarding.reviewNote}</strong>
            </span>
          </p>
        )}
        <div className="seller-welcome__actions">
          <Button as={Link} to="/seller/register">
            {onboarding ? t('seller.welcome.continue') : t('seller.welcome.start')}
            <Icon name="arrowRight" size={18} />
          </Button>
        </div>
      </section>

      <section className="account-card">
        <h2 className="account-card__title">
          <Icon name="doc" size={18} />
          {t('seller.welcome.stepsTitle')}
        </h2>
        <ol className="seller-steps-list">
          {STEPS.map((step, index) => (
            <li key={step} className={progress[step] ? 'is-done' : ''}>
              <span className="seller-steps-list__num">{progress[step] ? <Icon name="check" size={14} /> : index + 1}</span>
              <span>
                <strong>{t(`seller.onboarding.steps.${step}`)}</strong>
                <span className="cell-sub">{t(`seller.onboarding.stepHints.${step}`)}</span>
              </span>
            </li>
          ))}
        </ol>
        {invites > 0 && (
          <Link to="/seller/invitations" className="seller-note seller-welcome__invite">
            <Icon name="mail" size={18} />
            <span>{t('seller.welcome.invites', { count: invites })}</span>
          </Link>
        )}
      </section>
    </div>
  );
}

// Đã có shop: tổng quan việc cần làm + đơn mới + hàng sắp hết
/**
 * /seller — Tổng quan.
 * Chưa có shop -> mời đăng ký bán hàng (Welcome). Có shop -> dashboard của shop đang chọn (ShopDashboard).
 */
function SellerDashboardScreen() {
  const { t } = useLanguage();
  const { shopId } = useSeller();
  if (!shopId) return <Welcome />;
  return (
    <SellerPage title={t('seller.dashboard.title')} subtitle={t('seller.dashboard.subtitle')}>
      <ShopDashboard />
    </SellerPage>
  );
}

export default SellerDashboardScreen;
