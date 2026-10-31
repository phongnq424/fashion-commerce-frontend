import { useEffect, useRef, useState } from 'react';
import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';

/**
 * Ảnh sản phẩm: 1 ảnh lớn + hàng ảnh nhỏ bên dưới (bấm để đổi ảnh lớn, có nút ‹ ›).
 * - images: danh sách link ảnh   - activeIndex / onChange: ảnh đang xem (do trang cha giữ,
 *   để khi chọn màu có ảnh riêng thì ảnh lớn đổi theo)
 * - badge: chữ hiện góc trái ảnh lớn (vd "-25%")
 */
function ProductGallery({ images, name, activeIndex, onChange, badge }) {
  const { t } = useLanguage();
  const [failed, setFailed] = useState({});
  const thumbsRef = useRef(null);
  const total = images.length;
  const current = images[activeIndex];

  // Ảnh nhỏ đang chọn luôn nằm trong vùng nhìn thấy của hàng ảnh nhỏ.
  // CHỈ cuộn NGANG bên trong hàng ảnh nhỏ (scrollTo trên chính hàng đó).
  // Không dùng scrollIntoView vì nó cuộn luôn CẢ TRANG -> chọn màu xong trang bị nhảy xuống.
  useEffect(() => {
    const strip = thumbsRef.current;
    const thumb = strip?.children[activeIndex];
    if (!strip || !thumb) return;
    // Vị trí ảnh nhỏ tính từ đầu hàng (cộng phần đã cuộn)
    const left = thumb.getBoundingClientRect().left - strip.getBoundingClientRect().left + strip.scrollLeft;
    const right = left + thumb.offsetWidth;
    if (left < strip.scrollLeft) strip.scrollTo({ left, behavior: 'smooth' });
    else if (right > strip.scrollLeft + strip.clientWidth) {
      strip.scrollTo({ left: right - strip.clientWidth, behavior: 'smooth' });
    }
  }, [activeIndex]);

  const go = (step) => onChange((activeIndex + step + total) % total);

  return (
    <div className="gallery" aria-label={t('productDetail.gallery')} role="region">
      <div className="gallery__main">
        {current && !failed[current] ? (
          <img
            src={current}
            alt={t('productDetail.imageAlt', { name, index: activeIndex + 1, total })}
            className="gallery__image"
            onError={() => setFailed((prev) => ({ ...prev, [current]: true }))}
          />
        ) : (
          <div className="gallery__placeholder" role="img" aria-label={t('product.imageMissing')}>
            <Icon name="hanger" size={64} />
          </div>
        )}
        {badge && <span className="gallery__badge">{badge}</span>}
      </div>

      {total > 1 && (
        <div className="gallery__strip">
          <button
            type="button"
            className="gallery__arrow"
            onClick={() => go(-1)}
            aria-label={t('productDetail.galleryPrev')}
          >
            <Icon name="chevronLeft" size={18} />
          </button>

          <ul className="gallery__thumbs" ref={thumbsRef}>
            {images.map((src, index) => (
              <li key={src}>
                <button
                  type="button"
                  className="gallery__thumb"
                  aria-current={index === activeIndex ? 'true' : undefined}
                  aria-label={t('productDetail.thumbLabel', { index: index + 1, total })}
                  onClick={() => onChange(index)}
                >
                  {failed[src] ? (
                    <Icon name="hanger" size={24} />
                  ) : (
                    <img
                      src={src}
                      alt=""
                      loading="lazy"
                      onError={() => setFailed((prev) => ({ ...prev, [src]: true }))}
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="gallery__arrow"
            onClick={() => go(1)}
            aria-label={t('productDetail.galleryNext')}
          >
            <Icon name="chevronRight" size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

export default ProductGallery;
