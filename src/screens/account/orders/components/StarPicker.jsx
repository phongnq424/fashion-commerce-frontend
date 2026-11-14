import { useId, useState } from 'react';
import Icon from '../../../../components/common/Icon';
import { useLanguage } from '../../../../hooks/useLanguage';

/**
 * Chọn số sao 1–5 (nhóm radio -> dùng phím mũi tên được). Rê chuột xem trước.
 * - value, onChange(number)
 */
function StarPicker({ value, onChange }) {
  const { t } = useLanguage();
  const name = useId();
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <fieldset className="star-picker" onMouseLeave={() => setHover(0)}>
      <legend className="field__label">{t('reviewForm.rating')}</legend>
      <div className="star-picker__row">
        {[1, 2, 3, 4, 5].map((star) => (
          <label key={star} className={`star-picker__star ${star <= shown ? 'star-picker__star--on' : ''}`} onMouseEnter={() => setHover(star)}>
            <input
              type="radio"
              name={name}
              value={star}
              checked={value === star}
              onChange={() => onChange(star)}
              className="visually-hidden"
            />
            <Icon name="star" size={32} filled={star <= shown} strokeWidth={1.4} />
            <span className="visually-hidden">{t('reviewForm.stars', { count: star })}</span>
          </label>
        ))}
        {shown > 0 && <span className="star-picker__text">{t(`reviewForm.levels.${shown}`)}</span>}
      </div>
    </fieldset>
  );
}

export default StarPicker;
