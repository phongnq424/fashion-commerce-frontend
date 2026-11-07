import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import AddressFields from './AddressFields';
import { useLanguage } from '../../../hooks/useLanguage';
import { validatePhone } from '../../../components/AuthModal/validation';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Kiểm tra form giao hàng. Trả về { tênÔ: 'key lỗi' } (giao diện dịch bằng t)
function validateShipping(value) {
  const errors = {};
  if (value.fullName.trim().length < 2) errors.fullName = 'auth.errors.nameRequired';
  // Email KHÔNG bắt buộc, nhưng đã nhập thì phải đúng định dạng
  if (value.email.trim() && !EMAIL_PATTERN.test(value.email.trim())) errors.email = 'auth.errors.emailInvalid';
  const phoneError = validatePhone(value.phone);
  if (phoneError) errors.phone = phoneError;
  if (!value.address.trim()) errors.address = 'checkout.errors.addressRequired';
  if (!value.provinceId) errors.provinceId = 'checkout.errors.provinceRequired';
  if (!value.districtId) errors.districtId = 'checkout.errors.districtRequired';
  if (!value.wardId) errors.wardId = 'checkout.errors.wardRequired';
  return errors;
}

/**
 * Bước 1: Thông tin giao hàng.
 * - value / onChange(nextValue): dữ liệu form do CheckoutScreen giữ (để quay lại không mất)
 * - onSubmit(): gọi khi form hợp lệ -> sang bước thanh toán
 * - user: null = chưa đăng nhập -> hiện dòng "Bạn đã có tài khoản? Đăng nhập"
 * - onLogin(): mở popup đăng nhập
 */
function ShippingForm({ value, onChange, onSubmit, user, onLogin }) {
  const { t } = useLanguage();
  const formRef = useRef(null);
  const [errors, setErrors] = useState({});

  // Đổi 1 hoặc nhiều ô -> xoá lỗi của các ô đó
  const update = (patch) => {
    onChange({ ...value, ...patch });
    setErrors((current) => {
      const next = { ...current };
      Object.keys(patch).forEach((key) => delete next[key]);
      return next;
    });
  };

  const field = (name) => ({
    value: value[name],
    onChange: (event) => update({ [name]: event.target.value }),
    error: errors[name] ? t(errors[name]) : undefined,
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validateShipping(value);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      // Đưa con trỏ tới ô lỗi đầu tiên (đợi React vẽ xong viền đỏ)
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    onSubmit();
  };

  return (
    <section className="checkout-section" aria-labelledby="shipping-title">
      <h1 id="shipping-title" className="checkout-section__title">
        {t('checkout.stepShipping')}
      </h1>

      {user ? (
        <p className="checkout-section__account">{t('checkout.greeting', { name: user.name })}</p>
      ) : (
        <p className="checkout-section__account">
          {t('checkout.haveAccount')}{' '}
          <button type="button" className="checkout-link" onClick={onLogin}>
            {t('checkout.login')}
          </button>
        </p>
      )}

      <form ref={formRef} className="shipping-form" onSubmit={handleSubmit} noValidate>
        <Input floating label={t('checkout.fullName')} autoComplete="name" {...field('fullName')} />

        <div className="shipping-form__row shipping-form__row--contact">
          <Input floating type="email" label={t('checkout.email')} autoComplete="email" {...field('email')} />
          <Input floating type="tel" label={t('checkout.phone')} autoComplete="tel" inputMode="tel" {...field('phone')} />
        </div>

        <Input floating label={t('checkout.address')} autoComplete="street-address" {...field('address')} />

        <AddressFields
          value={value}
          onChange={update}
          errors={{
            provinceId: errors.provinceId && t(errors.provinceId),
            districtId: errors.districtId && t(errors.districtId),
            wardId: errors.wardId && t(errors.wardId),
          }}
        />

        <div className="checkout-actions">
          <Link to="/cart" className="checkout-link checkout-actions__back">
            <Icon name="chevronLeft" size={16} />
            {t('checkout.backToCart')}
          </Link>
          <Button type="submit" className="checkout-actions__next">
            {t('checkout.continueToPayment')}
          </Button>
        </div>
      </form>
    </section>
  );
}

export default ShippingForm;
