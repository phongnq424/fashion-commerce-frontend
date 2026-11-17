import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';
import { useSeller } from '../../../hooks/useSeller';
import {
  acceptPolicy,
  completeOnboarding,
  configureShipping,
  getPolicies,
  onboardingProgress,
  savePickupAddress,
  saveTaxProfile,
  startOnboarding,
  submitIdentity,
  updateShopProfile,
} from '../../../services/seller/onboardingService';
import SellerPage from '../components/SellerPage';
import { IdentityStep, PickupStep, PolicyStep, ShippingStep, ShopStep, TaxStep } from './OnboardingSteps';

const STEPS = ['shop', 'pickup', 'shipping', 'tax', 'identity', 'policies'];

const ERROR_KEYS = {
  IDENTITY_LEGAL_NAME_MISMATCH: 'seller.errors.nameMismatch',
  SELLER_TAX_PROFILE_INVALID: 'seller.errors.taxInvalid',
  SELLER_ONBOARDING_INCOMPLETE: 'seller.errors.incomplete',
  SELLER_ONBOARDING_NOT_EDITABLE: 'seller.errors.notEditable',
  SHIPPING_PROVIDER_REQUIRED: 'seller.errors.providerRequired',
};

/**
 * /seller/register — Đăng ký bán hàng (wizard 6 bước, bố cục: danh sách bước bên trái | form bên phải).
 *   1 Thông tin shop  2 Địa chỉ lấy hàng  3 Đơn vị vận chuyển  4 Thông tin thuế  5 Định danh CCCD  6 Chính sách & gửi duyệt
 * Mỗi bước lưu ngay lên backend (PUT tương ứng), nên thoát ra vào lại vẫn còn. Gửi duyệt -> /seller/register/status.
 */
function OnboardingScreen({ onNotify }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { onboarding, refreshOnboarding } = useSeller();
  const progress = onboardingProgress(onboarding);
  const firstTodo = STEPS.find((step) => !progress[step]) ?? 'policies';
  const [step, setStep] = useState(onboarding ? firstTodo : 'shop');
  const [saving, setSaving] = useState(false);
  const [policies, setPolicies] = useState([]);

  const loadPolicies = useCallback(async () => {
    if (onboarding?.id) setPolicies(await getPolicies(onboarding.id));
  }, [onboarding?.id]);

  useEffect(() => {
    if (step === 'policies') loadPolicies().catch(() => {});
  }, [step, loadPolicies]);

  const editable = !onboarding || ['DRAFT', 'REJECTED'].includes(onboarding.status);
  if (!editable) {
    return (
      <SellerPage title={t('seller.onboarding.title')}>
        <div className="account-card">
          <EmptyState
            icon="doc"
            title={t('seller.onboarding.lockedTitle')}
            text={t('seller.onboarding.lockedText')}
            action={<Button as={Link} to="/seller/register/status">{t('seller.noShop.viewStatus')}</Button>}
          />
        </div>
      </SellerPage>
    );
  }

  // Lưu 1 bước rồi sang bước kế
  const run = async (action, next) => {
    setSaving(true);
    try {
      await action();
      await refreshOnboarding();
      onNotify?.('success', t('seller.onboarding.saved'));
      if (next) setStep(next);
    } catch (error) {
      console.error(error);
      onNotify?.('error', t(ERROR_KEYS[error?.code] ?? 'account.actionError'));
    } finally {
      setSaving(false);
    }
  };

  const nextOf = (current) => STEPS[STEPS.indexOf(current) + 1];
  const backOf = (current) => () => setStep(STEPS[STEPS.indexOf(current) - 1]);
  const id = onboarding?.id;

  // Gửi duyệt: ghi nhận các chính sách đã tích (chưa gửi trước đó) rồi mới hoàn tất hồ sơ
  const submit = async (checkedVersions = []) => {
    setSaving(true);
    try {
      const already = new Set(policies.filter((p) => p.accepted).map((p) => p.version));
      for (const version of checkedVersions) {
        if (!already.has(version)) await acceptPolicy(id, version);
      }
      await completeOnboarding(id);
      await refreshOnboarding();
      onNotify?.('success', t('seller.onboarding.submitted'));
      navigate('/seller/register/status');
    } catch (error) {
      console.error(error);
      onNotify?.('error', t(ERROR_KEYS[error?.code] ?? 'account.actionError'));
    } finally {
      setSaving(false);
    }
  };

  const stepIndex = STEPS.indexOf(step);

  return (
    <SellerPage
      title={t('seller.onboarding.title')}
      subtitle={t('seller.onboarding.subtitle')}
      back={{ to: '/seller', label: t('seller.nav.dashboard') }}
    >
      {onboarding?.status === 'REJECTED' && (
        <p className="seller-note seller-note--danger">
          <Icon name="alert" size={18} />
          <span>
            {t('seller.status.rejectedNote')}: <strong>{onboarding.reviewNote}</strong> — {t('seller.onboarding.fixAndResubmit')}
          </span>
        </p>
      )}

      <div className="wizard">
        <ol className="wizard__steps account-card">
          {STEPS.map((item, index) => {
            const done = progress[item];
            const reachable = item === 'shop' || Boolean(onboarding);
            return (
              <li key={item}>
                <button
                  type="button"
                  className={`wizard__step ${item === step ? 'wizard__step--active' : ''} ${done ? 'wizard__step--done' : ''}`}
                  aria-current={item === step ? 'step' : undefined}
                  disabled={!reachable}
                  onClick={() => setStep(item)}
                >
                  <span className="wizard__num">{done ? <Icon name="check" size={14} /> : index + 1}</span>
                  <span className="wizard__label">
                    {t(`seller.onboarding.steps.${item}`)}
                    <span className="cell-sub">{done ? t('seller.onboarding.done') : t(`seller.onboarding.stepHints.${item}`)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <section className="account-card wizard__panel" aria-labelledby="wizard-step-title">
          <p className="wizard__counter">{t('seller.onboarding.stepOf', { current: stepIndex + 1, total: STEPS.length })}</p>
          <h2 id="wizard-step-title" className="wizard__title">
            {t(`seller.onboarding.steps.${step}`)}
          </h2>
          <div className="wizard__body" key={`${step}-${onboarding?.updatedAt ?? 'new'}`}>
            {step === 'shop' && (
              <ShopStep
                onboarding={onboarding}
                saving={saving}
                onSave={(data) => run(() => (id ? updateShopProfile(id, data) : startOnboarding(data)), 'pickup')}
              />
            )}
            {step === 'pickup' && (
              <PickupStep onboarding={onboarding} saving={saving} onBack={backOf('pickup')} onSave={(data) => run(() => savePickupAddress(id, data), nextOf('pickup'))} />
            )}
            {step === 'shipping' && (
              <ShippingStep onboarding={onboarding} saving={saving} onBack={backOf('shipping')} onSave={(data) => run(() => configureShipping(id, data), nextOf('shipping'))} />
            )}
            {step === 'tax' && (
              <TaxStep onboarding={onboarding} saving={saving} onBack={backOf('tax')} onSave={(data) => run(() => saveTaxProfile(id, data), nextOf('tax'))} />
            )}
            {step === 'identity' && (
              <IdentityStep onboarding={onboarding} saving={saving} onBack={backOf('identity')} onSave={(data) => run(() => submitIdentity(id, data), nextOf('identity'))} />
            )}
            {step === 'policies' && (
              <PolicyStep
                policies={policies}
                progress={progress}
                saving={saving}
                onSubmit={submit}
                onBack={backOf('policies')}
                onGoto={setStep}
              />
            )}
          </div>
        </section>
      </div>
    </SellerPage>
  );
}

export default OnboardingScreen;
