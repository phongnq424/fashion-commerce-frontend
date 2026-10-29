import { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import PasswordField from './PasswordField';
import GoogleButton from './GoogleButton';
import FormAlert from './FormAlert';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { serverErrorKey, validateIdentifier } from './validation';

/**
 * Form đăng nhập: email HOẶC số điện thoại, mật khẩu, ghi nhớ, quên mật khẩu, Google.
 * - onSuccess(user, 'login' | 'google')   - onSwitch('register' | 'forgot')
 */
function LoginForm({ onSuccess, onSwitch }) {
  const { t } = useLanguage();
  const { login } = useAuth();
  const [values, setValues] = useState({ identifier: '', password: '', remember: true });
  const [errors, setErrors] = useState({}); // { identifier: 'auth.errors...', password: '...' }
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setServerError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {
      identifier: validateIdentifier(values.identifier),
      password: values.password ? '' : 'auth.errors.passwordRequired',
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitting(true);
    try {
      const user = await login({ ...values, identifier: values.identifier.trim() });
      onSuccess(user, 'login');
    } catch (error) {
      setServerError(serverErrorKey(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <FormAlert message={serverError && t(serverError)} />

      {/* 1 ô nhận cả email lẫn số điện thoại */}
      <Input
        type="text"
        name="identifier"
        label={t('auth.identifier')}
        placeholder={t('auth.identifierPlaceholder')}
        autoComplete="username"
        autoFocus
        value={values.identifier}
        onChange={update('identifier')}
        error={errors.identifier && t(errors.identifier)}
      />

      <PasswordField
        name="password"
        label={t('auth.password')}
        placeholder={t('auth.passwordPlaceholder')}
        autoComplete="current-password"
        value={values.password}
        onChange={update('password')}
        error={errors.password && t(errors.password)}
      />

      <div className="auth-form__row">
        <label className="auth-check">
          <input type="checkbox" checked={values.remember} onChange={update('remember')} />
          <span>{t('auth.remember')}</span>
        </label>
        <button type="button" className="auth-link" onClick={() => onSwitch('forgot')}>
          {t('auth.forgotLink')}
        </button>
      </div>

      <Button type="submit" fullWidth disabled={submitting}>
        {submitting ? t('auth.loggingIn') : t('auth.loginSubmit')}
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
        {t('auth.noAccount')}{' '}
        <button type="button" className="auth-link auth-link--strong" onClick={() => onSwitch('register')}>
          {t('auth.registerLink')}
        </button>
      </p>
    </form>
  );
}

export default LoginForm;
