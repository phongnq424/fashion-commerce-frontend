import { useCallback, useEffect, useRef, useState } from 'react';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';
import { HERO_SLIDES, HERO_AUTOPLAY_MS } from '../data/heroSlides';
import './HeroSection.css';

const SWIPE_THRESHOLD = 50; // vuốt tối thiểu 50px mới tính là chuyển slide

// Người dùng bật "giảm chuyển động" trong hệ điều hành -> không tự chạy
const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Banner trang chủ dạng slider (carousel).
 * - Tự chuyển mỗi HERO_AUTOPLAY_MS, luôn lướt từ PHẢI sang TRÁI khi đi tới.
 * - Dừng khi rê chuột / focus vào banner, hoặc khi bấm nút Tạm dừng.
 * - Điều khiển: nút ‹ ›, chấm tròn, phím ← →, vuốt trên điện thoại.
 */
function HeroSection() {
  const { t } = useLanguage();
  const total = HERO_SLIDES.length;

  // index: slide đang hiện | prevIndex: slide vừa rời đi | direction: hướng lướt
  const [state, setState] = useState({ index: 0, prevIndex: null, direction: 'none' });
  const [userPaused, setUserPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const [reducedMotion] = useState(prefersReducedMotion);
  const [failedImages, setFailedImages] = useState({});
  const touchStartX = useRef(null);

  const { index, prevIndex, direction } = state;
  const isAutoPlaying = !userPaused && !reducedMotion && total > 1;
  const isRunning = isAutoPlaying && !hovering && !focusInside;

  const goTo = useCallback((nextIndex, dir) => {
    setState((current) =>
      nextIndex === current.index
        ? current
        : { index: nextIndex, prevIndex: current.index, direction: dir },
    );
  }, []);

  // % total để vòng lại: slide cuối -> slide đầu (vẫn lướt phải sang trái)
  const goNext = useCallback(() => goTo((index + 1) % total, 'next'), [goTo, index, total]);
  const goPrev = useCallback(() => goTo((index - 1 + total) % total, 'prev'), [goTo, index, total]);

  // Tự chuyển slide: đặt hẹn giờ mỗi khi slide đổi; dọn hẹn giờ khi dừng
  useEffect(() => {
    if (!isRunning) return undefined;
    const timer = setTimeout(goNext, HERO_AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [isRunning, goNext]);

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowRight') goNext();
    if (event.key === 'ArrowLeft') goPrev();
  };

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event) => {
    if (touchStartX.current === null) return;
    const delta = event.changedTouches[0].clientX - touchStartX.current;
    if (delta < -SWIPE_THRESHOLD) goNext(); // vuốt sang trái -> slide tiếp
    if (delta > SWIPE_THRESHOLD) goPrev(); // vuốt sang phải -> slide trước
    touchStartX.current = null;
  };

  // Chỉ coi là "rời banner" khi focus chuyển ra NGOÀI cả khối banner
  const handleBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocusInside(false);
  };

  return (
    <section
      className="hero-carousel"
      aria-roledescription="carousel"
      aria-label={t('home.hero.label')}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocusInside(true)}
      onBlur={handleBlur}
    >
      <div
        className="hero-carousel__viewport"
        data-direction={direction}
        // Đang tự chạy thì không đọc liên tục; dừng lại thì đọc slide mới cho trình đọc màn hình
        aria-live={isRunning ? 'off' : 'polite'}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {HERO_SLIDES.map((slide, slideIndex) => {
          const isActive = slideIndex === index;
          const isLeaving = slideIndex === prevIndex && !isActive;
          const key = `home.hero.slides.${slide.id}`;
          const imageFailed = failedImages[slide.id];

          return (
            <div
              key={slide.id}
              className={[
                'hero-slide',
                `hero-slide--${slide.textAlign}`,
                isActive ? 'is-active' : '',
                isLeaving ? 'is-leaving' : '',
              ].join(' ')}
              role="group"
              aria-roledescription="slide"
              aria-label={t('home.hero.slideOf', { current: slideIndex + 1, total })}
              aria-hidden={!isActive}
            >
              {imageFailed ? (
                <div className="hero-slide__image hero-slide__image--fallback" aria-hidden="true">
                  <Icon name="hanger" size={64} />
                </div>
              ) : (
                <img
                  src={slide.image}
                  alt={t(`${key}.imageAlt`)}
                  className="hero-slide__image"
                  style={{ objectPosition: slide.imagePosition }}
                  // Ảnh đầu tải ngay, các ảnh sau tải chậm cho trang nhẹ
                  loading={slideIndex === 0 ? 'eager' : 'lazy'}
                  fetchPriority={slideIndex === 0 ? 'high' : 'auto'}
                  onError={() => setFailedImages((prev) => ({ ...prev, [slide.id]: true }))}
                />
              )}

              <div className="hero-slide__inner container">
                <div className="hero-slide__panel">
                  <p className="hero-slide__kicker">{t(`${key}.kicker`)}</p>
                  {/* Chỉ slide đầu dùng h1 (mỗi trang chỉ nên có 1 h1) */}
                  {slideIndex === 0 ? (
                    <h1 className="hero-slide__title">{t(`${key}.title`)}</h1>
                  ) : (
                    <h2 className="hero-slide__title">{t(`${key}.title`)}</h2>
                  )}
                  <p className="hero-slide__desc">{t(`${key}.description`)}</p>
                  <Button
                    as="a"
                    href={slide.href}
                    className="hero-slide__cta"
                    tabIndex={isActive ? undefined : -1}
                  >
                    {t(`${key}.cta`)}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {total > 1 && (
          <>
            <button
              type="button"
              className="hero-carousel__arrow hero-carousel__arrow--prev"
              onClick={goPrev}
              aria-label={t('home.hero.prev')}
            >
              <Icon name="chevronLeft" />
            </button>
            <button
              type="button"
              className="hero-carousel__arrow hero-carousel__arrow--next"
              onClick={goNext}
              aria-label={t('home.hero.next')}
            >
              <Icon name="chevronRight" />
            </button>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="hero-carousel__controls">
          <div className="hero-carousel__dots">
            {HERO_SLIDES.map((slide, slideIndex) => (
              <button
                key={slide.id}
                type="button"
                className="hero-carousel__dot"
                aria-label={t('home.hero.goTo', { number: slideIndex + 1 })}
                aria-current={slideIndex === index ? 'true' : undefined}
                onClick={() => goTo(slideIndex, slideIndex > index ? 'next' : 'prev')}
              />
            ))}
          </div>
          {!reducedMotion && (
            <button
              type="button"
              className="hero-carousel__pause"
              onClick={() => setUserPaused((paused) => !paused)}
              aria-label={userPaused ? t('home.hero.play') : t('home.hero.pause')}
            >
              <Icon name={userPaused ? 'play' : 'pause'} size={16} />
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default HeroSection;
