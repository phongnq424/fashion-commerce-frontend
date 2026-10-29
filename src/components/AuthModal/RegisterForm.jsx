import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../common/Button';
import Input from '../common/Input';
import PasswordField from './PasswordField';
import GoogleButton from './GoogleButton';
import FormAlert from './FormAlert';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import {
  getPasswordStrength,
  serverErrorKey,
  validateEmail,
  validateNewPassword,
  validatePhone,
} from './validation';

const STRENGTH_KEYS = ['', 'weak', 'medium', 'strong'];

/**
 * Form đăng ký: họ tên, email, số điện thoại, mật khẩu (+ độ mạnh), nhập lại mật khẩu,
 * đồng ý điều khoản (bắt buộc), nhận tin (tuỳ chọn), Google.
 * - onOtpSent(pending, values): đã gửi OTP -> chuyển sang màn nhập mã
 * - onSuccess(user, 'google')   - onSwitch('login')
 * - initialValues: dữ liệu đã nhập trước đó (khi bấm "Đổi thông tin" từ màn OTP quay lại)
 */
function RegisterForm({ onSuccess, onOtpSent, onSwitch, onNavigate, initialValues }) {
  const { t } = useLanguage();
  const { register } = useAuth();
  const [values, setValues] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agree: false,
    newsletter: true,
    ...initialValues,
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const strength = getPasswordStrength(values.password);

  const update = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setServerError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {
      name: values.name.trim().length >= 2 ? '' : 'auth.errors.nameRequired',
      email: validateEmail(values.email),
      phone: validatePhone(values.phone),
      password: validateNewPassword(values.password),
      confirmPassword:
        values.confirmPassword && values.confirmPassword === values.password ? '' : 'auth.errors.confirmMismatch',
      agree: values.agree ? '' : 'auth.errors.termsRequired',
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitting(true);
    try {
      // Bước 1: gửi thông tin -> Backend gửi mã OTP qua SMS (chưa tạo tài khoản)
      const pending = await register({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.replace(/[\s.]/g, ''),
        password: values.password,
        newsletter: values.newsletter,
      });
      onOtpSent(pending, values);
    } catch (error) {
      setServerError(serverErrorKey(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <FormAlert message={serverError && t(serverError)} />

      <Input
        name="name"
        label={t('auth.fullName')}
        placeholder={t('auth.fullNamePlaceholder')}
        autoComplete="name"
        autoFocus
        value={values.name}
        onChange={update('name')}
        error={errors.name && t(errors.name)}
      />

      {/* Email + số điện thoại nằm 2 cột trên màn hình rộng */}
      <div className="auth-form__grid">
        <Input
          type="email"
          name="email"
          label={t('auth.email')}
          placeholder={t('auth.emailPlaceholder')}
          autoComplete="email"
          value={values.email}
          onChange={update('email')}
          error={errors.email && t(errors.email)}
        />
        <Input
          type="tel"
          name="phone"
          label={t('auth.phone')}
          placeholder={t('auth.phonePlaceholder')}
          autoComplete="tel"
          inputMode="tel"
          value={values.phone}
          onChange={update('phone')}
          error={errors.phone && t(errors.phone)}
        />
      </div>

      <PasswordField
        name="password"
        label={t('auth.password')}
        placeholder={t('auth.newPasswordPlaceholder')}
        autoComplete="new-password"
        value={values.password}
        onChange={update('password')}
        hint={t('auth.newPasswordHint')}
        error={errors.password && t(errors.password)}
      >
        {/* Thanh độ mạnh: 3 vạch + CHỮ (Yếu / Trung bình / Mạnh), không chỉ dựa vào màu */}
        {strength > 0 && (
          <div className={`password-strength password-strength--${STRENGTH_KEYS[strength]}`}>
            <span className="password-strength__bars" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="password-strength__label" aria-live="polite">
              {t('auth.strength.label')}: {t(`auth.strength.${STRENGTH_KEYS[strength]}`)}
            </span>
          </div>
        )}
      </PasswordField>

      <PasswordField
        name="confirmPassword"
        label={t('auth.confirmPassword')}
        placeholder={t('auth.confirmPasswordPlaceholder')}
        autoComplete="new-password"
        value={values.confirmPassword}
        onChange={update('confirmPassword')}
        error={errors.confirmPassword && t(errors.confirmPassword)}
      />

      <div className="auth-form__checks">
        <label className={`auth-check ${errors.agree ? 'auth-check--error' : ''}`}>
          <input
            type="checkbox"
            checked={values.agree}
            onChange={update('agree')}
            aria-invalid={errors.agree ? 'true' : undefined}
            aria-describedby={errors.agree ? 'agree-error' : undefined}
          />
          <span>
            {t('auth.agreePrefix')}{' '}
            <Link to="/policies/terms" className="auth-link auth-link--inline" onClick={onNavigate}>
              {t('auth.terms')}
            </Link>{' '}
            {t('auth.and')}{' '}
            <Link to="/policies/privacy" className="auth-link auth-link--inline" onClick={onNavigate}>
              {t('auth.privacy')}
            </Link>
          </span>
        </label>
        {errors.agree && (
          <p id="agree-error" className="field__error" role="alert">
            {t(errors.agree)}
          </p>
        )}

        <label className="auth-check">
          <input type="checkbox" checked={values.newsletter} onChange={update('newsletter')} />
          <span>{t('auth.newsletterOptIn')}</span>
        </label>
      </div>

      <Button type="submit" fullWidth disabled={submitting}>
        {submitting ? t('auth.registering') : t('auth.registerSubmit')}
      </Button>

      <p className="auth-divider">
        <span>{t('auth.or')}</span>
      </p>

      <GoogleButton
        disabled={submitting}
        onSuccess={(user) => onSuccess(user, 'google')}
        onError={(error) => setServerError(serverErrorKey(error))}
      />

      <p className="auth-switch">
        {t('auth.haveAccount')}{' '}
        <button type="button" className="auth-link auth-link--strong" onClick={() => onSwitch('login')}>
          {t('auth.loginLink')}
        </button>
      </p>
    </form>
  );
}

export default RegisterForm;
