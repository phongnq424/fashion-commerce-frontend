import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import StarRating from '../../../components/common/StarRating';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../hooks/useLanguage';
import { getReviews } from '../../../services/reviewService';
import { formatDate } from '../../../utils/format';

const STARS = [5, 4, 3, 2, 1];

/**
 * Mục "Đánh giá sản phẩm" (kiểu Shopee): điểm trung bình + số đánh giá theo từng mức sao,
 * nút lọc theo số sao, danh sách đánh giá, "Xem thêm".
 * Theo Backend: chỉ người ĐÃ MUA mới đánh giá được, từ trang "Đơn hàng của tôi" (từng dòng hàng đã giao).
 * Dữ liệu: services/reviewService.js
 */
function ProductReviews({ product }) {
  const { t, language } = useLanguage();
  const { user, openAuth } = useAuth();
  const [filter, setFilter] = useState(0); // 0 = tất cả
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setData(await getReviews(product, { rating: filter, page }));
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }, [product, filter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const changeFilter = (value) => {
    setFilter(value);
    setPage(1);
  };

  return (
    <section id="reviews" className="reviews" aria-labelledby="reviews-title">
      <div className="reviews__head">
        <h2 id="reviews-title" className="reviews__title">
          {t('reviews.title')}
        </h2>
        {user ? (
          <Button as={Link} to="/account/orders" variant="outline" size="sm">
            <Icon name="star" size={16} />
            {t('market.reviews.writeFromOrders')}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => openAuth('login')}>
            {t('reviews.loginToWrite')}
          </Button>
        )}
      </div>

      {status === 'error' && (
        <p className="auth-alert" role="alert">
          <Icon name="alert" size={18} />
          {t('reviews.error')}
        </p>
      )}

      {data && (
        <>
          {/* ----- Tổng quan: điểm trung bình + thanh số lượng theo sao ----- */}
          <div className="reviews__summary">
            <div className="reviews__score">
              <p className="reviews__average">
                <strong>{data.average.toFixed(1)}</strong> {t('reviews.outOf')}
              </p>
              <StarRating value={data.average} size={20} />
              <p className="reviews__total">{t('reviews.total', { count: data.total })}</p>
            </div>

            <ul className="reviews__bars">
              {STARS.map((star) => {
                const count = data.breakdown[star] ?? 0;
                const percent = data.total ? Math.round((count / data.total) * 100) : 0;
                return (
                  <li key={star} className="reviews__bar">
                    <span className="reviews__bar-label">{t('reviews.starShort', { star })}</span>
                    <span className="reviews__bar-track" aria-hidden="true">
                      <span className="reviews__bar-fill" style={{ width: `${percent}%` }} />
                    </span>
                    <span className="reviews__bar-count">{count}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ----- Lọc theo số sao ----- */}
          <div className="reviews__filters" role="group" aria-label={t('reviews.filterLabel')}>
            {[0, ...STARS].map((star) => (
              <button
                key={star}
                type="button"
                className="reviews__filter"
                aria-pressed={filter === star}
                onClick={() => changeFilter(star)}
              >
                {star === 0 ? t('reviews.filterAll') : t('reviews.filterStar', { star })}
                {star > 0 && ` (${data.breakdown[star] ?? 0})`}
              </button>
            ))}
          </div>

          {/* ----- Danh sách ----- */}
          {data.items.length === 0 ? (
            <p className="reviews__empty">{t('reviews.empty')}</p>
          ) : (
            <ul className="reviews__list" aria-busy={status === 'loading'}>
              {data.items.map((review) => (
                <li key={review.id} className="review">
                  <span className="review__avatar" aria-hidden="true">
                    {review.name.charAt(0)}
                  </span>
                  <div className="review__body">
                    <p className="review__name">{review.name}</p>
                    <StarRating value={review.rating} size={13} />
                    <p className="review__meta">{formatDate(review.date, language)}</p>
                    {review.title && <p className="review__name">{review.title}</p>}
                    <p className="review__comment">{review.comment}</p>
                    {review.sellerReply && (
                      <p className="review__comment" style={{ borderLeft: '3px solid currentColor', paddingLeft: 12, opacity: 0.85 }}>
                        <strong>{t('market.reviews.sellerReply')}:</strong> {review.sellerReply}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {data.hasMore && (
            <div className="reviews__more">
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => p + 1)} disabled={status === 'loading'}>
                {status === 'loading' ? t('common.loading') : t('reviews.loadMore')}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default ProductReviews;
