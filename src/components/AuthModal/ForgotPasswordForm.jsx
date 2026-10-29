import { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import Icon from '../common/Icon';
import FormAlert from './FormAlert';
import { useLanguage } from '../../hooks/useLanguage';
import { requestPasswordReset } from '../../services/authService';
import { serverErrorKey, validateEmail } from './validation';

/**
 * Quên mật khẩu: nhập email -> gửi link đặt lại -> báo đã gửi.
 * - onSwitch('login')
 */
function ForgotPasswordForm({ onSwitch }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [errorKey, setErrorKey] = useState('');
  const [serverError, setServerError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const error = validateEmail(email);
    setErrorKey(error);
    if (error) return;

    setSubmitting(true);
    try {
      await requestPasswordReset({ email: email.trim() });
      setSentTo(email.trim());
    } catch (err) {
      setServerError(serverErrorKey(err));
    } finally {
      setSubmitting(false);
    }
  };

  const backLink = (
    <button type="button" className="auth-link auth-back" onClick={() => onSwitch('login')}>
      <Icon name="chevronLeft" size={16} />
      {t('auth.backToLogin')}
    </button>
  );

  if (sentTo) {
    return (
      <div className="auth-form">
        <p className="auth-success" role="status">
          <Icon name="check" size={20} />
          {t('auth.forgotSuccess', { email: sentTo })}
        </p>
        {backLink}
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <FormAlert message={serverError && t(serverError)} />
      <Input
        type="email"
        name="email"
        label={t('auth.email')}
        placeholder={t('auth.emailPlaceholder')}
        autoComplete="email"
        autoFocus
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          setErrorKey('');
          setServerError('');
        }}
        error={errorKey && t(errorKey)}
      />
      <Button type="submit" fullWidth disabled={submitting}>
        {submitting ? t('auth.sending') : t('auth.forgotSubmit')}
      </Button>
      {backLink}
    </form>
  );
}

export default ForgotPasswordForm;
