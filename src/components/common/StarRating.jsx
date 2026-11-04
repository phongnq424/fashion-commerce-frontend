import { useLanguage } from '../../hooks/useLanguage';
import './StarRating.css';

const STAR_PATH = 'M12 2.5l2.95 6.17 6.8.82-5 4.7 1.3 6.73L12 17.6l-6.05 3.32 1.3-6.73-5-4.7 6.8-.82L12 2.5z';

/**
 * Hàng 5 ngôi sao hiển thị điểm đánh giá (vd 4.6 -> 4 sao đầy + 1 sao tô 60%).
 * - value: điểm 0 - 5   - size: cỡ sao (px)
 * Trình đọc màn hình đọc "Đánh giá 4.6 trên 5 sao" thay vì đọc từng ngôi sao.
 */
function StarRating({ value = 0, size = 16, className = '' }) {
  const { t } = useLanguage();
  const rounded = Math.round(value * 10) / 10;

  return (
    <span
      className={`star-rating ${className}`}
      role="img"
      aria-label={t('rating.ariaLabel', { value: rounded })}
    >
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = Math.max(0, Math.min(1, value - index)); // phần trăm tô của ngôi sao này
        return (
          <span key={index} className="star-rating__star" style={{ width: size, height: size }} aria-hidden="true">
            <svg viewBox="0 0 24 24" width={size} height={size} className="star-rating__empty">
              <path d={STAR_PATH} />
            </svg>
            <span className="star-rating__fill" style={{ width: `${fill * 100}%` }}>
              <svg viewBox="0 0 24 24" width={size} height={size}>
                <path d={STAR_PATH} />
              </svg>
            </span>
          </span>
        );
      })}
    </span>
  );
}

export default StarRating;
