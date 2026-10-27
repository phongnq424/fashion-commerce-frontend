import { useId } from 'react';
import Icon from './Icon';
import './Input.css';

/**
 * Ô nhập liệu có label, gợi ý và thông báo lỗi.
 * - hideLabel: ẩn label khỏi mắt nhưng vẫn giữ cho trình đọc màn hình (dùng cho SearchBar)
 * - error: chuỗi lỗi (đã dịch). Có lỗi -> viền đỏ + icon + chữ, không chỉ dựa vào màu.
 */
function Input({ label, hideLabel = false, hint, error, id, className = '', ...rest }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      <label htmlFor={inputId} className={hideLabel ? 'visually-hidden' : 'field__label'}>
        {label}
      </label>
      <input
        id={inputId}
        className="field__input"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
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

export default Input;
