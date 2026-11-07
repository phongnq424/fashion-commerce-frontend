import { useId } from 'react';
import Icon from './Icon';
import './Select.css';

/**
 * Ô chọn (dropdown) có nhãn nhỏ nằm TRONG khung, mũi tên bên phải (kiểu trang thanh toán).
 * - label: nhãn (đã dịch)        - placeholder: dòng "Chọn ..." khi chưa chọn
 * - options: [{ id, name }]      - value / onChange(value) với value là id
 * - error: chuỗi lỗi (đã dịch). Có lỗi -> viền đỏ + icon + chữ
 */
function Select({ label, placeholder, options = [], value, onChange, error, id, className = '', ...rest }) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className={`select-field ${error ? 'select-field--error' : ''} ${className}`}>
      <div className="select-field__box">
        <label htmlFor={selectId} className="select-field__label">
          {label}
        </label>
        <select
          id={selectId}
          className="select-field__control"
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId}
          {...rest}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <span className="select-field__arrow" aria-hidden="true">
          <Icon name="chevronDown" size={18} />
        </span>
      </div>
      {error && (
        <p id={errorId} className="select-field__error" role="alert">
          <Icon name="alert" size={16} />
          {error}
        </p>
      )}
    </div>
  );
}

export default Select;
