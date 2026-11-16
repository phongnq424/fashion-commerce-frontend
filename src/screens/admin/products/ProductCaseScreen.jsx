import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button';
import Dialog from '../../../components/common/Dialog';
import StatusBadge from '../../../components/common/StatusBadge';
import Textarea from '../../../components/common/Textarea';
import { useLanguage } from '../../../hooks/useLanguage';
import { CASE_STATUSES, getModerationCase, getModerationCases, moderateProduct, PRODUCT_ACTIONS } from '../../../services/admin/platformService';
import { formatDateTime, statusTone } from '../../../utils/status';
import AdminPage from '../components/AdminPage';
import { ListState, Pager, StatusTabs, useErrorText } from '../components/AdminParts';
import { useAdminList } from '../components/useAdminList';

function CaseDialog({ caseId, onClose, onDone, onNotify }) {
  const { t, language } = useLanguage();
  const errorText = useErrorText();
  const [detail, setDetail] = useState(null);
  const [action, setAction] = useState('DISMISS');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadedId, setLoadedId] = useState(null);

  if (caseId && loadedId !== caseId) {
    setLoadedId(caseId);
    setDetail(null);
    setReason('');
    getModerationCase(caseId).then(setDetail).catch((error) => onNotify?.('error', errorText(error)));
  }

  const submit = async () => {
    setBusy(true);
    try {
      await moderateProduct(detail.productId, { caseId: detail.id, action, reason });
      onNotify?.('success', t('market.admin.cases.done'));
      onDone();
    } catch (error) {
      onNotify?.('error', errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const open = Boolean(caseId);
  const resolvable = detail && ['OPEN', 'UNDER_REVIEW'].includes(detail.status);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={detail?.productName ?? t('market.admin.cases.title')}
      footer={
        resolvable && (
          <>
            <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
            <Button disabled={busy || !reason.trim()} onClick={submit}>{t('market.admin.cases.apply')}</Button>
          </>
        )
      }
    >
      {!detail ? (
        <div className="account-skeleton" />
      ) : (
        <>
          <dl className="checkout-review">
            <div className="checkout-review__row"><dt>{t('market.admin.cases.reason')}</dt><dd>{t(`market.reportReasons.${detail.reasonCode}`, { defaultValue: detail.reasonCode })}</dd></div>
            <div className="checkout-review__row"><dt>{t('market.admin.cases.description')}</dt><dd>{detail.description || '—'}</dd></div>
            <div className="checkout-review__row"><dt>{t('market.admin.cases.evidence')}</dt><dd>{(detail.evidenceKeys ?? []).map((url) => <a key={url} href={url} target="_blank" rel="noreferrer" className="account-link">{url}</a>)}</dd></div>
            <div className="checkout-review__row"><dt>{t('market.admin.cases.reportedAt')}</dt><dd>{formatDateTime(detail.createdAt, language)}</dd></div>
            {detail.resolutionAction && <div className="checkout-review__row"><dt>{t('market.admin.cases.resolution')}</dt><dd>{detail.resolutionAction} — {detail.resolutionNote}</dd></div>}
          </dl>
          <p><Link to={`/product/${detail.productId}`} target="_blank" className="account-link">{t('market.admin.cases.viewProduct')}</Link></p>
          {resolvable && (
            <>
              <fieldset className="payment-methods">
                <legend className="payment-methods__legend">{t('market.admin.cases.action')}</legend>
                {PRODUCT_ACTIONS.map((a) => (
                  <label key={a} className={`payment-method ${action === a ? 'payment-method--active' : ''}`}>
                    <span className="payment-method__head">
                      <input type="radio" className="payment-method__radio" name="case-action" checked={action === a} onChange={() => setAction(a)} />
                      <span className="payment-method__title">{t(`market.admin.cases.actions.${a}`)}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              <Textarea label={t('market.admin.reason')} value={reason} maxLength={2000} rows={3} onChange={(e) => setReason(e.target.value)} />
            </>
          )}
        </>
      )}
    </Dialog>
  );
}

/** /admin/product-cases — Sản phẩm bị khách báo cáo vi phạm (cảnh báo / ẩn / gỡ / khôi phục / bỏ qua). */
function ProductCaseScreen({ onNotify }) {
  const { t, language } = useLanguage();
  const [status, setStatus] = useState('OPEN');
  const list = useAdminList(getModerationCases, { status });
  const [openId, setOpenId] = useState(null);

  return (
    <AdminPage title={t('market.admin.cases.title')} subtitle={t('market.admin.cases.subtitle')}>
      <StatusTabs value={status} options={CASE_STATUSES} onChange={setStatus} labelPrefix="market.caseStatus" />
      <section className="account-card admin-card">
        <ListState status={list.status} onRetry={list.reload} />
        {list.status === 'success' && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('seller.products.columns.product')}</th>
                  <th>{t('market.admin.cases.reason')}</th>
                  <th>{t('seller.orders.columns.status')}</th>
                  <th>{t('market.admin.cases.reportedAt')}</th>
                  <th className="actions" />
                </tr>
              </thead>
              <tbody>
                {list.items.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{row.productName}</strong></td>
                    <td>{t(`market.reportReasons.${row.reasonCode}`, { defaultValue: row.reasonCode })}</td>
                    <td><StatusBadge tone={statusTone(row.status === 'OPEN' ? 'PENDING' : row.status)}>{t(`market.caseStatus.${row.status}`, { defaultValue: row.status })}</StatusBadge></td>
                    <td>{formatDateTime(row.createdAt, language)}</td>
                    <td className="actions"><button type="button" className="text-btn" onClick={() => setOpenId(row.id)}>{t('market.admin.view')}</button></td>
                  </tr>
                ))}
                {list.items.length === 0 && <tr><td colSpan={5} className="admin-table__empty">{t('market.admin.empty')}</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={list.page} hasMore={list.hasMore} onChange={list.setPage} />
      </section>
      <CaseDialog
        caseId={openId}
        onClose={() => setOpenId(null)}
        onDone={() => {
          setOpenId(null);
          list.reload();
        }}
        onNotify={onNotify}
      />
    </AdminPage>
  );
}

export default ProductCaseScreen;
