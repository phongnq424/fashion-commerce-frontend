import { useId } from 'react';
import Icon from './Icon';
import './Input.css';

/**
 * Ô chọn (dropdown) CÙNG KIỂU với Input: nhãn nằm phía trên, cao bằng ô nhập.
 * Dùng trong form nhiều cột để các ô cùng hàng thẳng nhau.
 * - options: [{ id, name }]   - value / onChange(value) với value là id
 * - placeholder: dòng "Chọn ..." khi chưa chọn   - required: hiện * đỏ   - error / hint: như Input
 */
function FieldSelect({ label, placeholder, options = [], value, onChange, required = false, hint, error, id, className = '', ...rest }) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      <label htmlFor={selectId} className="field__label">
        {label}
        {required && (
          <span className="field__required" aria-hidden="true">
            {' '}*
          </span>
        )}
      </label>
      <div className="field__select-wrap">
        <select
          id={selectId}
          className="field__input field__select"
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          required={required}
          aria-required={required || undefined}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
          {...rest}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <span className="field__select-arrow" aria-hidden="true">
          <Icon name="chevronDown" size={18} />
        </span>
      </div>
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

export default FieldSelect;
