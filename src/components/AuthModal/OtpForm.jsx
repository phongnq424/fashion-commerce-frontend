import { useEffect, useRef, useState } from 'react';
import Button from '../common/Button';
import Icon from '../common/Icon';
import FormAlert from './FormAlert';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { serverErrorKey } from './validation';

const OTP_LENGTH = 6;

/**
 * Màn nhập mã OTP (bước 2 của đăng ký).
 * - pending: { pendingId, otpSentTo, expiresIn, resendAfter } do register() trả về
 * - onSuccess(user, 'register')   - onBack(): quay lại form đăng ký để sửa thông tin
 *
 * 6 ô, mỗi ô 1 số. Hỗ trợ: tự nhảy ô khi gõ, Backspace lùi ô, phím ← →,
 * dán cả 6 số một lần, và điện thoại tự gợi ý mã từ SMS (autoComplete="one-time-code").
 */
function OtpForm({ pending, onSuccess, onBack }) {
  const { t } = useLanguage();
  const { verifyRegistration, resendOtp } = useAuth();
  const [digits, setDigits] = useState(() => Array(OTP_LENGTH).fill(''));
  const [errorKey, setErrorKey] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(null);
  const [locked, setLocked] = useState(false); // nhập sai quá nhiều lần
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(pending.resendAfter);
  const inputsRef = useRef([]);

  // Đếm ngược tới lúc được bấm "Gửi lại mã"
  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  // Mở màn này -> con trỏ vào ô đầu tiên
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const focusBox = (index) => inputsRef.current[Math.max(0, Math.min(OTP_LENGTH - 1, index))]?.focus();

  const submit = async (code) => {
    if (code.length < OTP_LENGTH) {
      setErrorKey('auth.errors.otpRequired');
      return;
    }
    setSubmitting(true);
    setErrorKey('');
    try {
      const user = await verifyRegistration({ pendingId: pending.pendingId, code });
      onSuccess(user, 'register');
    } catch (error) {
      setErrorKey(serverErrorKey(error));
      setAttemptsLeft(error.attemptsLeft ?? null);
      if (error.code === 'OTP_TOO_MANY_ATTEMPTS') setLocked(true);
      // Sai mã -> xoá các ô để nhập lại từ đầu
      setDigits(Array(OTP_LENGTH).fill(''));
      focusBox(0);
    } finally {
      setSubmitting(false);
    }
  };

  // Ghi 1 hoặc nhiều số bắt đầu từ ô index (nhiều số = dán / tự điền từ SMS)
  const fillFrom = (index, text) => {
    const onlyDigits = text.replace(/\D/g, '');
    if (!onlyDigits) return;
    const next = [...digits];
    onlyDigits
      .slice(0, OTP_LENGTH - index)
      .split('')
      .forEach((digit, offset) => {
        next[index + offset] = digit;
      });
    setDigits(next);
    setErrorKey('');
    const code = next.join('');
    if (code.length === OTP_LENGTH && !next.includes('')) submit(code); // đủ 6 số -> tự gửi
    else focusBox(index + onlyDigits.length);
  };

  const handleChange = (index) => (event) => {
    const value = event.target.value;
    if (value === '') {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }
    fillFrom(index, value);
  };

  const handleKeyDown = (index) => (event) => {
    if (event.key === 'Backspace' && !digits[index]) {
      event.preventDefault();
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      focusBox(index - 1);
    }
    if (event.key === 'ArrowLeft') focusBox(index - 1);
    if (event.key === 'ArrowRight') focusBox(index + 1);
  };

  const handlePaste = (index) => (event) => {
    event.preventDefault();
    fillFrom(index, event.clipboardData.getData('text'));
  };

  const handleResend = async () => {
    setResending(true);
    setErrorKey('');
    try {
      const info = await resendOtp(pending.pendingId);
      setSecondsLeft(info.resendAfter);
      setDigits(Array(OTP_LENGTH).fill(''));
      setAttemptsLeft(null);
      setLocked(false);
      setResent(true);
      focusBox(0);
    } catch (error) {
      setErrorKey(serverErrorKey(error));
    } finally {
      setResending(false);
    }
  };

  const errorMessage = errorKey ? t(errorKey, { attempts: attemptsLeft ?? 0 }) : '';
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <form
      className="auth-form"
      onSubmit={(event) => {
        event.preventDefault();
        submit(digits.join(''));
      }}
      noValidate
    >
      <p className="otp-sent">
        <Icon name="phone" size={18} />
        <span>{t('auth.otpSentTo', { phone: pending.otpSentTo })}</span>
      </p>

      <FormAlert message={errorMessage} />
      {resent && !errorKey && (
        <p className="auth-success" role="status">
          <Icon name="check" size={18} />
          {t('auth.otpResent')}
        </p>
      )}

      {/* 6 ô nhập mã. fieldset + legend: trình đọc màn hình đọc "Mã xác thực, 6 chữ số" */}
      <fieldset className="otp-field">
        <legend className="visually-hidden">{t('auth.otpLabel')}</legend>
        <div className="otp-boxes">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              className={`otp-box ${errorKey ? 'otp-box--error' : ''}`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={index === 0 ? OTP_LENGTH : 1}
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              aria-label={t('auth.otpDigit', { index: index + 1, total: OTP_LENGTH })}
              aria-invalid={errorKey ? 'true' : undefined}
              value={digit}
              onChange={handleChange(index)}
              onKeyDown={handleKeyDown(index)}
              onPaste={handlePaste(index)}
              onFocus={(event) => event.target.select()}
              disabled={submitting || locked}
            />
          ))}
        </div>
      </fieldset>

      <Button type="submit" fullWidth disabled={submitting || locked}>
        {submitting ? t('auth.otpVerifying') : t('auth.otpSubmit')}
      </Button>

      {/* Gửi lại mã: khoá trong lúc đếm ngược */}
      <p className="otp-resend">
        {t('auth.otpNotReceived')}{' '}
        {secondsLeft > 0 ? (
          <span className="otp-resend__wait" aria-live="polite">
            {t('auth.otpResendIn', { time: `${mm}:${ss}` })}
          </span>
        ) : (
          <button type="button" className="auth-link auth-link--strong" onClick={handleResend} disabled={resending}>
            {resending ? t('auth.sending') : t('auth.otpResend')}
          </button>
        )}
      </p>

      <button type="button" className="auth-link auth-back" onClick={onBack}>
        <Icon name="chevronLeft" size={16} />
        {t('auth.otpChangeInfo')}
      </button>
    </form>
  );
}

export default OtpForm;
