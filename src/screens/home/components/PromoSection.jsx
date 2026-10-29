import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import BannerImage from './BannerImage';
import { useLanguage } from '../../../hooks/useLanguage';
import { PROMO } from '../data/homeBanners';
import './PromoSection.css';

// Dải lợi ích ngay dưới banner (thay cho BenefitsSection cũ)
const BENEFITS = [
  { icon: 'truck', titleKey: 'home.benefits.shippingTitle', textKey: 'home.benefits.shippingText' },
  { icon: 'shield', titleKey: 'home.benefits.paymentTitle', textKey: 'home.benefits.paymentText' },
  { icon: 'swap', titleKey: 'home.benefits.returnsTitle', textKey: 'home.benefits.returnsText' },
  { icon: 'headset', titleKey: 'home.benefits.supportTitle', textKey: 'home.benefits.supportText' },
];

/**
 * Banner khuyến mãi, 1 ảnh. 2 kiểu (chọn bằng PROMO.layout trong homeBanners.js):
 *   'side': chữ trái, ảnh phải mờ dần  |  'full': ảnh phủ kín, chữ đè lên chỗ trống của ảnh
 * Bên dưới là dải 4 lợi ích mua hàng.
 * Ảnh + đường dẫn: screens/home/data/homeBanners.js   |   Chữ: vi.js / en.js -> home.promo, home.benefits
 */
function PromoSection() {
  const { t } = useLanguage();

  return (
    <section className="home-section container promo" aria-labelledby="promo-title">
      {/* layout 'full': ảnh phủ kín, vị trí chữ lấy từ homeBanners.js qua biến CSS */}
      <div
        className={`promo__banner promo__banner--${PROMO.layout ?? 'side'}`}
        style={
          PROMO.layout === 'full'
            ? {
                '--promo-ratio': PROMO.aspectRatio,
                '--promo-text-left': PROMO.textLeft,
                '--promo-text-top': PROMO.textTop,
                '--promo-text-width': PROMO.textWidth,
              }
            : undefined
        }
      >
        <div className="promo__media" aria-hidden="true">
          <BannerImage src={PROMO.image} position={PROMO.position} className="promo__image" />
        </div>

        <div className="promo__content">
          <p className="promo__eyebrow">{t('home.promo.eyebrow')}</p>
          <h2 id="promo-title" className="promo__title">
            {t('home.promo.title')}
          </h2>
          <p className="promo__desc">{t('home.promo.description')}</p>
          <Button as={Link} to={PROMO.to} className="promo__cta">
            {t('home.promo.cta')}
            <Icon name="arrowRight" size={16} />
          </Button>
        </div>
      </div>

      <h3 className="visually-hidden">{t('home.benefits.title')}</h3>
      <ul className="promo__benefits">
        {BENEFITS.map((item) => (
          <li key={item.titleKey} className="promo-benefit">
            <Icon name={item.icon} size={30} strokeWidth={1.4} className="promo-benefit__icon" />
            <div>
              <p className="promo-benefit__title">{t(item.titleKey)}</p>
              <p className="promo-benefit__text">{t(item.textKey)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default PromoSection;
