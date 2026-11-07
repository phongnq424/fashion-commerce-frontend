import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../../hooks/useLanguage';
import { CATALOG_BANNER } from '../data/catalogConfig';

/**
 * Banner CỐ ĐỊNH đầu trang danh mục (tràn hết chiều ngang).
 * Ảnh + link: data/catalogConfig.js -> CATALOG_BANNER
 * Chữ: vi.js / en.js -> catalog.banner (eyebrow, title, subtitle)
 * Chưa có ảnh / ảnh lỗi -> nền gradient màu thương hiệu, không vỡ bố cục.
 */
function CatalogBanner() {
  const { t } = useLanguage();
  const [failed, setFailed] = useState(false);
  const { image, imageAlt, position, aspectRatio, maxHeight, showText, link } = CATALOG_BANNER;
  const hasImage = Boolean(image) && !failed;

  const content = (
    <div
      className={`catalog-banner ${hasImage ? 'catalog-banner--image' : 'catalog-banner--placeholder'}`}
      // Có ảnh -> chiều cao theo tỉ lệ ảnh + giới hạn maxHeight trong catalogConfig.js
      style={hasImage ? { aspectRatio, maxHeight: maxHeight ?? 'none' } : { aspectRatio }}
    >
      {hasImage && (
        <img
          src={image}
          alt={showText ? '' : imageAlt}
          className="catalog-banner__image"
          style={{ objectPosition: position }}
          onError={() => setFailed(true)}
        />
      )}
      {(showText || !hasImage) && (
        <div className="catalog-banner__text container">
          <p className="catalog-banner__eyebrow">{t('catalog.banner.eyebrow')}</p>
          <p className="catalog-banner__title">{t('catalog.banner.title')}</p>
          <p className="catalog-banner__subtitle">{t('catalog.banner.subtitle')}</p>
        </div>
      )}
    </div>
  );

  return link ? (
    <Link to={link} className="catalog-banner__link" aria-label={imageAlt}>
      {content}
    </Link>
  ) : (
    content
  );
}

export default CatalogBanner;
