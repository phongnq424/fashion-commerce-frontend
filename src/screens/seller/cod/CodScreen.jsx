import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button';
import Dialog from '../../../components/common/Dialog';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import Input from '../../../components/common/Input';
import StatusBadge from '../../../components/common/StatusBadge';
import Textarea from '../../../components/common/Textarea';
import { useLanguage } from '../../../hooks/useLanguage';
import { useSeller } from '../../../hooks/useSeller';
import { collectCod, COD_STATUSES, failCod, getCodCollection, getCodCollections, reconcileCod } from '../../../services/seller/codService';
import { formatPrice } from '../../../utils/format';
import { formatDateTime, statusTone } from '../../../utils/status';
import RequireShop from '../components/RequireShop';
import SellerPage from '../components/SellerPage';

const TABS = ['all', ...COD_STATUSES];

const ERROR_KEYS = {
  COD_ORDER_NOT_DELIVERED: 'seller.cod.errors.notDelivered',
  COD_AMOUNT_MISMATCH: 'seller.cod.errors.amount',
  COD_COLLECTION_NOT_COLLECTABLE: 'seller.cod.errors.notCollectable',
  COD_COLLECTION_NOT_RECONCILABLE: 'seller.cod.errors.notReconcilable',
};

function CodTable({ shopId, onNotify }) {
  const { t, language } = useLanguage();
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get('status')) ? params.get('status') : 'all';
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [dialog, setDialog] = useState(null); // { type: collect|fail|reconcile|detail, item }
  const [form, setForm] = useState({});
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems((await getCodCollections(shopId)).items);
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }, [shopId]);

  useEffect(() => {
    setStatus('loading');
    load();
  }, [load]);

  const sum = (statuses) => items.filter((c) => statuses.includes(c.status)).reduce((s, c) => s + (c.collectedAmountMinor ?? c.expectedAmountMinor), 0);
  const shown = items.filter((c) => tab === 'all' || c.status === tab);

  const open = async (type, item) => {
    setDialog({ type, item });
    if (type === 'collect') setForm({ amount: String(item.expectedAmountMinor), reference: '', note: '' });
    if (type === 'fail') setForm({ reason: '' });
    if (type === 'reconcile') setForm({ reference: '', note: '' });
    if (type === 'detail') {
      setDetail(null);
      setDetail(await getCodCollection(shopId, item.id));
    }
  };

  const submit = async () => {
    const { type, item } = dialog;
    setBusy(true);
    try {
      if (type === 'collect') await collectCod(shopId, item.id, { amountCollectedMinor: Number(form.amount), collectionReference: form.reference, note: form.note });
      if (type === 'fail') await failCod(shopId, item.id, { reason: form.reason });
      if (type === 'reconcile') await reconcileCod(shopId, item.id, { reconciliationReference: form.reference, note: form.note });
      onNotify?.('success', t(`seller.cod.toast.${type}`));
      setDialog(null);
      await load();
    } catch (error) {
      console.error(error);
      onNotify?.('error', t(ERROR_KEYS[error?.code] ?? 'account.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const valid =
    dialog?.type === 'collect' ? form.amount && form.reference?.trim() : dialog?.type === 'fail' ? form.reason?.trim() : dialog?.type === 'reconcile' ? form.reference?.trim() : true;

  return (
    <>
      <ul className="seller-stats seller-stats--3">
        <li className="seller-stat">
          <span className="seller-stat__value">{formatPrice(sum(['AWAITING_COLLECTION', 'COLLECTION_FAILED']), language)}</span>
          <span className="seller-stat__label">{t('seller.cod.stats.awaiting')}</span>
        </li>
        <li className="seller-stat">
          <span className="seller-stat__value">{formatPrice(sum(['COLLECTED']), language)}</span>
          <span className="seller-stat__label">{t('seller.cod.stats.collected')}</span>
        </li>
        <li className="seller-stat">
          <span className="seller-stat__value">{formatPrice(sum(['RECONCILED']), language)}</span>
          <span className="seller-stat__label">{t('seller.cod.stats.reconciled')}</span>
        </li>
      </ul>

      <div className="account-tabs" role="tablist" aria-label={t('seller.cod.title')}>
        {TABS.map((id) => (
          <button key={id} type="button" role="tab" className="account-tabs__tab" aria-selected={id === tab} onClick={() => setParams(id === 'all' ? {} : { status: id }, { replace: true })}>
            {id === 'all' ? t('orders.tabs.all') : t(`seller.codStatus.${id}`)}
            {status === 'success' && <span className="account-tabs__count">({id === 'all' ? items.length : items.filter((c) => c.status === id).length})</span>}
          </button>
        ))}
      </div>

      <section className="account-card seller-card">
        {status === 'loading' && <div className="account-skeleton" />}
        {status === 'error' && <EmptyState tone="error" icon="alert" title={t('account.loadError')} action={<Button variant="secondary" onClick={load}>{t('common.retry')}</Button>} />}
        {status === 'success' && (
          <div className="seller-table-wrap">
            <table className="seller-table">
              <thead>
                <tr>
                  <th>{t('seller.orders.columns.code')}</th>
                  <th>{t('seller.orders.columns.buyer')}</th>
                  <th className="num">{t('seller.cod.expected')}</th>
                  <th className="num">{t('seller.cod.collected')}</th>
                  <th>{t('seller.cod.orderStatus')}</th>
                  <th>{t('seller.cod.codStatus')}</th>
                  <th>{t('seller.products.columns.updated')}</th>
                  <th className="actions">{t('seller.products.columns.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((item) => {
                  const delivered = item.shopOrderStatus === 'COMPLETED';
                  return (
                    <tr key={item.id}>
                      <td>
                        <Link to={`/seller/orders/${item.shopOrderId}`} className="account-link">
                          {item.shopOrderNumber}
                        </Link>
                        <span className="cell-sub">{item.orderNumber}</span>
                      </td>
                      <td>{item.recipientName}</td>
                      <td className="num">{formatPrice(item.expectedAmountMinor, language)}</td>
                      <td className="num">{item.collectedAmountMinor != null ? formatPrice(item.collectedAmountMinor, language) : '—'}</td>
                      <td>{item.shopOrderStatus ? t(`shopOrderStatus.${item.shopOrderStatus}`) : '—'}</td>
                      <td>
                        <StatusBadge tone={statusTone(item.status)}>{t(`seller.codStatus.${item.status}`)}</StatusBadge>
                      </td>
                      <td>{formatDateTime(item.updatedAt, language)}</td>
                      <td className="actions">
                        {['AWAITING_COLLECTION', 'COLLECTION_FAILED'].includes(item.status) && (
                          <button type="button" className="text-btn" disabled={!delivered} title={!delivered ? t('seller.cod.errors.notDelivered') : undefined} onClick={() => open('collect', item)}>
                            {t('seller.cod.actions.collect')}
                          </button>
                        )}
                        {item.status === 'AWAITING_COLLECTION' && (
                          <button type="button" className="text-btn text-btn--danger" onClick={() => open('fail', item)}>
                            {t('seller.cod.actions.fail')}
                          </button>
                        )}
                        {item.status === 'COLLECTED' && (
                          <button type="button" className="text-btn" onClick={() => open('reconcile', item)}>
                            {t('seller.cod.actions.reconcile')}
                          </button>
                        )}
                        <button type="button" className="text-btn" onClick={() => open('detail', item)}>
                          {t('seller.cod.actions.history')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={8} className="seller-table__empty">
                      {t('seller.cod.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        size="sm"
        title={dialog ? t(`seller.cod.dialogs.${dialog.type}`) : ''}
        description={dialog ? `${dialog.item.shopOrderNumber} · ${formatPrice(dialog.item.expectedAmountMinor, language)}` : undefined}
        footer={
          dialog?.type === 'detail' ? (
            <Button variant="ghost" onClick={() => setDialog(null)}>
              {t('common.close')}
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setDialog(null)}>
                {t('common.cancel')}
              </Button>
              <Button className={dialog?.type === 'fail' ? 'btn--danger' : ''} onClick={submit} disabled={busy || !valid}>
                {busy ? t('common.saving') : t(`seller.cod.actions.${dialog?.type}`)}
              </Button>
            </>
          )
        }
      >
        <div className="seller-form">
          {dialog?.type === 'collect' && (
            <>
              <Input label={t('seller.cod.amount')} inputMode="numeric" value={form.amount} hint={t('seller.cod.amountHint')} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/\D/g, '') })} />
              <Input label={t('seller.cod.reference')} value={form.reference} maxLength={160} placeholder="GHN-COD-..." onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              <Input label={t('seller.inventory.note')} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </>
          )}
          {dialog?.type === 'fail' && (
            <Textarea label={t('seller.cod.failReason')} value={form.reason} rows={3} placeholder={t('seller.cod.failPlaceholder')} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          )}
          {dialog?.type === 'reconcile' && (
            <>
              <Input label={t('seller.cod.reconcileRef')} value={form.reference} maxLength={160} placeholder="DS-2026-W46" onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              <Input label={t('seller.inventory.note')} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </>
          )}
          {dialog?.type === 'detail' &&
            (!detail ? (
              <div className="account-skeleton" />
            ) : (
              <>
                <dl className="order-sum">
                  {detail.collectionReference && (
                    <div>
                      <dt>{t('seller.cod.reference')}</dt>
                      <dd>{detail.collectionReference}</dd>
                    </div>
                  )}
                  {detail.reconciliationReference && (
                    <div>
                      <dt>{t('seller.cod.reconcileRef')}</dt>
                      <dd>{detail.reconciliationReference}</dd>
                    </div>
                  )}
                  {detail.failureReason && (
                    <div>
                      <dt>{t('seller.cod.failReason')}</dt>
                      <dd>{detail.failureReason}</dd>
                    </div>
                  )}
                </dl>
                <ol className="timeline">
                  {[...detail.events].reverse().map((event) => (
                    <li key={event.id} className="timeline__item">
                      <p className="timeline__title">{t(`seller.codStatus.${event.toStatus}`)}</p>
                      {event.note && <p className="account-muted">{event.note}</p>}
                      <time className="timeline__time">{formatDateTime(event.occurredAt, language)}</time>
                    </li>
                  ))}
                </ol>
              </>
            ))}
        </div>
      </Dialog>
    </>
  );
}

/**
 * /seller/cod — Thu hộ COD & đối soát (GET /shops/{shopId}/cod-payments).
 * 3 ô tổng tiền (chờ thu / đã thu chưa đối soát / đã đối soát) • tab trạng thái • bảng từng đơn với nút:
 *   Xác nhận đã thu (đơn đã giao, đúng số tiền) • Thu thất bại • Đối soát • Lịch sử.
 */
function CodScreen({ onNotify }) {
  const { t } = useLanguage();
  const { shopId } = useSeller();
  return (
    <SellerPage title={t('seller.cod.title')} subtitle={t('seller.cod.subtitle')}>
      <RequireShop>
        <CodTable key={shopId} shopId={shopId} onNotify={onNotify} />
      </RequireShop>
    </SellerPage>
  );
}

export default CodScreen;
