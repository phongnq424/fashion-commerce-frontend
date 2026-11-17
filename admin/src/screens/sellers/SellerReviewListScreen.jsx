import { useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '@shared/components/common/StatusBadge';
import { useLanguage } from '@shared/hooks/useLanguage';
import { getOnboardingQueue, ONBOARDING_REVIEW_STATUSES } from '../../services/platformService';
import { formatDateTime, statusTone } from '@shared/utils/status';
import AdminPage from '../components/AdminPage';
import { ListState, Pager, StatusTabs } from '../components/AdminParts';
import { useAdminList } from '../components/useAdminList';

/** /admin/seller-reviews — Hàng đợi hồ sơ đăng ký bán hàng (GET /admin/seller-onboardings/reviews). */
function SellerReviewListScreen() {
  const { t, language } = useLanguage();
  const [status, setStatus] = useState('PENDING_REVIEW');
  const list = useAdminList(getOnboardingQueue, { status });

  return (
    <AdminPage title={t('market.admin.sellerReviews.title')} subtitle={t('market.admin.sellerReviews.subtitle')}>
      <StatusTabs value={status} options={ONBOARDING_REVIEW_STATUSES} onChange={setStatus} labelPrefix="seller.onboardingStatus" />
      <section className="account-card admin-card">
        <ListState status={list.status} onRetry={list.reload} />
        {list.status === 'success' && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('market.admin.sellerReviews.shop')}</th>
                  <th>{t('market.admin.sellerReviews.applicant')}</th>
                  <th>{t('market.admin.sellerReviews.tax')}</th>
                  <th>{t('market.admin.sellerReviews.identity')}</th>
                  <th>{t('seller.orders.columns.status')}</th>
                  <th>{t('market.admin.sellerReviews.submittedAt')}</th>
                  <th className="actions" />
                </tr>
              </thead>
              <tbody>
                {list.items.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{row.shopName ?? '—'}</strong><span className="cell-sub">{row.shopSlug}</span></td>
                    <td>{row.applicantDisplayName}<span className="cell-sub">{row.applicantEmail}</span></td>
                    <td>{row.taxStatus ?? '—'}</td>
                    <td>{row.identityStatus ?? '—'}</td>
                    <td><StatusBadge tone={statusTone(row.status)}>{t(`seller.onboardingStatus.${row.status}`, { defaultValue: row.status })}</StatusBadge></td>
                    <td>{formatDateTime(row.submittedAt ?? row.updatedAt, language)}</td>
                    <td className="actions"><Link to={`/seller-reviews/${row.id}`} className="text-btn">{t('market.admin.view')}</Link></td>
                  </tr>
                ))}
                {list.items.length === 0 && <tr><td colSpan={7} className="admin-table__empty">{t('market.admin.empty')}</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={list.page} hasMore={list.hasMore} onChange={list.setPage} />
      </section>
    </AdminPage>
  );
}

export default SellerReviewListScreen;
