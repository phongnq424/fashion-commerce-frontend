import { useState } from 'react';
import Icon from '../../../../components/common/Icon';
import { useLanguage } from '../../../../hooks/useLanguage';

/**
 * Thêm ảnh bằng ĐƯỜNG LINK (backend chưa có API upload — contract cho phép gửi URL http/https
 * vào các field *Key, ví dụ ảnh đã tải lên Cloudinary).
 * - value: string[]   - onChange(string[])   - max: số ảnh tối đa (backend: 8)
 */
function ImageUrlField({ label, hint, value, onChange, max = 8 }) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const add = () => {
    const url = draft.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) {
      setError(t('reviewForm.imageInvalid'));
      return;
    }
    if (value.includes(url)) {
      setDraft('');
      return;
    }
    onChange([...value, url]);
    setDraft('');
    setError('');
  };

  return (
    <div className="field">
      <span className="field__label">{label}</span>
      {value.length > 0 && (
        <ul className="image-urls">
          {value.map((url) => (
            <li key={url} className="image-urls__item">
              <img src={url} alt="" />
              <button
                type="button"
                className="image-urls__remove"
                aria-label={t('reviewForm.removeImage')}
                onClick={() => onChange(value.filter((item) => item !== url))}
              >
                <Icon name="close" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {value.length < max && (
        <div className="image-urls__add">
          <input
            type="url"
            className="field__input"
            value={draft}
            placeholder="https://..."
            aria-label={label}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                add();
              }
            }}
          />
          <button type="button" className="btn btn--outline btn--md" onClick={add}>
            <Icon name="image" size={18} />
            {t('reviewForm.addImage')}
          </button>
        </div>
      )}
      {error ? (
        <p className="field__error" role="alert">
          <Icon name="alert" size={16} />
          {error}
        </p>
      ) : (
        <p className="field__hint">{hint ?? t('reviewForm.imageHint', { max })}</p>
      )}
    </div>
  );
}

export default ImageUrlField;
