import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';
import { getSaleProducts } from '../../../services/productService';
import { formatPrice, getDiscountPercent } from '../../../utils/format';
import { FLASH_SALE } from '../data/flashSale';
import './FlashSaleSection.css';

const MAX_SWATCHES = 3;
const pad = (value) => String(value).padStart(2, '0');

// Mốc thời gian của đợt sale hiện tại theo cấu hình trong data/flashSale.js
function getWindow(now) {
  if (FLASH_SALE.mode === 'fixed') {
    return { start: new Date(FLASH_SALE.startsAt).getTime(), end: new Date(FLASH_SALE.endsAt).getTime() };
  }
  const end = new Date(now);
  end.setHours(FLASH_SALE.dailyEndHour, 0, 0, 0);
  if (end.getTime() <= now) end.setDate(end.getDate() + 1);
  return { start: 0, end: end.getTime() };
}

// Đồng hồ: cập nhật mỗi giây -> { phase: 'upcoming' | 'live' | 'ended', h, m, s }
function useCountdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { start, end } = getWindow(now);
  const phase = now < start ? 'upcoming' : now < end ? 'live' : 'ended';
  const remaining = Math.max(0, (phase === 'upcoming' ? start : end) - now);
  const totalSeconds = Math.floor(remaining / 1000);
  return {
    phase,
    h: Math.floor(totalSeconds / 3600), // có thể > 24 nếu còn nhiều ngày
    m: Math.floor((totalSeconds % 3600) / 60),
    s: totalSeconds % 60,
  };
}

/**
 * Khối FLASH SALE trên trang chủ: thanh tiêu đề đỏ-cam + đồng hồ đếm ngược,
 * 1 hàng sản phẩm trượt ngang (nút ‹ ›), nút "Xem thêm sản phẩm".
 * Bật/tắt, giờ kết thúc, số suất... -> data/flashSale.js
 */
function FlashSaleSection() {
  const { t } = useLanguage();
  const countdown = useCountdown();
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'error' | 'success'

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const list = await getSaleProducts(FLASH_SALE.limit);
      // Giảm nhiều nhất lên trước -> con số "-47%" to nhất đập vào mắt đầu tiên
      setProducts(
        [...list].sort(
          (a, b) => getDiscountPercent(b.price, b.originalPrice) - getDiscountPercent(a.price, a.originalPrice),
        ),
      );
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const maxDiscount = useMemo(
    () => products.reduce((max, item) => Math.max(max, getDiscountPercent(item.price, item.originalPrice)), 0),
    [products],
  );

  if (!FLASH_SALE.enabled) return null;
  if (countdown.phase === 'ended' && FLASH_SALE.hideWhenEnded) return null;
  if (status === 'success' && products.length === 0) return null;

  const ended = countdown.phase === 'ended';

  return (
    <section
      id="flash-sale"
      className={`flash-sale ${ended ? 'flash-sale--ended' : ''}`}
      aria-labelledby="flash-sale-title"
    >
      <div className="flash-sale__panel">
        {/* ---------- Thanh tiêu đề ---------- */}
        {/* Nền màu tràn hết chiều ngang màn hình, nội dung bên trong canh theo lề trang (.container) */}
        <header className="flash-sale__head">
          <div className="flash-sale__head-inner container">
          <h2 id="flash-sale-title" className="flash-sale__title">
            <span className="flash-sale__bolt" aria-hidden="true">
              <Icon name="bolt" size={26} filled strokeWidth={1.2} />
            </span>
            <span>
              FLASH <em>SALE</em>
            </span>
          </h2>

          <div className="flash-sale__timer" role="timer" aria-live="off">
            {ended ? (
              <span className="flash-sale__timer-label">{t('home.flashSale.ended')}</span>
            ) : (
              <>
                <span className="flash-sale__timer-label">
                  {countdown.phase === 'upcoming' ? t('home.flashSale.startsIn') : t('home.flashSale.endsIn')}
                </span>
                <span className="flash-sale__clock" aria-hidden="true">
                  <span className="flash-sale__digit">{pad(countdown.h)}</span>
                  <span className="flash-sale__colon">:</span>
                  <span className="flash-sale__digit">{pad(countdown.m)}</span>
                  <span className="flash-sale__colon">:</span>
                  <span className="flash-sale__digit">{pad(countdown.s)}</span>
                </span>
                <span className="visually-hidden">
                  {t('home.flashSale.timeLeft', { h: countdown.h, m: countdown.m })}
                </span>
              </>
            )}
          </div>

          <p className="flash-sale__perks">
            {maxDiscount > 0 && (
              <span className="flash-sale__perk">{t('home.flashSale.upTo', { percent: maxDiscount })}</span>
            )}
            <span className="flash-sale__perk">{t('home.flashSale.freeship')}</span>
          </p>

          </div>
        </header>

        {/* ---------- Danh sách sản phẩm ---------- */}
        <div className="flash-sale__body container">
        {status === 'error' ? (
          <div className="flash-sale__state" role="alert">
            <p>{t('home.flashSale.error')}</p>
            <button type="button" className="flash-sale__retry" onClick={load}>
              <Icon name="refresh" size={16} />
              {t('common.retry')}
            </button>
          </div>
        ) : (
          <FlashSaleRail products={products} loading={status === 'loading'} ended={ended} />
        )}

        <div className="flash-sale__foot">
          <Link to={FLASH_SALE.seeAllHref} className="flash-sale__more">
            {t('home.flashSale.seeMore')}
          </Link>
        </div>
        </div>
      </div>
    </section>
  );
}

// Hàng sản phẩm trượt ngang. Desktop có nút ‹ ›, mobile vuốt bằng tay.
function FlashSaleRail({ products, loading, ended }) {
  const { t } = useLanguage();
  const trackRef = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const updateEdges = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setEdges({
      start: track.scrollLeft <= 4,
      end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    updateEdges();
    window.addEventListener('resize', updateEdges);
    return () => window.removeEventListener('resize', updateEdges);
  }, [updateEdges, products, loading]);

  const scroll = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    // Trượt đúng bằng số thẻ đang nhìn thấy
    track.scrollBy({ left: direction * track.clientWidth, behavior: 'smooth' });
  };

  const items = loading ? Array.from({ length: 5 }, (_, index) => ({ id: `skeleton-${index}` })) : products;

  return (
    <div className="flash-sale__rail">
      {!edges.start && (
        <button
          type="button"
          className="flash-sale__arrow flash-sale__arrow--prev"
          onClick={() => scroll(-1)}
          aria-label={t('carousel.prev')}
        >
          <Icon name="chevronLeft" />
        </button>
      )}

      <ul ref={trackRef} className="flash-sale__track" onScroll={updateEdges} aria-busy={loading}>
        {items.map((product) => (
          <li key={product.id} className="flash-sale__slot">
            {loading ? <FlashSaleSkeleton /> : <FlashSaleCard product={product} ended={ended} />}
          </li>
        ))}
      </ul>

      {!edges.end && (
        <button
          type="button"
          className="flash-sale__arrow flash-sale__arrow--next"
          onClick={() => scroll(1)}
          aria-label={t('carousel.next')}
        >
          <Icon name="chevronRight" />
        </button>
      )}
    </div>
  );
}

function FlashSaleCard({ product, ended }) {
  const { t, language } = useLanguage();
  const [imageFailed, setImageFailed] = useState(false);
  const { id, name, price, originalPrice, image, colors = [], soldCount = 0, inStock } = product;
  const discount = getDiscountPercent(price, originalPrice);
  const soldOut = inStock === false;
  const percent = soldOut ? 100 : Math.min(100, Math.round((soldCount / FLASH_SALE.quota) * 100));
  const almostGone = !soldOut && percent >= FLASH_SALE.almostGonePercent;

  let progressLabel = t('home.flashSale.sold', { count: soldCount.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US') });
  if (soldCount === 0) progressLabel = t('home.flashSale.justOpened');
  if (almostGone) progressLabel = t('home.flashSale.almostGone');
  if (soldOut) progressLabel = t('product.soldOut');
  if (ended) progressLabel = t('home.flashSale.ended');

  return (
    <article className={`fs-card ${soldOut || ended ? 'fs-card--off' : ''}`}>
      <Link to={`/product/${id}`} className="fs-card__link" title={name}>
        <div className="fs-card__media">
          {image && !imageFailed ? (
            <img src={image} alt="" className="fs-card__image" loading="lazy" onError={() => setImageFailed(true)} />
          ) : (
            <span className="fs-card__placeholder" aria-hidden="true">
              <Icon name="hanger" size={36} />
            </span>
          )}
          {discount > 0 && (
            <span className="fs-card__badge">
              <span className="visually-hidden">{t('home.flashSale.discount')} </span>-{discount}%
            </span>
          )}
        </div>

        <div className="fs-card__body">
          <h3 className="fs-card__name">{name}</h3>

          {colors.length > 0 && (
            <p className="fs-card__swatches" aria-label={t('home.flashSale.colors', { count: colors.length })}>
              {colors.slice(0, MAX_SWATCHES).map((color) => (
                <span
                  key={color.id}
                  className="fs-card__swatch"
                  style={color.hex ? { background: color.hex } : undefined}
                  title={color.name}
                />
              ))}
              {colors.length > MAX_SWATCHES && <span className="fs-card__more">+{colors.length - MAX_SWATCHES}</span>}
            </p>
          )}

          <p className="fs-card__price">
            <strong>{formatPrice(price, language)}</strong>
            {originalPrice > price && <s>{formatPrice(originalPrice, language)}</s>}
          </p>

          <div className={`fs-card__progress ${almostGone ? 'is-hot' : ''}`}>
            <p className="fs-card__progress-label">
              <Icon name="flame" size={14} filled strokeWidth={1} />
              {progressLabel}
            </p>
            <span className="fs-card__bar" aria-hidden="true">
              <span className="fs-card__bar-fill" style={{ width: `${Math.max(percent, 6)}%` }} />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

function FlashSaleSkeleton() {
  return (
    <div className="fs-card fs-card--skeleton" aria-hidden="true">
      <div className="fs-card__media" />
      <div className="fs-card__body">
        <span className="fs-skel fs-skel--line" />
        <span className="fs-skel fs-skel--short" />
        <span className="fs-skel fs-skel--bar" />
      </div>
    </div>
  );
}

export default FlashSaleSection;
