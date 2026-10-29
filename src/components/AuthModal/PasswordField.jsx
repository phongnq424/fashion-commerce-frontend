import { useId, useState } from 'react';
import Icon from '../common/Icon';
import { useLanguage } from '../../hooks/useLanguage';
import '../common/Input.css';

/**
 * Ô mật khẩu có nút 👁 hiện / ẩn. Dùng chung kiểu (class) với components/common/Input.jsx.
 * - error: câu lỗi đã dịch | hint: gợi ý | children: phần thêm bên dưới (vd thanh độ mạnh)
 */
function PasswordField({ label, error, hint, id, className = '', children, ...rest }) {
  const { t } = useLanguage();
  const autoId = useId();
  const inputId = id ?? autoId;
  const [visible, setVisible] = useState(false);
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      <label htmlFor={inputId} className="field__label">
        {label}
      </label>
      <div className="password-field">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          className="field__input password-field__input"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        <button
          type="button"
          className="password-field__toggle"
          onClick={() => setVisible((value) => !value)}
          aria-pressed={visible}
          aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
        </button>
      </div>
      {children}
      {hint && !error && (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field__error" role="alert">
          <Icon name="alert" size={16} />
          {error}
        </p>
      )}
    </div>
  );
}

export default PasswordField;
