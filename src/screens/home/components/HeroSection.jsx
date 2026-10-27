import { useState } from 'react';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&h=1100&q=75';

function HeroSection() {
  const { t } = useLanguage();
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <section className="hero" aria-labelledby="hero-title">
      {/* Họa tiết trang trí: chỉ để nhìn, ẩn khỏi trình đọc màn hình */}
      <span className="hero__deco hero__deco--flower-1" aria-hidden="true">
        <Icon name="flower" size={40} filled />
      </span>
      <span className="hero__deco hero__deco--flower-2" aria-hidden="true">
        <Icon name="flower" size={24} filled />
      </span>

      <div className="hero__inner container">
        <div className="hero__content">
          <p className="hero__kicker text-script">{t('home.hero.kicker')}</p>

          {/* 2 dòng tiêu đề tách riêng để tạo hiệu ứng "dải màu" + "hộp trắng" như mẫu */}
          <h1 id="hero-title" className="hero__title">
            <span className="hero__title-band">{t('home.hero.titleLine1')}</span>
            <span className="hero__title-box">{t('home.hero.titleLine2')}</span>
          </h1>

          <p className="hero__desc">{t('home.hero.description')}</p>
          <Button as="a" href="#new-arrivals" className="hero__cta">
            {t('home.hero.cta')}
          </Button>
        </div>

        <div className="hero__media">
          {imageFailed ? (
            <div className="hero__placeholder" role="img" aria-label={t('home.hero.imageAlt')}>
              <Icon name="hanger" size={64} />
            </div>
          ) : (
            <img
              src={HERO_IMAGE}
              alt={t('home.hero.imageAlt')}
              className="hero__image"
              fetchPriority="high"
              onError={() => setImageFailed(true)}
            />
          )}
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
