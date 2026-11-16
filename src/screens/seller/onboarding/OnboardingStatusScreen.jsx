import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import StatusBadge from '../../../components/common/StatusBadge';
import { useLanguage } from '../../../hooks/useLanguage';
import { useSeller } from '../../../hooks/useSeller';
import { formatDateTime, statusTone } from '../../../utils/status';
import SellerPage from '../components/SellerPage';

// Thanh tiến trình hồ sơ: Tạo hồ sơ -> Gửi duyệt -> Đang kiểm duyệt -> Kết quả
const STAGES = ['created', 'submitted', 'reviewing', 'result'];
const stageOf = (status) => ({ DRAFT: 0, PENDING_REVIEW: 2, REJECTED: 3, COMPLETED: 3 })[status] ?? 0;

/**
 * /seller/register/status — Trạng thái hồ sơ đăng ký bán hàng (GET /seller/onboarding/me).
 *   DRAFT -> nhắc hoàn tất ; PENDING_REVIEW -> chờ kiểm duyệt ; REJECTED -> lý do + sửa hồ sơ ; COMPLETED -> vào shop
 * Hồ sơ do nhân viên sàn duyệt ở trang /admin. Bấm "Tải lại trạng thái" để cập nhật kết quả.
 */
function OnboardingStatusScreen({ onNotify }) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { onboarding, refreshOnboarding, refreshShops, selectShop } = useSeller();
  const [busy, setBusy] = useState(false);

  if (!onboarding) {
    return (
      <SellerPage title={t('seller.status.title')}>
        <div className="account-card">
          <EmptyState
            icon="doc"
            title={t('seller.status.noneTitle')}
            text={t('seller.status.noneText')}
            action={<Button as={Link} to="/seller/register">{t('seller.welcome.start')}</Button>}
          />
        </div>
      </SellerPage>
    );
  }

  const status = onboarding.status;
  const stage = stageOf(status);

  // Tải lại hồ sơ + danh sách shop. Được duyệt -> vào shop vừa tạo.
  const refresh = async () => {
    setBusy(true);
    try {
      const row = await refreshOnboarding();
      if (row?.status === 'COMPLETED') {
        await refreshShops();
        if (row.shop?.shopId) selectShop(row.shop.shopId);
        onNotify?.('success', t('seller.status.approvedToast'));
        navigate('/seller');
      } else if (row?.status === 'REJECTED') {
        onNotify?.('warning', t('seller.status.rejectedToast'));
      }
    } catch (error) {
      console.error(error);
      onNotify?.('error', t('account.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const rows = [
    ['shopName', onboarding.shop?.name],
    ['email', onboarding.shop?.email],
    ['phone', onboarding.shop?.phone],
    ['pickup', onboarding.pickupAddresses[0] && [onboarding.pickupAddresses[0].addressDetail, onboarding.pickupAddresses[0].wardName, onboarding.pickupAddresses[0].provinceName].join(', ')],
    ['carriers', onboarding.shippingProviders.filter((p) => p.enabled).map((p) => p.name).join(', ')],
    ['businessType', onboarding.taxProfile && t(`seller.businessTypes.${onboarding.taxProfile.businessType}.title`)],
    ['taxCode', onboarding.taxProfile?.taxCode],
    ['identity', onboarding.identityVerification && `CCCD ••••${onboarding.identityVerification.documentNumberLast4}`],
  ];

  return (
    <SellerPage
      title={t('seller.status.title')}
      subtitle={t('seller.status.subtitle')}
      badge={<StatusBadge tone={statusTone(status)}>{t(`seller.onboardingStatus.${status}`)}</StatusBadge>}
      back={{ to: '/seller', label: t('seller.nav.dashboard') }}
    >
      <div className="account-card">
        <ol className="order-steps">
          {STAGES.map((id, index) => (
            <li
              key={id}
              className={`order-steps__step ${index <= stage ? 'order-steps__step--done' : ''} ${index === stage ? 'order-steps__step--current' : ''}`}
            >
              <span className="order-steps__dot" aria-hidden="true">
                {index < stage || (index === 3 && status === 'COMPLETED') ? <Icon name="check" size={16} /> : index + 1}
              </span>
              <span className="order-steps__label">
                {id === 'result' && status === 'REJECTED' ? t('seller.status.stages.rejected') : t(`seller.status.stages.${id}`)}
              </span>
              {id === 'submitted' && onboarding.submittedAt && <span className="order-steps__time">{formatDateTime(onboarding.submittedAt, language)}</span>}
              {id === 'result' && onboarding.reviewedAt && <span className="order-steps__time">{formatDateTime(onboarding.reviewedAt, language)}</span>}
            </li>
          ))}
        </ol>

        <div className="seller-status-msg">
          {status === 'DRAFT' && (
            <>
              <p>{t('seller.status.draftText')}</p>
              <Button as={Link} to="/seller/register">{t('seller.welcome.continue')}</Button>
            </>
          )}
          {status === 'PENDING_REVIEW' && <p>{t('seller.status.pendingText')}</p>}
          {status === 'REJECTED' && (
            <>
              <p className="seller-note seller-note--danger">
                <Icon name="alert" size={18} />
                <span>
                  {t('seller.status.rejectedNote')}: <strong>{onboarding.reviewNote}</strong>
                </span>
              </p>
              <Button as={Link} to="/seller/register">{t('seller.status.editAndResubmit')}</Button>
            </>
          )}
          {status === 'COMPLETED' && (
            <>
              <p>{t('seller.status.completedText')}</p>
              <Button as={Link} to="/seller">{t('seller.status.goShop')}</Button>
            </>
          )}
        </div>
      </div>

      <div className="seller-grid-2">
        <section className="account-card">
          <h2 className="account-card__title seller-section-title">
            <Icon name="doc" size={18} />
            {t('seller.status.summary')}
          </h2>
          <dl className="info-list">
            {rows.map(([key, value]) => (
              <div key={key} className="info-list__row">
                <dt>{t(`seller.status.rows.${key}`)}</dt>
                <dd>{value || '—'}</dd>
              </div>
            ))}
          </dl>
        </section>

        {status === 'PENDING_REVIEW' && (
          <section className="account-card">
            <p className="account-muted">{t('market.seller.pendingReviewHint')}</p>
            <div className="seller-form__actions">
              <Button variant="outline" disabled={busy} onClick={refresh}>
                <Icon name="refresh" size={16} />
                {busy ? t('common.loading') : t('market.seller.refreshStatus')}
              </Button>
            </div>
          </section>
        )}
      </div>
    </SellerPage>
  );
}

export default OnboardingStatusScreen;
