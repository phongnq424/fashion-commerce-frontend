import { Link } from 'react-router-dom';
import BannerImage from './BannerImage';
import { useLanguage } from '../../../hooks/useLanguage';
import { COLLECTION } from '../data/homeBanners';
import './LookbookSection.css';

/**
 * Khối bộ sưu tập kiểu tạp chí, gồm 2 phần NỐI TIẾP nhau:
 *   Phần 1 (hình 1): hàng chữ các phong cách  ->  4 ảnh ngang  ->  chữ "Fashion Collection"
 *                    cỡ lớn đè lên mép dưới ảnh  ->  "WINTER 2026 ——— @TRENDYLAB"
 *   Phần 2 (hình 2): ảnh lớn có chữ "BACK IN STOCK" | cột nền pastel với 3 ảnh nhỏ + tên màu
 * Ảnh + đường dẫn: screens/home/data/homeBanners.js   |   Chữ: vi.js / en.js -> home.lookbook
 */
function LookbookSection() {
  const { t } = useLanguage();
  const { to, styleKeys, strip, feature, looks } = COLLECTION;

  return (
    <section id="lookbook" className="home-section container lookbook" aria-labelledby="lookbook-title">
      {/* ================= PHẦN 1: Fashion Collection ================= */}
      <div className="collection-banner">
        {/* Hàng chữ trên cùng: các phong cách (Thanh lịch, Năng động...) */}
        <ul className="collection-banner__labels">
          {styleKeys.map((key) => (
            <li key={key}>{t(`home.lookbook.styles.${key}`)}</li>
          ))}
        </ul>

        {/* 4 ảnh ngang, sát nhau. Ảnh trang trí -> alt rỗng */}
        <Link to={to} className="collection-banner__strip" aria-label={t('home.lookbook.stripLabel')}>
          {strip.map((photo) => (
            <span key={photo.id} className="collection-banner__photo">
              <BannerImage src={photo.image} position={photo.position} className="collection-banner__image" />
            </span>
          ))}
        </Link>

        {/* Chữ lớn đè lên mép dưới của hàng ảnh */}
        <h2 id="lookbook-title" className="collection-banner__title">
          <span className="collection-banner__title-main">{t('home.lookbook.title')}</span>
          <span className="collection-banner__title-script">{t('home.lookbook.titleScript')}</span>
        </h2>

        <p className="collection-banner__meta">
          <span>{t('home.lookbook.season')}</span>
          <span className="collection-banner__rule" aria-hidden="true" />
          <span>{t('home.lookbook.handle')}</span>
        </p>
      </div>

      {/* ================= PHẦN 2: Back in stock ================= */}
      <div className="stock-banner">
        <Link to={to} className="stock-banner__feature">
          <BannerImage src={feature.image} position={feature.position} className="stock-banner__image" />
          <p className="stock-banner__eyebrow">{t('home.lookbook.eyebrow')}</p>
          <div className="stock-banner__content">
            <h3 className="stock-banner__title">
              <span>{t('home.lookbook.featureLine1')}</span>
              <span className="stock-banner__title-accent">{t('home.lookbook.featureLine2')}</span>
            </h3>
            <p className="stock-banner__desc">{t('home.lookbook.featureText')}</p>
          </div>
        </Link>

        <ul className="stock-banner__panel" aria-label={t('home.lookbook.looksLabel')}>
          {looks.map((look) => (
            <li key={look.id}>
              <Link to={to} className="stock-look">
                <span className="stock-look__media">
                  <BannerImage src={look.image} position={look.position} className="stock-look__image" />
                </span>
                <span className="stock-look__label">{t(`home.lookbook.looks.${look.id}`)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default LookbookSection;
