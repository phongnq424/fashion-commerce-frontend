import { useState } from 'react';
import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';
import { formatPrice } from '../../../utils/format';

/**
 * Khung "Quà tặng kèm đơn" (chỉ hiện khi sản phẩm có trường gift trong dữ liệu).
 * - gift: { name, image, originalPrice, options: ['Đen', 'Trắng'] }
 * - value: { selected: true/false, option: 'Đen' }   - onChange(nextValue)
 */
function GiftOffer({ gift, value, onChange }) {
  const { t, language } = useLanguage();
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <section className="gift" aria-labelledby="gift-title">
      <h2 id="gift-title" className="gift__title">
        {t('productDetail.giftTitle')}
      </h2>

      <div className="gift__row">
        <input
          type="checkbox"
          className="gift__check"
          checked={value.selected}
          onChange={(event) => onChange({ ...value, selected: event.target.checked })}
          aria-label={t('productDetail.giftInclude', { name: gift.name })}
        />

        <span className="gift__thumb">
          {gift.image && !imageFailed ? (
            <img src={gift.image} alt="" onError={() => setImageFailed(true)} />
          ) : (
            <Icon name="package" size={28} />
          )}
          {/* Huy hiệu hộp quà: có cả chữ cho trình đọc màn hình */}
          <span className="gift__badge">
            <Icon name="gift" size={14} />
            <span className="visually-hidden">{t('productDetail.giftBadge')}</span>
          </span>
        </span>

        <div className="gift__info">
          <p className="gift__name">{gift.name}</p>
          {gift.options?.length > 0 && (
            <select
              className="gift__select"
              value={value.option}
              onChange={(event) => onChange({ ...value, option: event.target.value })}
              aria-label={t('productDetail.giftOption')}
              disabled={!value.selected}
            >
              {gift.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
        </div>

        <p className="gift__price">
          <span className="gift__price-now">{formatPrice(0, language)}</span>
          {gift.originalPrice > 0 && (
            <s className="gift__price-old">{formatPrice(gift.originalPrice, language)}</s>
          )}
        </p>
      </div>
    </section>
  );
}

export default GiftOffer;
