import { useId } from 'react';
import Icon from './Icon';
import './Input.css';

/**
 * Ô nhập nhiều dòng, cùng kiểu với Input (label, gợi ý, lỗi, đếm ký tự).
 * - maxLength: có thì hiện "120/500" ở góc phải dưới
 */
function Textarea({ label, hint, error, id, className = '', value = '', maxLength, rows = 4, ...rest }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      <label htmlFor={inputId} className="field__label">
        {label}
      </label>
      <textarea
        id={inputId}
        className="field__input field__input--textarea"
        rows={rows}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        {...rest}
      />
      <div className="field__meta">
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
        {maxLength && (
          <span className="field__count" aria-hidden="true">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}

export default Textarea;
