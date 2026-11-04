import { useCallback, useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import StarRating from '../../../components/common/StarRating';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../hooks/useLanguage';
import { addReview, getReviews } from '../../../services/reviewService';
import { formatDate } from '../../../utils/format';

const STARS = [5, 4, 3, 2, 1];

/**
 * Mục "Đánh giá sản phẩm" (kiểu Shopee): điểm trung bình + số đánh giá theo từng mức sao,
 * nút lọc theo số sao, danh sách đánh giá, "Xem thêm", và form viết đánh giá (cần đăng nhập).
 * Dữ liệu: services/reviewService.js
 */
function ProductReviews({ product }) {
  const { t, language } = useLanguage();
  const { user, openAuth } = useAuth();
  const [filter, setFilter] = useState(0); // 0 = tất cả
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [writing, setWriting] = useState(false);

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
          !writing && (
            <Button variant="outline" size="sm" onClick={() => setWriting(true)}>
              <Icon name="star" size={16} />
              {t('reviews.write')}
            </Button>
          )
        ) : (
          <Button variant="outline" size="sm" onClick={() => openAuth('login')}>
            {t('reviews.loginToWrite')}
          </Button>
        )}
      </div>

      {writing && user && (
        <ReviewForm
          product={product}
          user={user}
          onCancel={() => setWriting(false)}
          onDone={() => {
            setWriting(false);
            setFilter(0);
            setPage(1);
            load();
          }}
        />
      )}

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
                    <p className="review__meta">
                      {formatDate(review.date, language)}
                      {(review.color || review.size) && (
                        <>
                          {' | '}
                          {t('reviews.variant', {
                            variant: [review.color, review.size].filter(Boolean).join(', '),
                          })}
                        </>
                      )}
                    </p>
                    <p className="review__comment">{review.comment}</p>
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

/** Form viết đánh giá: chọn số sao (radio thật, dùng bàn phím được) + nhận xét */
function ReviewForm({ product, user, onCancel, onDone }) {
  const { t } = useLanguage();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const next = {
      rating: rating ? '' : 'reviews.ratingRequired',
      comment: comment.trim().length >= 10 ? '' : 'reviews.commentRequired',
    };
    setErrors(next);
    if (next.rating || next.comment) return;
    setSubmitting(true);
    try {
      await addReview(product, { name: user.name, rating, comment: comment.trim() });
      onDone();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="review-form" onSubmit={handleSubmit} noValidate>
      <fieldset className="review-form__stars" onMouseLeave={() => setHover(0)}>
        <legend className="option-group__label">{t('reviews.yourRating')}</legend>
        <div className="review-form__star-row">
          {[1, 2, 3, 4, 5].map((star) => (
            <label key={star} className="review-form__star" onMouseEnter={() => setHover(star)}>
              <input
                type="radio"
                name="review-rating"
                className="choice__input"
                checked={rating === star}
                onChange={() => {
                  setRating(star);
                  setErrors((prev) => ({ ...prev, rating: '' }));
                }}
              />
              <span className="visually-hidden">{t('reviews.starLabel', { star })}</span>
              <Icon name="star" size={28} filled={star <= (hover || rating)} />
            </label>
          ))}
        </div>
        {errors.rating && (
          <p className="field__error" role="alert">
            <Icon name="alert" size={16} />
            {t(errors.rating)}
          </p>
        )}
      </fieldset>

      <label className="field__label" htmlFor="review-comment">
        {t('reviews.commentLabel')}
      </label>
      <textarea
        id="review-comment"
        className="field__input review-form__textarea"
        rows={4}
        placeholder={t('reviews.commentPlaceholder')}
        value={comment}
        onChange={(event) => {
          setComment(event.target.value);
          setErrors((prev) => ({ ...prev, comment: '' }));
        }}
        aria-invalid={errors.comment ? 'true' : undefined}
        aria-describedby={errors.comment ? 'review-comment-error' : undefined}
      />
      {errors.comment && (
        <p id="review-comment-error" className="field__error" role="alert">
          <Icon name="alert" size={16} />
          {t(errors.comment)}
        </p>
      )}

      <div className="review-form__actions">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t('reviews.cancel')}
        </Button>
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? t('reviews.submitting') : t('reviews.submit')}
        </Button>
      </div>
    </form>
  );
}

export default ProductReviews;
