import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import StatusBadge from '../../../components/common/StatusBadge';
import { useLanguage } from '../../../hooks/useLanguage';
import { decideOnboarding, getOnboarding } from '../../../services/admin/platformService';
import { formatDateTime, statusTone } from '../../../utils/status';
import AdminPage from '../components/AdminPage';
import { ListState, ReasonDialog, useErrorText } from '../components/AdminParts';

const isUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value);
const DocLink = ({ value }) => (isUrl(value) ? <a href={value} target="_blank" rel="noreferrer" className="account-link">{value}</a> : value || '—');

function Rows({ rows }) {
  return (
    <dl className="checkout-review">
      {rows.map(([label, value]) => (
        <div key={label} className="checkout-review__row">
          <dt>{label}</dt>
          <dd>{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

/** /admin/seller-reviews/:id — Xem toàn bộ hồ sơ và Duyệt / Từ chối (POST /admin/seller-onboardings/{id}/decision). */
function SellerReviewDetailScreen({ onNotify }) {
  const { t, language } = useLanguage();
  const { onboardingId } = useParams();
  const navigate = useNavigate();
  const errorText = useErrorText();
  const [row, setRow] = useState(null);
  const [status, setStatus] = useState('loading');
  const [deciding, setDeciding] = useState(null); // 'APPROVED' | 'REJECTED'

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setRow(await getOnboarding(onboardingId));
      setStatus('success');
    } catch (error) {
      setStatus(error?.status === 403 ? 'forbidden' : 'error');
    }
  }, [onboardingId]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async ({ reason }) => {
    try {
      await decideOnboarding(onboardingId, { decision: deciding, note: reason });
      onNotify?.('success', t(deciding === 'APPROVED' ? 'market.admin.sellerReviews.approved' : 'market.admin.sellerReviews.rejected'));
      setDeciding(null);
      navigate('/admin/seller-reviews');
    } catch (error) {
      onNotify?.('error', errorText(error));
    }
  };

  const back = { to: '/admin/seller-reviews', label: t('market.admin.nav.sellerReviews') };
  if (status !== 'success') return <AdminPage title={t('market.admin.sellerReviews.detail')} back={back}><section className="account-card"><ListState status={status} onRetry={load} /></section></AdminPage>;

  const shop = row.shop ?? {};
  const tax = row.taxProfile;
  const identity = row.identityVerification;
  const address = tax?.registeredAddress ?? {};

  return (
    <AdminPage
      title={shop.name ?? t('market.admin.sellerReviews.detail')}
      back={back}
      badge={<StatusBadge tone={statusTone(row.status)}>{t(`seller.onboardingStatus.${row.status}`, { defaultValue: row.status })}</StatusBadge>}
      actions={
        row.status === 'PENDING_REVIEW' && (
          <>
            <Button variant="outline" className="btn--danger-outline" onClick={() => setDeciding('REJECTED')}>{t('market.admin.reject')}</Button>
            <Button onClick={() => setDeciding('APPROVED')}><Icon name="check" size={16} />{t('market.admin.approve')}</Button>
          </>
        )
      }
    >
      {row.reviewNote && <p className="admin-note admin-note--warning"><Icon name="info" size={18} /><span>{row.reviewNote}</span></p>}
      <div className="admin-grid-2">
        <section className="account-card">
          <h2 className="account-card__title admin-section-title"><Icon name="store" size={18} />{t('market.admin.sellerReviews.shopInfo')}</h2>
          <Rows rows={[
            [t('seller.fields.shopName'), shop.name],
            ['Slug', shop.slug],
            [t('seller.fields.email'), shop.email],
            [t('seller.fields.phone'), shop.phone],
            [t('seller.fields.description'), shop.description],
            [t('market.admin.sellerReviews.submittedAt'), formatDateTime(row.submittedAt, language)],
          ]} />
        </section>
        <section className="account-card">
          <h2 className="account-card__title admin-section-title"><Icon name="mapPin" size={18} />{t('market.admin.sellerReviews.pickup')}</h2>
          {(row.pickupAddresses ?? []).map((a) => (
            <p key={a.id}>
              <strong>{a.contactName}</strong> · {a.contactPhone}
              <br />
              <span className="account-muted">{[a.addressDetail, a.wardName, a.provinceName].filter(Boolean).join(', ')}</span>
            </p>
          ))}
          <p className="account-muted">
            {t('market.admin.sellerReviews.carriers')}: {(row.shippingProviders ?? []).filter((p) => p.enabled).map((p) => p.name).join(', ') || '—'}
          </p>
        </section>
        <section className="account-card">
          <h2 className="account-card__title admin-section-title"><Icon name="doc" size={18} />{t('market.admin.sellerReviews.tax')}</h2>
          {tax ? (
            <Rows rows={[
              [t('market.admin.sellerReviews.businessType'), t(`seller.businessTypes.${tax.businessType}`, { defaultValue: tax.businessType })],
              [t('seller.fields.legalName'), tax.legalName ?? tax.legalRepresentativeName],
              [t('seller.fields.businessName'), tax.businessName],
              [t('seller.fields.taxCode'), tax.taxCode],
              [t('seller.fields.registrationNumber'), tax.businessRegistrationNumber],
              [t('seller.fields.invoiceEmail'), tax.invoiceEmail],
              [t('seller.fields.registeredAddress'), [address.addressDetail, address.wardName, address.provinceName].filter(Boolean).join(', ')],
              [t('market.admin.sellerReviews.document'), <DocLink key="doc" value={tax.registrationDocumentKey} />],
            ]} />
          ) : <p className="account-muted">—</p>}
        </section>
        <section className="account-card">
          <h2 className="account-card__title admin-section-title"><Icon name="user" size={18} />{t('market.admin.sellerReviews.identity')}</h2>
          {identity ? (
            <Rows rows={[
              [t('seller.fields.legalName'), identity.legalName],
              [t('market.admin.sellerReviews.last4'), identity.documentNumberLast4],
              [t('market.admin.sellerReviews.front'), <DocLink key="f" value={identity.frontDocumentKey} />],
              [t('market.admin.sellerReviews.back'), <DocLink key="b" value={identity.backDocumentKey} />],
              [t('market.admin.sellerReviews.selfie'), <DocLink key="s" value={identity.selfieDocumentKey} />],
            ]} />
          ) : <p className="account-muted">—</p>}
          <p className="account-muted">{t('market.admin.sellerReviews.policies')}: {(row.acceptedPolicyVersions ?? []).join(', ') || '—'}</p>
        </section>
      </div>

      <ReasonDialog
        open={deciding !== null}
        title={t(deciding === 'APPROVED' ? 'market.admin.sellerReviews.approveTitle' : 'market.admin.sellerReviews.rejectTitle')}
        confirmLabel={t(deciding === 'APPROVED' ? 'market.admin.approve' : 'market.admin.reject')}
        danger={deciding === 'REJECTED'}
        requireReason={deciding === 'REJECTED'}
        onClose={() => setDeciding(null)}
        onConfirm={decide}
      />
    </AdminPage>
  );
}

export default SellerReviewDetailScreen;
