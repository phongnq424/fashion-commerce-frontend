import { useState } from 'react';
import StatusBadge from '@shared/components/common/StatusBadge';
import { useLanguage } from '@shared/hooks/useLanguage';
import { approvePayout, getPayouts, markPayoutPaid, PAYOUT_STATUSES, rejectPayout } from '../../services/platformService';
import { formatPrice } from '@shared/utils/format';
import { formatDateTime, statusTone } from '@shared/utils/status';
import AdminPage from '../components/AdminPage';
import { ListState, Pager, ReasonDialog, StatusTabs, useErrorText } from '../components/AdminParts';
import { useAdminList } from '../components/useAdminList';

/**
 * /admin/payouts — Yêu cầu rút tiền của các shop.
 * REQUESTED -> Duyệt (APPROVED) / Từ chối (REJECTED, trả tiền về số dư) ; APPROVED -> Đã chi (PAID, nhập mã giao dịch).
 */
function PayoutScreen({ onNotify }) {
  const { t, language } = useLanguage();
  const errorText = useErrorText();
  const [status, setStatus] = useState('REQUESTED');
  const list = useAdminList(getPayouts, { status });
  const [target, setTarget] = useState(null); // { payout, action: 'approve'|'reject'|'paid' }

  const confirm = async ({ reason, extra }) => {
    try {
      if (target.action === 'approve') await approvePayout(target.payout, reason);
      if (target.action === 'reject') await rejectPayout(target.payout, reason);
      if (target.action === 'paid') await markPayoutPaid(target.payout, { paymentReference: extra, note: reason });
      onNotify?.('success', t('market.admin.payouts.done'));
      setTarget(null);
      list.reload();
    } catch (error) {
      onNotify?.('error', errorText(error));
    }
  };

  return (
    <AdminPage title={t('market.admin.payouts.title')} subtitle={t('market.admin.payouts.subtitle')}>
      <StatusTabs value={status} options={PAYOUT_STATUSES} onChange={setStatus} labelPrefix="market.payoutStatus" allLabel={t('orders.tabs.all')} />
      <section className="account-card admin-card">
        <ListState status={list.status} onRetry={list.reload} />
        {list.status === 'success' && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('market.finance.columns.code')}</th>
                  <th>{t('market.admin.sellerReviews.shop')}</th>
                  <th className="num">{t('market.finance.amount')}</th>
                  <th>{t('seller.orders.columns.status')}</th>
                  <th>{t('market.finance.columns.note')}</th>
                  <th>{t('market.finance.columns.createdAt')}</th>
                  <th className="actions" />
                </tr>
              </thead>
              <tbody>
                {list.items.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.payoutNumber}</strong>{p.paymentReference && <span className="cell-sub">{p.paymentReference}</span>}</td>
                    <td><code className="sku">{String(p.shopId).slice(0, 8)}</code></td>
                    <td className="num">{formatPrice(p.amountMinor, language)}</td>
                    <td><StatusBadge tone={statusTone(p.status)}>{t(`market.payoutStatus.${p.status}`, { defaultValue: p.status })}</StatusBadge></td>
                    <td>{p.sellerNote || '—'}{p.decisionNote && <span className="cell-sub">{p.decisionNote}</span>}</td>
                    <td>{formatDateTime(p.createdAt, language)}</td>
                    <td className="actions">
                      {p.status === 'REQUESTED' && (
                        <>
                          <button type="button" className="text-btn" onClick={() => setTarget({ payout: p, action: 'approve' })}>{t('market.admin.approve')}</button>{' '}
                          <button type="button" className="text-btn" onClick={() => setTarget({ payout: p, action: 'reject' })}>{t('market.admin.reject')}</button>
                        </>
                      )}
                      {p.status === 'APPROVED' && (
                        <button type="button" className="text-btn" onClick={() => setTarget({ payout: p, action: 'paid' })}>{t('market.admin.payouts.markPaid')}</button>
                      )}
                    </td>
                  </tr>
                ))}
                {list.items.length === 0 && <tr><td colSpan={7} className="admin-table__empty">{t('market.admin.empty')}</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={list.page} hasMore={list.hasMore} onChange={list.setPage} />
      </section>
      <ReasonDialog
        open={target !== null}
        title={target ? `${t(`market.admin.payouts.actions.${target.action}`)} — ${target.payout.payoutNumber}` : ''}
        description={target ? formatPrice(target.payout.amountMinor, language) : ''}
        confirmLabel={target ? t(`market.admin.payouts.actions.${target.action}`) : ''}
        danger={target?.action === 'reject'}
        requireReason={target?.action !== 'paid'}
        extraField={target?.action === 'paid' ? { key: 'ref', label: t('market.admin.payouts.reference') } : undefined}
        onClose={() => setTarget(null)}
        onConfirm={confirm}
      />
    </AdminPage>
  );
}

export default PayoutScreen;
