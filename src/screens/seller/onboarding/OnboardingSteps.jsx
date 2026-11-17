import { useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import Input from '../../../components/common/Input';
import FieldSelect from '../../../components/common/FieldSelect';
import Textarea from '../../../components/common/Textarea';
import { useLanguage } from '../../../hooks/useLanguage';
import { getProvinces } from '../../../services/locationService';
import { BUSINESS_TYPES } from '../../../services/seller/onboardingService';

// =====================================================================
// 6 BƯỚC ĐĂNG KÝ BÁN HÀNG. Mỗi bước: form riêng, bấm "Lưu & tiếp tục" -> onSave(dữ liệu đúng dạng request backend).
// Quy tắc kiểm tra lấy từ validation của backend (SellerOnboardingDtos.java).
// =====================================================================

const PHONE = /^\+?[0-9]{8,15}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL = /^(https?:\/\/|\/)\S+$/i;
const clean = (value) => String(value ?? '').replace(/[\s.]/g, '');

function useProvinces() {
  const [provinces, setProvinces] = useState([]);
  useEffect(() => {
    getProvinces().then(setProvinces).catch(() => setProvinces([]));
  }, []);
  return provinces;
}

// Dòng nhắc "Ô có dấu * là bắt buộc" ở đầu mỗi bước
function RequiredNote() {
  const { t } = useLanguage();
  return (
    <p className="account-muted wizard__required-note">
      <span className="field__required">*</span> {t('market.onboarding.requiredNote')}
    </p>
  );
}

function StepFooter({ saving, onBack, label }) {
  const { t } = useLanguage();
  return (
    <div className="seller-form__actions wizard__footer">
      {onBack && (
        <Button variant="ghost" onClick={onBack}>
          <Icon name="chevronLeft" size={16} />
          {t('seller.onboarding.back')}
        </Button>
      )}
      <Button type="submit" disabled={saving}>
        {saving ? t('common.saving') : label ?? t('seller.onboarding.saveNext')}
      </Button>
    </div>
  );
}

// Ô nhập link ảnh + ảnh xem trước (chưa có API upload)
function ImageField({ label, hint, value, onChange, error, ratio = 'square', required = false }) {
  return (
    <div className="image-field">
      <Input label={label} hint={hint} required={required} value={value} onChange={(e) => onChange(e.target.value)} error={error} placeholder="https://..." />
      <span className={`image-field__preview image-field__preview--${ratio}`}>
        {URL.test(value ?? '') ? <img src={value} alt="" /> : <Icon name="image" size={22} />}
      </span>
    </div>
  );
}

export { ImageField };

// ---------- Bước 1: Thông tin shop ----------
export function ShopStep({ onboarding, saving, onSave }) {
  const { t } = useLanguage();
  const shop = onboarding?.shop;
  const [form, setForm] = useState({
    name: shop?.name ?? '',
    email: shop?.email ?? '',
    phone: shop?.phone ?? '',
    avatarKey: shop?.avatarKey ?? '',
    coverKey: shop?.coverKey ?? '',
    description: shop?.description ?? '',
  });
  const [errors, setErrors] = useState({});
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = t('seller.errors.required');
    if (!EMAIL.test(form.email.trim())) next.email = t('seller.errors.email');
    if (!PHONE.test(clean(form.phone))) next.phone = t('seller.errors.phone');
    if (form.avatarKey && !URL.test(form.avatarKey)) next.avatarKey = t('seller.errors.url');
    if (form.coverKey && !URL.test(form.coverKey)) next.coverKey = t('seller.errors.url');
    setErrors(next);
    if (Object.keys(next).length === 0) onSave({ ...form, phone: clean(form.phone) });
  };

  return (
    <form className="seller-form" onSubmit={submit} noValidate>
      <RequiredNote />
      <Input required label={t('seller.fields.shopName')} value={form.name} maxLength={160} onChange={(e) => set('name')(e.target.value)} error={errors.name} />
      <div className="seller-form__row">
        <Input required label={t('seller.fields.email')} type="email" value={form.email} onChange={(e) => set('email')(e.target.value)} error={errors.email} />
        <Input required label={t('seller.fields.phone')} inputMode="tel" value={form.phone} onChange={(e) => set('phone')(e.target.value)} error={errors.phone} />
      </div>
      <div className="seller-form__row">
        <ImageField label={t('seller.fields.avatar')} hint={t('seller.fields.imageHint')} value={form.avatarKey} onChange={set('avatarKey')} error={errors.avatarKey} />
        <ImageField label={t('seller.fields.cover')} hint={t('seller.fields.imageHint')} value={form.coverKey} onChange={set('coverKey')} error={errors.coverKey} ratio="wide" />
      </div>
      <Textarea label={t('seller.fields.description')} value={form.description} maxLength={5000} rows={4} onChange={(e) => set('description')(e.target.value)} />
      <StepFooter saving={saving} />
    </form>
  );
}

// ---------- Bước 2: Địa chỉ lấy hàng ----------
export function PickupStep({ onboarding, saving, onSave, onBack }) {
  const { t } = useLanguage();
  const provinces = useProvinces();
  const current = onboarding?.pickupAddresses?.[0];
  const [form, setForm] = useState({
    contactName: current?.contactName ?? '',
    contactPhone: current?.contactPhone ?? onboarding?.shop?.phone ?? '',
    provinceCode: current?.provinceCode ?? '',
    provinceName: current?.provinceName ?? '',
    wardName: current?.wardName ?? '',
    addressDetail: current?.addressDetail ?? '',
  });
  const [errors, setErrors] = useState({});
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    const next = {};
    if (!form.contactName.trim()) next.contactName = t('seller.errors.required');
    if (!PHONE.test(clean(form.contactPhone))) next.contactPhone = t('seller.errors.phone');
    if (!form.provinceName) next.provinceName = t('seller.errors.required');
    if (!form.wardName.trim()) next.wardName = t('seller.errors.required');
    if (!form.addressDetail.trim()) next.addressDetail = t('seller.errors.required');
    setErrors(next);
    if (Object.keys(next).length === 0) onSave({ ...form, contactPhone: clean(form.contactPhone), wardCode: null, defaultPickup: true });
  };

  return (
    <form className="seller-form" onSubmit={submit} noValidate>
      <p className="seller-note">
        <Icon name="info" size={18} />
        <span>{t('seller.onboarding.pickupNote')}</span>
      </p>
      <RequiredNote />
      <div className="seller-form__row">
        <Input required label={t('seller.fields.contactName')} placeholder={t('market.onboarding.placeholders.contactName')} value={form.contactName} onChange={(e) => set('contactName')(e.target.value)} error={errors.contactName} />
        <Input required label={t('seller.fields.phone')} inputMode="tel" value={form.contactPhone} onChange={(e) => set('contactPhone')(e.target.value)} error={errors.contactPhone} />
      </div>
      <div className="seller-form__row">
        <FieldSelect
          required
          label={t('seller.fields.province')}
          placeholder={t('addresses.choose')}
          options={provinces}
          value={provinces.find((p) => p.name === form.provinceName)?.id ?? ''}
          onChange={(id) => {
            const province = provinces.find((p) => p.id === id);
            setForm((f) => ({ ...f, provinceCode: id, provinceName: province?.name ?? '' }));
          }}
          error={errors.provinceName}
        />
        <Input required label={t('seller.fields.ward')} placeholder={t('market.onboarding.placeholders.ward')} value={form.wardName} onChange={(e) => set('wardName')(e.target.value)} error={errors.wardName} />
      </div>
      <Input required label={t('seller.fields.addressDetail')} placeholder={t('market.onboarding.placeholders.addressDetail')} value={form.addressDetail} onChange={(e) => set('addressDetail')(e.target.value)} error={errors.addressDetail} />
      <StepFooter saving={saving} onBack={onBack} />
    </form>
  );
}

// ---------- Bước 3: Đơn vị vận chuyển ----------
export function ShippingStep({ onboarding, saving, onSave, onBack }) {
  const { t } = useLanguage();
  const [enabled, setEnabled] = useState(() => new Set(onboarding.shippingProviders.filter((p) => p.enabled).map((p) => p.code)));
  const [error, setError] = useState('');
  const pickup = onboarding.pickupAddresses[0];

  const submit = (event) => {
    event.preventDefault();
    if (!pickup) return setError(t('seller.onboarding.needPickup'));
    if (enabled.size === 0) return setError(t('seller.errors.providerRequired'));
    setError('');
    onSave({ pickupAddressId: pickup.id, providers: onboarding.shippingProviders.map((p) => ({ providerCode: p.code, enabled: enabled.has(p.code) })) });
  };

  return (
    <form className="seller-form" onSubmit={submit} noValidate>
      <p className="account-muted">
        {t('seller.onboarding.shippingNote')} <span className="field__required">*</span> {t('market.onboarding.chooseOneCarrier')}
      </p>
      <div className="check-cards">
        {onboarding.shippingProviders.map((provider) => (
          <label key={provider.code} className="check-card">
            <input
              type="checkbox"
              checked={enabled.has(provider.code)}
              disabled={!provider.available}
              onChange={() =>
                setEnabled((current) => {
                  const next = new Set(current);
                  if (next.has(provider.code)) next.delete(provider.code);
                  else next.add(provider.code);
                  return next;
                })
              }
            />
            <span className="check-card__text">
              <strong>{provider.name}</strong>
              <span className="account-muted">{provider.description}</span>
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p className="field__error" role="alert">
          <Icon name="alert" size={16} />
          {error}
        </p>
      )}
      <StepFooter saving={saving} onBack={onBack} />
    </form>
  );
}

// ---------- Bước 4: Thông tin thuế ----------
export function TaxStep({ onboarding, saving, onSave, onBack }) {
  const { t } = useLanguage();
  const provinces = useProvinces();
  const tax = onboarding.taxProfile;
  const [form, setForm] = useState({
    businessType: tax?.businessType ?? 'INDIVIDUAL',
    legalName: tax?.legalName ?? '',
    businessName: tax?.businessName ?? '',
    legalRepresentativeName: tax?.legalRepresentativeName ?? '',
    taxCode: tax?.taxCode ?? '',
    businessRegistrationNumber: tax?.businessRegistrationNumber ?? '',
    issuedDate: tax?.issuedDate ?? '',
    issuedBy: tax?.issuedBy ?? '',
    provinceName: tax?.registeredAddress?.provinceName ?? onboarding.pickupAddresses[0]?.provinceName ?? '',
    wardName: tax?.registeredAddress?.wardName ?? onboarding.pickupAddresses[0]?.wardName ?? '',
    addressDetail: tax?.registeredAddress?.addressDetail ?? onboarding.pickupAddresses[0]?.addressDetail ?? '',
    invoiceEmail: tax?.invoiceEmail ?? onboarding.shop?.email ?? '',
    registrationDocumentKey: tax?.registrationDocumentKey ?? '',
  });
  const [errors, setErrors] = useState({});
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const type = form.businessType;
  const business = type !== 'INDIVIDUAL';

  const submit = (event) => {
    event.preventDefault();
    const next = {};
    const need = (key) => {
      if (!String(form[key] ?? '').trim()) next[key] = t('seller.errors.required');
    };
    if (type === 'ENTERPRISE') need('legalRepresentativeName');
    else need('legalName');
    if (business) ['businessName', 'businessRegistrationNumber', 'issuedDate', 'issuedBy', 'registrationDocumentKey'].forEach(need);
    if (!/^[0-9A-Za-z-]{8,32}$/.test(form.taxCode.trim())) next.taxCode = t('seller.errors.taxCode');
    if (!EMAIL.test(form.invoiceEmail.trim())) next.invoiceEmail = t('seller.errors.email');
    ['provinceName', 'wardName', 'addressDetail'].forEach(need);
    setErrors(next);
    if (Object.keys(next).length) return;
    const opt = (value) => (business && String(value ?? '').trim() ? String(value).trim() : null);
    onSave({
      businessType: type,
      legalName: type === 'ENTERPRISE' ? null : form.legalName.trim(),
      businessName: opt(form.businessName),
      legalRepresentativeName: type === 'ENTERPRISE' ? form.legalRepresentativeName.trim() : null,
      taxCode: form.taxCode.trim(),
      businessRegistrationNumber: opt(form.businessRegistrationNumber),
      issuedDate: business ? form.issuedDate : null,
      issuedBy: opt(form.issuedBy),
      registeredAddress: { provinceCode: null, provinceName: form.provinceName, wardCode: null, wardName: form.wardName.trim(), addressDetail: form.addressDetail.trim() },
      invoiceEmail: form.invoiceEmail.trim(),
      registrationDocumentKey: opt(form.registrationDocumentKey),
    });
  };

  return (
    <form className="seller-form" onSubmit={submit} noValidate>
      <RequiredNote />
      <fieldset className="check-cards check-cards--row">
        <legend className="field__label">
          {t('seller.fields.businessType')}
          <span className="field__required" aria-hidden="true"> *</span>
        </legend>
        {BUSINESS_TYPES.map((value) => (
          <label key={value} className="check-card">
            <input type="radio" name="business-type" checked={type === value} onChange={() => set('businessType')(value)} />
            <span className="check-card__text">
              <strong>{t(`seller.businessTypes.${value}.title`)}</strong>
              <span className="account-muted">{t(`seller.businessTypes.${value}.hint`)}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="seller-form__row">
        {type === 'ENTERPRISE' ? (
          <Input required label={t('seller.fields.legalRepresentative')} value={form.legalRepresentativeName} onChange={(e) => set('legalRepresentativeName')(e.target.value)} error={errors.legalRepresentativeName} />
        ) : (
          <Input required label={t(type === 'INDIVIDUAL' ? 'seller.fields.legalName' : 'seller.fields.householdOwner')} value={form.legalName} onChange={(e) => set('legalName')(e.target.value)} error={errors.legalName} />
        )}
        <Input required label={t('seller.fields.taxCode')} value={form.taxCode} onChange={(e) => set('taxCode')(e.target.value)} error={errors.taxCode} hint={t('seller.fields.taxCodeHint')} />
      </div>
      {business && (
        <>
          <div className="seller-form__row">
            <Input required label={t('seller.fields.businessName')} value={form.businessName} onChange={(e) => set('businessName')(e.target.value)} error={errors.businessName} />
            <Input required label={t('seller.fields.registrationNumber')} value={form.businessRegistrationNumber} onChange={(e) => set('businessRegistrationNumber')(e.target.value)} error={errors.businessRegistrationNumber} />
          </div>
          <div className="seller-form__row">
            <Input required label={t('seller.fields.issuedDate')} type="date" value={form.issuedDate} onChange={(e) => set('issuedDate')(e.target.value)} error={errors.issuedDate} />
            <Input required label={t('seller.fields.issuedBy')} value={form.issuedBy} onChange={(e) => set('issuedBy')(e.target.value)} error={errors.issuedBy} />
          </div>
          <ImageField required label={t('seller.fields.registrationDocument')} hint={t('seller.fields.imageHint')} value={form.registrationDocumentKey} onChange={set('registrationDocumentKey')} error={errors.registrationDocumentKey} ratio="wide" />
        </>
      )}
      <h3 className="wizard__section-title">{t('seller.fields.registeredAddress')}</h3>
      <div className="seller-form__row">
        <FieldSelect
          required
          label={t('seller.fields.province')}
          placeholder={t('addresses.choose')}
          options={provinces}
          value={provinces.find((p) => p.name === form.provinceName)?.id ?? ''}
          onChange={(id) => set('provinceName')(provinces.find((p) => p.id === id)?.name ?? '')}
          error={errors.provinceName}
        />
        <Input required label={t('seller.fields.ward')} placeholder={t('market.onboarding.placeholders.ward')} value={form.wardName} onChange={(e) => set('wardName')(e.target.value)} error={errors.wardName} />
      </div>
      <Input required label={t('seller.fields.addressDetail')} placeholder={t('market.onboarding.placeholders.addressDetail')} value={form.addressDetail} onChange={(e) => set('addressDetail')(e.target.value)} error={errors.addressDetail} />
      <Input required label={t('seller.fields.invoiceEmail')} type="email" value={form.invoiceEmail} onChange={(e) => set('invoiceEmail')(e.target.value)} error={errors.invoiceEmail} />
      <StepFooter saving={saving} onBack={onBack} />
    </form>
  );
}

// ---------- Bước 5: Định danh CCCD ----------
export function IdentityStep({ onboarding, saving, onSave, onBack }) {
  const { t } = useLanguage();
  const tax = onboarding.taxProfile;
  const expected = tax ? (tax.businessType === 'ENTERPRISE' ? tax.legalRepresentativeName : tax.legalName) : '';
  const id = onboarding.identityVerification;
  const [form, setForm] = useState({
    legalName: id?.legalName ?? expected ?? '',
    documentNumberLast4: id?.documentNumberLast4 ?? '',
    frontDocumentKey: id?.frontDocumentKey ?? '',
    backDocumentKey: id?.backDocumentKey ?? '',
    selfieDocumentKey: id?.selfieDocumentKey ?? '',
  });
  const [errors, setErrors] = useState({});
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    const next = {};
    if (!form.legalName.trim()) next.legalName = t('seller.errors.required');
    if (!/^[0-9]{4}$/.test(form.documentNumberLast4)) next.documentNumberLast4 = t('seller.errors.last4');
    ['frontDocumentKey', 'backDocumentKey', 'selfieDocumentKey'].forEach((key) => {
      if (!URL.test(form[key])) next[key] = t('seller.errors.url');
    });
    setErrors(next);
    if (Object.keys(next).length === 0) onSave({ ...form, legalName: form.legalName.trim() });
  };

  if (!tax) {
    return (
      <p className="seller-note seller-note--warning">
        <Icon name="alert" size={18} />
        <span>{t('seller.onboarding.needTax')}</span>
      </p>
    );
  }

  return (
    <form className="seller-form" onSubmit={submit} noValidate>
      <p className="seller-note">
        <Icon name="shield" size={18} />
        <span>{t('seller.onboarding.identityNote', { name: expected })}</span>
      </p>
      <RequiredNote />
      <div className="seller-form__row">
        <Input required label={t('seller.fields.idName')} value={form.legalName} onChange={(e) => set('legalName')(e.target.value)} error={errors.legalName} />
        <Input required label={t('seller.fields.idLast4')} inputMode="numeric" maxLength={4} value={form.documentNumberLast4} onChange={(e) => set('documentNumberLast4')(e.target.value.replace(/\D/g, ''))} error={errors.documentNumberLast4} hint={t('seller.fields.idLast4Hint')} />
      </div>
      <h3 className="wizard__section-title">{t('market.onboarding.idImages')}</h3>
      {/* Mỗi ảnh 1 hàng: ô link + khung xem trước CÙNG kích thước, cao bằng ô nhập -> 3 hàng thẳng nhau */}
      <div className="image-field-list">
        <ImageField required label={t('seller.fields.idFront')} value={form.frontDocumentKey} onChange={set('frontDocumentKey')} error={errors.frontDocumentKey} ratio="card" />
        <ImageField required label={t('seller.fields.idBack')} value={form.backDocumentKey} onChange={set('backDocumentKey')} error={errors.backDocumentKey} ratio="card" />
        <ImageField required label={t('seller.fields.selfie')} value={form.selfieDocumentKey} onChange={set('selfieDocumentKey')} error={errors.selfieDocumentKey} ratio="card" />
      </div>
      <StepFooter saving={saving} onBack={onBack} />
    </form>
  );
}

// ---------- Bước 6: Chính sách & gửi duyệt ----------
// Tích / bỏ tích tự do. Chỉ khi bấm "Gửi hồ sơ duyệt" mới gửi các chính sách đã tích lên Backend
// (POST policy-acceptances, Backend không có API rút lại đồng ý) rồi mới gửi duyệt.
export function PolicyStep({ policies, progress, saving, onSubmit, onBack, onGoto }) {
  const { t } = useLanguage();
  const [checked, setChecked] = useState(() => new Set(policies.filter((p) => p.accepted).map((p) => p.version)));
  // Danh sách chính sách tải xong sau khi mở bước -> lấy lại các mục đã đồng ý trước đó
  useEffect(() => {
    setChecked((current) => new Set([...current, ...policies.filter((p) => p.accepted).map((p) => p.version)]));
  }, [policies]);
  const missing = Object.entries(progress).filter(([step, ok]) => !ok && step !== 'policies').map(([step]) => step);
  const requiredOk = policies.filter((p) => p.required).every((p) => checked.has(p.version));
  const toggle = (version) =>
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(version)) next.delete(version);
      else next.add(version);
      return next;
    });

  return (
    <div className="seller-form">
      <p className="account-muted">
        {t('market.onboarding.policyHint')} <span className="field__required">*</span> {t('market.onboarding.policyRequired')}
      </p>
      <div className="check-cards">
        {policies.map((policy) => (
          <label key={policy.version} className="check-card">
            <input type="checkbox" checked={checked.has(policy.version)} disabled={saving} onChange={() => toggle(policy.version)} />
            <span className="check-card__text">
              <strong>
                {policy.title}
                {policy.required && <span className="field__required"> *</span>}
                {!policy.required && <span className="account-muted"> ({t('market.onboarding.optional')})</span>}
              </strong>
              <span className="account-muted">{t('seller.onboarding.policyVersion', { version: policy.version })}</span>
            </span>
          </label>
        ))}
      </div>
      {!requiredOk && policies.length > 0 && (
        <p className="field__error" role="alert">
          <Icon name="alert" size={16} />
          {t('market.onboarding.acceptRequired')}
        </p>
      )}
      {missing.length > 0 && (
        <div className="seller-note seller-note--warning">
          <Icon name="alert" size={18} />
          <span>
            {t('seller.onboarding.missing')}{' '}
            {missing.map((step, i) => (
              <span key={step}>
                {i > 0 && ', '}
                <button type="button" className="text-btn" onClick={() => onGoto(step)}>
                  {t(`seller.onboarding.steps.${step}`)}
                </button>
              </span>
            ))}
          </span>
        </div>
      )}
      <div className="seller-form__actions wizard__footer">
        <Button variant="ghost" onClick={onBack}>
          <Icon name="chevronLeft" size={16} />
          {t('seller.onboarding.back')}
        </Button>
        <Button onClick={() => onSubmit([...checked])} disabled={saving || missing.length > 0 || !requiredOk}>
          {saving ? t('common.saving') : t('seller.onboarding.submit')}
        </Button>
      </div>
    </div>
  );
}