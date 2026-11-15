import { useCallback, useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import Textarea from '../../../components/common/Textarea';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAdmin } from '../../../hooks/useAdmin';
import { getShopReviews, replyReview } from '../../../services/admin/reviewAdminService';
import { formatDateTime } from '../../../utils/status';
import RequireShop from '../components/RequireShop';
import AdminPage from '../components/AdminPage';

const FILTERS = ['all', 'unreplied', 'replied', '5', '4', '3', 'low'];

function Stars({ rating }) {
  return (
    <span className="review-stars" aria-label={`${rating}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="star" size={14} filled={n <= rating} />
      ))}
    </span>
  );
}

function ReviewList({ shopId, onNotify }) {
  const { t, language } = useLanguage();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null); // reviewId đang viết trả lời
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await getShopReviews(shopId));
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }, [shopId]);

  useEffect(() => {
    load();
  }, [load]);

  const match = (review) =>
    filter === 'all' ||
    (filter === 'unreplied' && !review.sellerReply) ||
    (filter === 'replied' && review.sellerReply) ||
    (filter === 'low' && review.rating <= 2) ||
    String(review.rating) === filter;

  const save = async (review) => {
    setSaving(true);
    try {
      await replyReview(shopId, review.id, draft);
      onNotify?.('success', t('admin.reviews.replied'));
      setEditing(null);
      await load();
    } catch (error) {
      console.error(error);
      onNotify?.('error', t('account.actionError'));
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') return <div className="account-skeleton" />;
  if (status === 'error') return <EmptyState tone="error" icon="alert" title={t('account.loadError')} action={<Button variant="secondary" onClick={load}>{t('common.retry')}</Button>} />;

  const items = data.items.filter(match);
  const unreplied = data.items.filter((r) => !r.sellerReply).length;

  return (
    <>
      <ul className="admin-stats admin-stats--3">
        <li className="admin-stat">
          <span className="admin-stat__value">
            {data.summary.averageRating.toFixed(1)} <Icon name="star" size={18} filled />
          </span>
          <span className="admin-stat__label">{t('admin.reviews.average')}</span>
        </li>
        <li className="admin-stat">
          <span className="admin-stat__value">{data.summary.count}</span>
          <span className="admin-stat__label">{t('admin.reviews.total')}</span>
        </li>
        <li className="admin-stat">
          <span className="admin-stat__value">{unreplied}</span>
          <span className="admin-stat__label">{t('admin.reviews.unreplied')}</span>
        </li>
      </ul>

      <div className="account-tabs" role="tablist" aria-label={t('admin.reviews.title')}>
        {FILTERS.map((id) => (
          <button key={id} type="button" role="tab" className="account-tabs__tab" aria-selected={id === filter} onClick={() => setFilter(id)}>
            {t(`admin.reviews.filters.${id}`)}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="account-card">
          <EmptyState icon="star" title={t('admin.reviews.empty')} />
        </div>
      ) : (
        <ul className="review-list">
          {items.map((review) => (
            <li key={review.id} className="account-card review-item">
              <div className="review-item__product">
                <span className="cell-product__img">{review.productImageUrl ? <img src={review.productImageUrl} alt="" loading="lazy" /> : <Icon name="image" />}</span>
                <span className="cell-product__name">{review.productName}</span>
              </div>
              <div className="review-item__body">
                <p className="review-item__head">
                  <strong>{review.buyerDisplayName}</strong>
                  <Stars rating={review.rating} />
                  <span className="cell-sub">{formatDateTime(review.createdAt, language)}</span>
                </p>
                {review.title && <p className="review-item__title">{review.title}</p>}
                {review.body && <p className="review-item__text">{review.body}</p>}

                {review.sellerReply && editing !== review.id && (
                  <div className="review-item__reply">
                    <p className="review-item__reply-head">
                      <Icon name="store" size={14} />
                      {t('admin.reviews.yourReply')} · <span className="cell-sub">{formatDateTime(review.sellerRepliedAt, language)}</span>
                    </p>
                    <p>{review.sellerReply}</p>
                  </div>
                )}

                {editing === review.id ? (
                  <div className="review-item__editor">
                    <Textarea label={t('admin.reviews.replyLabel')} value={draft} maxLength={5000} rows={3} placeholder={t('admin.reviews.replyPlaceholder')} onChange={(e) => setDraft(e.target.value)} />
                    <div className="admin-form__actions">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                        {t('common.cancel')}
                      </Button>
                      <Button size="sm" disabled={saving || !draft.trim()} onClick={() => save(review)}>
                        {saving ? t('common.saving') : t('admin.reviews.send')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => {
                      setEditing(review.id);
                      setDraft(review.sellerReply ?? '');
                    }}
                  >
                    <Icon name={review.sellerReply ? 'edit' : 'mail'} size={14} />
                    {review.sellerReply ? t('admin.reviews.editReply') : t('admin.reviews.reply')}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * /admin/reviews — Đánh giá của khách cho sản phẩm của shop + trả lời
 * (PUT /shops/{shopId}/reviews/{reviewId}/reply — gửi lại là sửa câu trả lời; khách nhận thông báo).
 * Lọc: Tất cả / Chưa trả lời / Đã trả lời / 5★ / 4★ / 3★ / 1–2★.
 */
function AdminReviewsScreen({ onNotify }) {
  const { t } = useLanguage();
  const { shopId } = useAdmin();
  return (
    <AdminPage title={t('admin.reviews.title')} subtitle={t('admin.reviews.subtitle')}>
      <RequireShop>
        <ReviewList key={shopId} shopId={shopId} onNotify={onNotify} />
      </RequireShop>
    </AdminPage>
  );
}

export default AdminReviewsScreen;
