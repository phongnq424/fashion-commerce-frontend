import { useCallback, useEffect, useId, useRef, useState } from 'react';
import ProductCard from '../ProductCard/ProductCard';
import Icon from '../common/Icon';
import { useLanguage } from '../../hooks/useLanguage';
import './ProductCarousel.css';

// Người dùng bật "giảm chuyển động" trong hệ điều hành -> cuộn ngay, không trượt mượt
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Băng chuyền sản phẩm 1 hàng, có nút ‹ › hai bên.
 * - Bấm › : cả hàng trượt từ PHẢI sang TRÁI, hiện nhóm sản phẩm tiếp theo.
 * - Điện thoại: vuốt ngang bằng tay (cuộn ngang gốc của trình duyệt).
 * - Hết sản phẩm ở một phía -> nút phía đó tự mờ đi (disabled).
 * Số thẻ thấy cùng lúc chỉnh trong ProductCarousel.css (--carousel-cols).
 */
function ProductCarousel({ products, onAddToCart, cardBadges }) {
  const { t } = useLanguage();
  const trackRef = useRef(null);
  const trackId = useId();
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  // Kiểm tra còn cuộn được về mỗi phía không (sai số 4px cho trình duyệt làm tròn)
  const updateButtons = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setCanPrev(track.scrollLeft > 4);
    setCanNext(track.scrollLeft + track.clientWidth < track.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    updateButtons();
    track.addEventListener('scroll', updateButtons, { passive: true });
    window.addEventListener('resize', updateButtons);
    // Dọn sự kiện khi component biến mất, tránh rò rỉ bộ nhớ
    return () => {
      track.removeEventListener('scroll', updateButtons);
      window.removeEventListener('resize', updateButtons);
    };
  }, [updateButtons, products]);

  // Cuộn đúng 1 "trang" = bề rộng phần đang thấy
  const scrollPage = (direction) => {
    const track = trackRef.current;
    track.scrollBy({
      left: direction * track.clientWidth,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  };

  return (
    <div className="product-carousel">
      <button
        type="button"
        className="product-carousel__arrow product-carousel__arrow--prev"
        onClick={() => scrollPage(-1)}
        disabled={!canPrev}
        aria-controls={trackId}
        aria-label={t('carousel.prev')}
      >
        <Icon name="chevronLeft" />
      </button>

      <ul id={trackId} ref={trackRef} className="product-carousel__track">
        {products.map((product) => (
          <li key={product.id} className="product-carousel__item">
            <ProductCard product={product} onAddToCart={onAddToCart} badges={cardBadges} />
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="product-carousel__arrow product-carousel__arrow--next"
        onClick={() => scrollPage(1)}
        disabled={!canNext}
        aria-controls={trackId}
        aria-label={t('carousel.next')}
      >
        <Icon name="chevronRight" />
      </button>
    </div>
  );
}

export default ProductCarousel;
