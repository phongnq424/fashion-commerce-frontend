import { useEffect, useRef, useState } from 'react';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import Textarea from '../../../components/common/Textarea';
import { useLanguage } from '../../../hooks/useLanguage';
import { formatPrice } from '../../../utils/format';
import { formatAddressLine } from '../../../services/addressService';
import { getPaymentMethods, newIdempotencyKey } from '../../../services/orderService';

/**
 * Bước "Phương thức thanh toán".
 * Danh sách phương thức lấy từ Backend: GET /checkout/{snapshotId}/payment-methods
 * (COD | MOMO | ZALOPAY | VNPAY, mỗi cái có available / unavailableReason).
 * - onPlaceOrder({ paymentMethod, buyerNote, idempotencyKey }) -> Promise
 */
function PaymentStep({ preview, onEditShipping, onPlaceOrder }) {
  const { t, language } = useLanguage();
  const [methods, setMethods] = useState(null);
  const [method, setMethod] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  // Giữ nguyên khoá chống đặt trùng cho cùng 1 lần xem trước đơn
  const keyRef = useRef({ snapshotId: null, key: null });
  if (keyRef.current.snapshotId !== preview.snapshotId) keyRef.current = { snapshotId: preview.snapshotId, key: newIdempotencyKey() };

  useEffect(() => {
    let active = true;
    setMethods(null);
    getPaymentMethods(preview.snapshotId)
      .then((list) => {
        if (!active) return;
        setMethods(list);
        setMethod((current) => current ?? list.find((item) => item.available)?.code ?? null);
      })
      .catch(() => active && setMethods([]));
    return () => {
      active = false;
    };
  }, [preview.snapshotId]);

  const submit = async () => {
    if (!method) return;
    setSubmitting(true);
    setError(null);
    try {
      await onPlaceOrder({ paymentMethod: method, buyerNote: note, idempotencyKey: keyRef.current.key });
    } catch (err) {
      console.error(err);
      setError(err?.code ?? 'UNKNOWN');
      setSubmitting(false);
    }
  };

  const recipient = preview.recipient;

  return (
    <section className="checkout-section" aria-labelledby="payment-title">
      <dl className="checkout-review">
        <div className="checkout-review__row">
          <dt>{t('checkout.shipTo')}</dt>
          <dd>
            <strong>{recipient?.recipientName}</strong> · {recipient?.recipientPhone}
            <br />
            {formatAddressLine(recipient)}
          </dd>
          <button type="button" className="checkout-link" onClick={onEditShipping}>
            {t('market.checkout.change')}
          </button>
        </div>
      </dl>

      <h2 id="payment-title" className="checkout-section__title">
        {t('checkout.stepPayment')}
      </h2>

      {methods === null ? (
        <p>{t('market.common.loading')}</p>
      ) : methods.length === 0 ? (
        <p className="checkout-alert">{t('market.checkout.noPaymentMethods')}</p>
      ) : (
        <fieldset className="payment-methods">
          <legend className="payment-methods__legend visually-hidden">{t('checkout.stepPayment')}</legend>
          {methods.map((item) => (
            <label
              key={item.code}
              className={`payment-method ${method === item.code ? 'payment-method--active' : ''}`}
              aria-disabled={!item.available}
              style={item.available ? undefined : { opacity: 0.55 }}
            >
              <span className="payment-method__head">
                <input
                  type="radio"
                  className="payment-method__radio"
                  name="payment-method"
                  value={item.code}
                  checked={method === item.code}
                  disabled={!item.available}
                  onChange={() => setMethod(item.code)}
                />
                <span className="payment-method__title">{t(`market.paymentMethods.${item.code}`, { defaultValue: item.displayName })}</span>
              </span>
              <span className="payment-method__desc">
                {item.available ? t(`market.paymentMethodsDesc.${item.code}`) : t(`market.paymentStatus.${item.status}`)}
              </span>
            </label>
          ))}
        </fieldset>
      )}

      <Textarea
        label={t('market.checkout.buyerNote')}
        value={note}
        maxLength={500}
        rows={3}
        onChange={(event) => setNote(event.target.value)}
      />

      {preview.issues?.length > 0 && (
        <p className="checkout-alert" role="alert">{t('market.checkout.hasIssues')}</p>
      )}
      {error && (
        <p className="checkout-alert" role="alert">
          {t(`market.errors.${error}`, { defaultValue: t('checkout.errors.placeOrderFailed') })}
        </p>
      )}

      <div className="checkout-actions">
        <button type="button" className="checkout-link" onClick={onEditShipping}>
          <Icon name="chevronLeft" size={14} /> {t('market.checkout.backToAddress')}
        </button>
        <Button
          className="checkout-actions__next"
          onClick={submit}
          disabled={!method || submitting || !preview.readyForOrder}
        >
          {submitting ? t('checkout.placing') : `${t('checkout.placeOrder')} · ${formatPrice(preview.grandTotalMinor, language)}`}
        </Button>
      </div>
    </section>
  );
}

export default PaymentStep;
