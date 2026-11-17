import { useState } from 'react';
import Icon from '@shared/components/common/Icon';
import StarRating from '@shared/components/common/StarRating';
import StatusBadge from '@shared/components/common/StatusBadge';
import { useLanguage } from '@shared/hooks/useLanguage';
import { getReviews, REVIEW_STATUSES, setReviewHidden } from '../../services/platformService';
import { formatDateTime } from '@shared/utils/status';
import AdminPage from '../components/AdminPage';
import { ListState, Pager, ReasonDialog, StatusTabs, useErrorText } from '../components/AdminParts';
import { useAdminList } from '../components/useAdminList';

/** /admin/reviews — Kiểm duyệt đánh giá của mọi shop: ẩn đánh giá vi phạm / khôi phục. */
function AdminReviewsScreen({ onNotify }) {
  const { t, language } = useLanguage();
  const errorText = useErrorText();
  const [status, setStatus] = useState('');
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const list = useAdminList(getReviews, { status, query });
  const [target, setTarget] = useState(null);

  const confirm = async ({ reason }) => {
    try {
      await setReviewHidden(target.id, target.status !== 'HIDDEN', reason);
      onNotify?.('success', t('market.admin.reviews.done'));
      setTarget(null);
      list.reload();
    } catch (error) {
      onNotify?.('error', errorText(error));
    }
  };

  return (
    <AdminPage title={t('market.admin.reviews.title')} subtitle={t('market.admin.reviews.subtitle')}>
      <StatusTabs value={status} options={REVIEW_STATUSES} onChange={setStatus} labelPrefix="market.reviewStatus" allLabel={t('orders.tabs.all')} />
      <section className="account-card admin-card">
        <form className="admin-toolbar" onSubmit={(e) => { e.preventDefault(); setQuery(input.trim()); }}>
          <label className="admin-search">
            <Icon name="search" size={18} />
            <input type="search" value={input} placeholder={t('market.admin.reviews.search')} aria-label={t('market.admin.reviews.search')} onChange={(e) => setInput(e.target.value)} />
          </label>
        </form>
        <ListState status={list.status} onRetry={list.reload} />
        {list.status === 'success' && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('seller.products.columns.product')}</th>
                  <th>{t('market.admin.reviews.content')}</th>
                  <th>{t('seller.orders.columns.status')}</th>
                  <th className="actions" />
                </tr>
              </thead>
              <tbody>
                {list.items.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.productName}</strong><span className="cell-sub">{r.shopName}</span></td>
                    <td>
                      <StarRating value={r.rating} size={12} />
                      {r.title && <strong> {r.title}</strong>}
                      <span className="cell-sub">{r.body}</span>
                      <span className="cell-sub">{r.buyerDisplayName} · {formatDateTime(r.createdAt, language)}</span>
                      {r.moderationReason && <span className="cell-sub">⚠ {r.moderationReason}</span>}
                    </td>
                    <td><StatusBadge tone={r.status === 'HIDDEN' ? 'danger' : 'success'}>{t(`market.reviewStatus.${r.status}`, { defaultValue: r.status })}</StatusBadge></td>
                    <td className="actions">
                      <button type="button" className="text-btn" onClick={() => setTarget(r)}>{t(r.status === 'HIDDEN' ? 'market.admin.reviews.restore' : 'market.admin.reviews.hide')}</button>
                    </td>
                  </tr>
                ))}
                {list.items.length === 0 && <tr><td colSpan={4} className="admin-table__empty">{t('market.admin.empty')}</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={list.page} hasMore={list.hasMore} onChange={list.setPage} />
      </section>
      <ReasonDialog
        open={target !== null}
        title={target ? t(target.status === 'HIDDEN' ? 'market.admin.reviews.restore' : 'market.admin.reviews.hide') : ''}
        confirmLabel={target ? t(target.status === 'HIDDEN' ? 'market.admin.reviews.restore' : 'market.admin.reviews.hide') : ''}
        danger={target?.status !== 'HIDDEN'}
        onClose={() => setTarget(null)}
        onConfirm={confirm}
      />
    </AdminPage>
  );
}

export default AdminReviewsScreen;
