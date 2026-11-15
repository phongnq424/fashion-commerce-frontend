import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import Input from '../../../components/common/Input';
import StatusBadge from '../../../components/common/StatusBadge';
import Textarea from '../../../components/common/Textarea';
import { useLanguage } from '../../../hooks/useLanguage';
import { useSeller } from '../../../hooks/useSeller';
import { RETURN_STEPS } from '../../../services/returnService';
import { decideReturn, getShopReturn, manualCodRefund, receiveReturn } from '../../../services/seller/sellerReturnService';
import { formatPrice } from '../../../utils/format';
import { formatDateTime, statusTone } from '../../../utils/status';
import RequireShop from '../components/RequireShop';
import SellerPage from '../components/SellerPage';

const ERROR_KEYS = {
  RETURN_NOT_DECIDABLE: 'seller.returns.errors.notDecidable',
  RETURN_NOT_RECEIVABLE: 'seller.returns.errors.notReceivable',
  RETURN_NOT_REFUNDABLE: 'seller.returns.errors.notRefundable',
  RETURN_ALREADY_REFUNDED: 'seller.returns.errors.alreadyRefunded',
  COD_REFUND_PAYMENT_NOT_COLLECTED: 'seller.returns.errors.codNotCollected',
  REFUND_AMOUNT_MISMATCH: 'seller.returns.errors.amount',
  RETURN_REJECTION_NOTE_REQUIRED: 'seller.returns.errors.rejectNote',
};

function ReturnDetail({ shopId, returnId, onNotify }) {
  const { t, language } = useLanguage();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [refund, setRefund] = useState({ amount: '', reference: '', note: '' });

  const load = useCallback(async () => {
    try {
      const item = await getShopReturn(shopId, returnId);
      setData(item);
      setRefund({ amount: String(item.requestedRefundMinor), reference: '', note: '' });
      setStatus('success');
    } catch (error) {
      setStatus(error?.status === 404 ? 'notFound' : 'error');
    }
  }, [shopId, returnId]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action, successKey) => {
    setBusy(true);
    try {
      await action();
      onNotify?.('success', t(successKey));
      setNote('');
      await load();
    } catch (error) {
      console.error(error);
      onNotify?.('error', t(ERROR_KEYS[error?.code] ?? 'account.actionError'));
    } finally {
      setBusy(false);
    }
  };

  if (status === 'loading') return <div className="account-skeleton" />;
  if (status !== 'success') {
    return (
      <div className="account-card">
        <EmptyState tone={status === 'error' ? 'error' : 'default'} icon="refresh" title={status === 'error' ? t('account.loadError') : t('returns.notFound')} action={<Button as={Link} to="/seller/returns" variant="outline">{t('returns.backToList')}</Button>} />
      </div>
    );
  }

  const stepIndex = RETURN_STEPS.indexOf(data.status);
  const closed = ['REJECTED', 'CANCELLED'].includes(data.status);
  const codCollected = ['COLLECTED', 'RECONCILED'].includes(data.codStatus);

  return (
    <SellerPage
      title={t('seller.returns.detailTitle', { code: data.shopOrderNumber })}
      subtitle={t('seller.returns.detailSubtitle', { name: data.buyerName ?? '—', date: formatDateTime(data.createdAt, language) })}
      badge={<StatusBadge tone={statusTone(data.status)}>{t(`returnStatus.${data.status}`)}</StatusBadge>}
      back={{ to: '/seller/returns', label: t('seller.nav.returns') }}
    >
      <div className="account-card">
        {closed ? (
          <p className="order-cancelled" role="status">
            <Icon name="info" size={18} />
            {t(`seller.returns.closed.${data.status}`)}
            {data.decisionNote && <span> — {data.decisionNote}</span>}
          </p>
        ) : (
          <ol className="order-steps order-steps--5">
            {RETURN_STEPS.map((id, index) => (
              <li key={id} className={`order-steps__step ${index <= stepIndex ? 'order-steps__step--done' : ''} ${index === stepIndex ? 'order-steps__step--current' : ''}`}>
                <span className="order-steps__dot" aria-hidden="true">
                  {index < stepIndex || (index === stepIndex && id === 'REFUNDED') ? <Icon name="check" size={16} /> : index + 1}
                </span>
                <span className="order-steps__label">{t(`returnStatus.${id}`)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* VIỆC CẦN LÀM theo trạng thái */}
      {data.status === 'REQUESTED' && (
        <section className="account-card action-panel">
          <h2 className="account-card__title">
            <Icon name="clock" size={18} />
            {t('seller.returns.panel.decideTitle')}
          </h2>
          <p className="account-muted">{t('seller.returns.panel.decideText')}</p>
          <Textarea label={t('seller.returns.panel.note')} value={note} maxLength={2000} rows={2} hint={t('seller.returns.panel.noteHint')} onChange={(e) => setNote(e.target.value)} />
          <div className="seller-form__actions">
            <Button variant="outline" className="btn--danger-outline" disabled={busy} onClick={() => (note.trim() ? run(() => decideReturn(shopId, returnId, { decision: 'REJECT', note }), 'seller.returns.toast.rejected') : onNotify?.('warning', t('seller.returns.errors.rejectNote')))}>
              {t('seller.returns.panel.reject')}
            </Button>
            <Button disabled={busy} onClick={() => run(() => decideReturn(shopId, returnId, { decision: 'APPROVE', note }), 'seller.returns.toast.approved')}>
              {t('seller.returns.panel.approve')}
            </Button>
          </div>
        </section>
      )}
      {['APPROVED', 'RETURNING'].includes(data.status) && (
        <section className="account-card action-panel">
          <h2 className="account-card__title">
            <Icon name="package" size={18} />
            {t('seller.returns.panel.receiveTitle')}
          </h2>
          <p className="account-muted">{data.status === 'APPROVED' ? t('seller.returns.panel.waitingBuyer') : t('seller.returns.panel.onTheWay', { carrier: data.carrierCode ?? '—', tracking: data.trackingNumber ?? '—' })}</p>
          <Input label={t('seller.returns.panel.note')} value={note} placeholder={t('seller.returns.panel.receivePlaceholder')} onChange={(e) => setNote(e.target.value)} />
          <div className="seller-form__actions">
            <Button disabled={busy} onClick={() => run(() => receiveReturn(shopId, returnId, { note }), 'seller.returns.toast.received')}>
              {t('seller.returns.panel.receive')}
            </Button>
          </div>
        </section>
      )}
      {data.status === 'RECEIVED' && (
        <section className="account-card action-panel">
          <h2 className="account-card__title">
            <Icon name="card" size={18} />
            {t('seller.returns.panel.refundTitle')}
          </h2>
          {codCollected ? (
            <>
              <p className="account-muted">{t('seller.returns.panel.refundText')}</p>
              <div className="seller-form__row seller-form__row--3">
                <Input label={t('seller.returns.panel.amount')} inputMode="numeric" value={refund.amount} hint={t('seller.returns.panel.amountHint')} onChange={(e) => setRefund({ ...refund, amount: e.target.value.replace(/\D/g, '') })} />
                <Input label={t('seller.returns.panel.reference')} value={refund.reference} maxLength={160} placeholder="FT26111..." onChange={(e) => setRefund({ ...refund, reference: e.target.value })} />
                <Input label={t('seller.returns.panel.note')} value={refund.note} onChange={(e) => setRefund({ ...refund, note: e.target.value })} />
              </div>
              <div className="seller-form__actions">
                <Button disabled={busy || !refund.reference.trim()} onClick={() => run(() => manualCodRefund(shopId, returnId, { amountMinor: Number(refund.amount), reference: refund.reference, note: refund.note }), 'seller.returns.toast.refunded')}>
                  {t('seller.returns.panel.refund')}
                </Button>
              </div>
            </>
          ) : (
            <p className="seller-note seller-note--warning">
              <Icon name="alert" size={18} />
              <span>{t('seller.returns.errors.codNotCollected')}</span>
            </p>
          )}
        </section>
      )}

      <div className="seller-detail">
        <div className="seller-detail__main">
          <section className="account-card shop-order">
            <header className="shop-order__head">
              <p className="shop-order__title">
                <Icon name="package" size={18} />
                {t('returns.itemsTitle')}
              </p>
            </header>
            <ul className="order-items">
              {data.items.map((line) => (
                <li key={line.orderItemId} className="order-item">
                  <span className="item-thumb" aria-hidden="true">
                    <Icon name="hanger" size={26} />
                  </span>
                  <div className="order-item__info">
                    <p className="order-item__name">{line.productName}</p>
                    <p className="account-muted">
                      SKU <code className="sku">{line.sellerSku}</code>
                    </p>
                    <p className="account-muted">{t('returns.returnQtyOf', { count: line.returnQuantity, total: line.purchasedQuantity })}</p>
                  </div>
                  <div className="order-item__price">
                    <strong>{formatPrice(line.requestedRefundMinor, language)}</strong>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section className="account-card">
            <h2 className="account-card__title seller-section-title">
              <Icon name="doc" size={18} />
              {t('returns.reasonTitle')}
            </h2>
            <dl className="info-list">
              <div className="info-list__row">
                <dt>{t('returns.columns.reason')}</dt>
                <dd>{t(`returns.reasons.${data.reasonCode}`)}</dd>
              </div>
              {data.description && (
                <div className="info-list__row">
                  <dt>{t('returns.description')}</dt>
                  <dd className="order-note">{data.description}</dd>
                </div>
              )}
              {data.trackingNumber && (
                <div className="info-list__row">
                  <dt>{t('returns.trackingNumber')}</dt>
                  <dd>
                    {t(`returns.carriers.${data.carrierCode}`)} · {data.trackingNumber}
                  </dd>
                </div>
              )}
            </dl>
            {data.evidenceKeys?.length > 0 && (
              <ul className="image-urls return-evidence">
                {data.evidenceKeys.map((url) => (
                  <li key={url} className="image-urls__item">
                    <a href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt={t('returns.evidence')} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <aside className="seller-detail__side">
          <section className="account-card">
            <h2 className="account-card__title seller-section-title">
              <Icon name="card" size={18} />
              {t('returns.refundTitle')}
            </h2>
            <dl className="order-sum">
              <div className="order-sum__total">
                <dt>{t('returns.requestedRefund')}</dt>
                <dd>{formatPrice(data.requestedRefundMinor, language)}</dd>
              </div>
              <div>
                <dt>{t('seller.returns.codStatus')}</dt>
                <dd>{data.codStatus ? t(`seller.codStatus.${data.codStatus}`) : '—'}</dd>
              </div>
              {data.refund && (
                <>
                  <div>
                    <dt>{t('returns.refundAmount')}</dt>
                    <dd>{formatPrice(data.refund.amountMinor, language)}</dd>
                  </div>
                  <div>
                    <dt>{t('seller.returns.panel.reference')}</dt>
                    <dd>{data.refund.reference}</dd>
                  </div>
                </>
              )}
            </dl>
          </section>
          <section className="account-card">
            <h2 className="account-card__title seller-section-title">
              <Icon name="clock" size={18} />
              {t('returns.history')}
            </h2>
            <ol className="timeline">
              {[...data.events].reverse().map((event) => (
                <li key={event.id} className="timeline__item">
                  <p className="timeline__title">{t(`returnStatus.${event.toStatus}`)}</p>
                  {event.note && <p className="account-muted">{event.note}</p>}
                  <time className="timeline__time">{formatDateTime(event.occurredAt, language)}</time>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </SellerPage>
  );
}

/**
 * /seller/returns/:returnId — Xử lý yêu cầu trả hàng (GET /shops/{shopId}/returns/{id}).
 *   Đã gửi yêu cầu -> Đồng ý / Từ chối (từ chối bắt buộc ghi lý do)
 *   Đã duyệt / Đang gửi trả -> Xác nhận đã nhận hàng (hoàn kho)
 *   Shop đã nhận -> Hoàn tiền COD thủ công (COD đã thu, số tiền = số yêu cầu hoàn, kèm mã giao dịch)
 */
function SellerReturnDetailScreen({ onNotify }) {
  const { returnId } = useParams();
  const { shopId } = useSeller();
  return (
    <RequireShop>
      <ReturnDetail key={`${shopId}-${returnId}`} shopId={shopId} returnId={returnId} onNotify={onNotify} />
    </RequireShop>
  );
}

export default SellerReturnDetailScreen;
