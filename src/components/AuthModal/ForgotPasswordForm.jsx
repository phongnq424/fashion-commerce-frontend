import { useEffect, useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import Icon from '../common/Icon';
import PasswordField from './PasswordField';
import FormAlert from './FormAlert';
import { useLanguage } from '../../hooks/useLanguage';
import { requestPasswordResetOtp, resetPassword } from '../../services/authService';
import {
  serverErrorKey,
  validateEmail,
  validateNewPassword,
} from './validation';

function ForgotPasswordForm({ onSwitch }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [values, setValues] = useState({ otp: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const sendOtp = async (isResend = false) => {
    const error = validateEmail(email);
    setErrors({ email: error });
    if (error) return;

    if (isResend) setResending(true);
    else setSubmitting(true);
    setServerError('');

    try {
      const response = await requestPasswordResetOtp(email.trim());
      setChallenge(response);
      setSecondsLeft(response.resendAfter);
    } catch (requestError) {
      setServerError(serverErrorKey(requestError));
    } finally {
      setSubmitting(false);
      setResending(false);
    }
  };

  const handleRequest = async (event) => {
    event.preventDefault();
    await sendOtp();
  };

  const update = (field) => (event) => {
    const value = field === 'otp' ? event.target.value.replace(/\D/g, '').slice(0, 6) : event.target.value;
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setServerError('');
  };

  const handleReset = async (event) => {
    event.preventDefault();
    const nextErrors = {
      otp: /^\d{6}$/.test(values.otp) ? '' : 'auth.errors.otpRequired',
      password: validateNewPassword(values.password),
      confirmPassword:
        values.confirmPassword && values.confirmPassword === values.password
          ? ''
          : 'auth.errors.confirmMismatch',
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitting(true);
    setServerError('');
    try {
      await resetPassword({
        identifier: email.trim(),
        otp: values.otp,
        newPassword: values.password,
      });
      setCompleted(true);
    } catch (resetError) {
      setServerError(serverErrorKey(resetError));
    } finally {
      setSubmitting(false);
    }
  };

  const backToLogin = (
    <button type="button" className="auth-link auth-back" onClick={() => onSwitch('login')}>
      <Icon name="chevronLeft" size={16} />
      {t('auth.backToLogin')}
    </button>
  );

  if (completed) {
    return (
      <div className="auth-form">
        <p className="auth-success" role="status">
          <Icon name="check" size={20} />
          {t('auth.resetSuccess')}
        </p>
        {backToLogin}
      </div>
    );
  }

  if (!challenge) {
    return (
      <form className="auth-form" onSubmit={handleRequest} noValidate>
        <FormAlert message={serverError && t(serverError)} />
        <Input
          type="email"
          name="email"
          label={t('auth.email')}
          placeholder={t('auth.emailPlaceholder')}
          autoComplete="email"
          inputMode="email"
          autoFocus
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setErrors({});
            setServerError('');
          }}
          error={errors.email && t(errors.email)}
        />
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? t('auth.sending') : t('auth.forgotSubmit')}
        </Button>
        {backToLogin}
      </form>
    );
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <form className="auth-form" onSubmit={handleReset} noValidate>
      <p className="otp-sent">
        <Icon name="mail" size={18} />
        <span>{t('auth.resetOtpSent')}</span>
      </p>
      <FormAlert message={serverError && t(serverError)} />
      <Input
        type="text"
        name="otp"
        label={t('auth.otpLabel')}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        autoFocus
        value={values.otp}
        onChange={update('otp')}
        error={errors.otp && t(errors.otp)}
      />
      <PasswordField
        name="password"
        label={t('auth.newPassword')}
        placeholder={t('auth.newPasswordPlaceholder')}
        autoComplete="new-password"
        value={values.password}
        onChange={update('password')}
        hint={t('auth.newPasswordHint')}
        error={errors.password && t(errors.password)}
      />
      <PasswordField
        name="confirmPassword"
        label={t('auth.confirmPassword')}
        placeholder={t('auth.confirmPasswordPlaceholder')}
        autoComplete="new-password"
        value={values.confirmPassword}
        onChange={update('confirmPassword')}
        error={errors.confirmPassword && t(errors.confirmPassword)}
      />
      <Button type="submit" fullWidth disabled={submitting}>
        {submitting ? t('auth.resetting') : t('auth.resetSubmit')}
      </Button>
      <p className="otp-resend">
        {t('auth.otpNotReceived')}{' '}
        {secondsLeft > 0 ? (
          <span className="otp-resend__wait">{t('auth.otpResendIn', { time: `${mm}:${ss}` })}</span>
        ) : (
          <button type="button" className="auth-link auth-link--strong" onClick={() => sendOtp(true)} disabled={resending}>
            {resending ? t('auth.sending') : t('auth.otpResend')}
          </button>
        )}
      </p>
      <button type="button" className="auth-link auth-back" onClick={() => setChallenge(null)}>
        <Icon name="chevronLeft" size={16} />
        {t('auth.changeEmail')}
      </button>
    </form>
  );
}

export default ForgotPasswordForm;
