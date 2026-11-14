import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../../components/common/Button';
import Dialog from '../../../components/common/Dialog';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import StatusBadge from '../../../components/common/StatusBadge';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../hooks/useLanguage';
import { cancelReturn, dispatchReturn, getMyReturn, RETURN_CARRIERS, RETURN_STEPS } from '../../../services/returnService';
import { formatPrice } from '../../../utils/format';
import { formatDateTime, statusTone } from '../../../utils/status';
import AccountLayout from '../components/AccountLayout';

const ERROR_KEYS = {
  RETURN_NOT_CANCELLABLE: 'returns.errors.notCancellable',
  RETURN_NOT_DISPATCHABLE: 'returns.errors.notDispatchable',
};

/**
 * /account/returns/:returnId — Chi tiết yêu cầu trả hàng (GET /returns/{id}).
 *   - Thanh tiến trình: Đã gửi -> Được duyệt -> Đang gửi trả -> Shop đã nhận -> Đã hoàn tiền
 *   - REQUESTED: nút "Hủy yêu cầu"            (POST /returns/{id}/cancel)
 *   - APPROVED:  form nhập mã vận đơn gửi trả (POST /returns/{id}/dispatch)
 *   - Lịch sử (events) + thông tin hoàn tiền (refund)
 */
function ReturnDetailScreen({ onNotify }) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { returnId } = useParams();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setData(await getMyReturn(returnId));
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus(error?.status === 404 ? 'notFound' : 'error');
    }
  }, [returnId]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const run = async (action, successKey) => {
    setBusy(true);
    try {
      setData(await action());
      onNotify?.('success', t(successKey));
    } catch (error) {
      console.error(error);
      onNotify?.('error', t(ERROR_KEYS[error?.code] ?? 'account.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const handleDispatch = (event) => {
    event.preventDefault();
    if (!carrier || !tracking.trim()) {
      setFormError(t('returns.errors.dispatchMissing'));
      return;
    }
    setFormError('');
    run(() => dispatchReturn(returnId, { carrierCode: carrier, trackingNumber: tracking }), 'returns.dispatched');
  };

  const crumbs = [{ label: t('returns.title'), to: '/account/returns' }, { label: data?.shopOrderNumber ?? '…' }];

  if (status !== 'success') {
    return (
      <AccountLayout title={t('returns.detailTitle')} breadcrumb={crumbs}>
        {status === 'loading' ? (
          <div className="account-skeleton" />
        ) : (
          <div className="account-card">
            <EmptyState
              tone={status === 'error' ? 'error' : 'default'}
              icon={status === 'error' ? 'alert' : 'refresh'}
              title={status === 'error' ? t('account.loadError') : t('returns.notFound')}
              action={
                status === 'error' ? (
                  <Button variant="secondary" onClick={load}>{t('common.retry')}</Button>
                ) : (
                  <Button as={Link} to="/account/returns" variant="outline">{t('returns.backToList')}</Button>
                )
              }
            />
          </div>
        )}
      </AccountLayout>
    );
  }

  const stepIndex = RETURN_STEPS.indexOf(data.status);
  const closed = ['REJECTED', 'CANCELLED'].includes(data.status);
  const carrierOptions = RETURN_CARRIERS.map((code) => ({ id: code, name: t(`returns.carriers.${code}`) }));

  return (
    <AccountLayout
      title={t('returns.detailTitle')}
      subtitle={t('returns.detailSubtitle', { number: data.shopOrderNumber, date: formatDateTime(data.createdAt, language) })}
      breadcrumb={crumbs}
      actions={<StatusBadge tone={statusTone(data.status)}>{t(`returnStatus.${data.status}`)}</StatusBadge>}
    >
      <div className="account-card">
        {closed ? (
          <p className="order-cancelled" role="status">
            <Icon name="info" size={18} />
            {t(`returns.closed.${data.status}`)}
            {data.decisionNote && <span> — {data.decisionNote}</span>}
          </p>
        ) : (
          <ol className="order-steps order-steps--5">
            {RETURN_STEPS.map((id, index) => (
              <li
                key={id}
                className={`order-steps__step ${index <= stepIndex ? 'order-steps__step--done' : ''} ${index === stepIndex ? 'order-steps__step--current' : ''}`}
                aria-current={index === stepIndex ? 'step' : undefined}
              >
                <span className="order-steps__dot" aria-hidden="true">
                  {index < stepIndex || stepIndex === RETURN_STEPS.length - 1 ? <Icon name="check" size={16} /> : index + 1}
                </span>
                <span className="order-steps__label">{t(`returnStatus.${id}`)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {data.status === 'APPROVED' && (
        <form className="account-card return-dispatch" onSubmit={handleDispatch} noValidate>
          <h2 className="account-card__title">
            <Icon name="truck" size={18} />
            {t('returns.dispatchTitle')}
          </h2>
          <p className="account-muted">{t('returns.dispatchText')}</p>
          <div className="return-dispatch__row">
            <Select
              label={t('returns.carrier')}
              placeholder={t('addresses.choose')}
              options={carrierOptions}
              value={carrier}
              onChange={setCarrier}
            />
            <Input
              floating
              label={t('returns.trackingNumber')}
              value={tracking}
              maxLength={120}
              onChange={(event) => setTracking(event.target.value)}
            />
            <Button type="submit" disabled={busy}>
              {t('returns.dispatchSubmit')}
            </Button>
          </div>
          {formError && (
            <p className="field__error" role="alert">
              <Icon name="alert" size={16} />
              {formError}
            </p>
          )}
        </form>
      )}

      <div className="order-detail">
        <div className="order-detail__main">
          <section className="account-card shop-order">
            <header className="shop-order__head">
              <p className="shop-order__title">
                <Icon name="package" size={18} />
                {t('returns.itemsTitle')}
              </p>
              <Link to={`/account/orders/${data.orderId}`} className="account-link">
                {t('returns.viewOrder')} <Icon name="chevronRight" size={14} />
              </Link>
            </header>
            <ul className="order-items">
              {data.items.map((item) => (
                <li key={item.orderItemId} className="order-item">
                  <span className="item-thumb" aria-hidden="true">
                    <Icon name="hanger" size={26} />
                  </span>
                  <div className="order-item__info">
                    <p className="order-item__name">{item.productName}</p>
                    <p className="account-muted">SKU: {item.sellerSku}</p>
                    <p className="account-muted">
                      {t('returns.returnQtyOf', { count: item.returnQuantity, total: item.purchasedQuantity })}
                    </p>
                  </div>
                  <div className="order-item__price">
                    <strong>{formatPrice(item.requestedRefundMinor, language)}</strong>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="account-card">
            <h2 className="account-card__title">
              <Icon name="doc" size={18} />
              {t('returns.reasonTitle')}
            </h2>
            <dl className="info-list return-info">
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

        <aside className="order-detail__side">
          <div className="account-card">
            <h2 className="account-card__title">
              <Icon name="card" size={18} />
              {t('returns.refundTitle')}
            </h2>
            <dl className="order-sum">
              <div className="order-sum__total">
                <dt>{t('returns.requestedRefund')}</dt>
                <dd>{formatPrice(data.requestedRefundMinor, language)}</dd>
              </div>
              {data.refund && (
                <>
                  <div>
                    <dt>{t('returns.refundStatus')}</dt>
                    <dd>{data.refund.status}</dd>
                  </div>
                  <div>
                    <dt>{t('returns.refundAmount')}</dt>
                    <dd>{formatPrice(data.refund.amountMinor, language)}</dd>
                  </div>
                  {data.refund.processedAt && (
                    <div>
                      <dt>{t('returns.refundedAt')}</dt>
                      <dd>{formatDateTime(data.refund.processedAt, language)}</dd>
                    </div>
                  )}
                </>
              )}
            </dl>
            {data.status === 'REQUESTED' && (
              <Button variant="outline" fullWidth className="order-cancel-btn" onClick={() => setConfirmCancel(true)} disabled={busy}>
                {t('returns.cancel')}
              </Button>
            )}
          </div>

          {data.events?.length > 0 && (
            <div className="account-card">
              <h2 className="account-card__title">
                <Icon name="clock" size={18} />
                {t('returns.history')}
              </h2>
              <ol className="timeline">
                {[...data.events].reverse().map((event) => (
                  <li key={event.id} className="timeline__item">
                    <p className="timeline__title">{t(`returnStatus.${event.toStatus}`)}</p>
                    {event.note && <p className="account-muted">{event.note}</p>}
                    <time className="timeline__time" dateTime={event.occurredAt}>
                      {formatDateTime(event.occurredAt, language)}
                    </time>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </aside>
      </div>

      <Dialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        size="sm"
        title={t('returns.cancelTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
              {t('cancelOrder.keep')}
            </Button>
            <Button
              className="btn--danger"
              onClick={() => {
                setConfirmCancel(false);
                run(() => cancelReturn(returnId), 'returns.cancelled');
              }}
            >
              {t('returns.cancel')}
            </Button>
          </>
        }
      >
        <p className="account-muted">{t('returns.cancelText')}</p>
      </Dialog>
    </AccountLayout>
  );
}

export default ReturnDetailScreen;
