import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import Textarea from '../../../components/common/Textarea';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../hooks/useLanguage';
import { getMyOrder } from '../../../services/myOrderService';
import { createReturn, RETURN_REASONS } from '../../../services/returnService';
import { formatPrice } from '../../../utils/format';
import { formatOptions } from '../../../utils/status';
import AccountLayout from '../components/AccountLayout';
import ImageUrlField from '../orders/components/ImageUrlField';

const ERROR_KEYS = {
  RETURN_NOT_ELIGIBLE: 'returns.errors.notEligible',
  RETURN_ITEM_INVALID: 'returns.errors.itemInvalid',
  RETURN_QUANTITY_EXCEEDED: 'returns.errors.quantity',
};

/**
 * /account/returns/new?orderId=...&shopOrderId=... — Tạo yêu cầu trả hàng / hoàn tiền.
 * Bố cục 3 bước trên 1 trang (kiểu form của các sàn): 1. Chọn sản phẩm + số lượng  2. Lý do  3. Mô tả + ảnh
 * Cột phải: tóm tắt số tiền hoàn dự kiến + nút Gửi.
 * POST /returns { shopOrderId, reasonCode, description, evidenceKeys, items[{ orderItemId, quantity }] }
 */
function ReturnRequestScreen({ onNotify }) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const shopOrderId = searchParams.get('shopOrderId');

  const [shopOrder, setShopOrder] = useState(null);
  const [status, setStatus] = useState('loading');
  const [quantities, setQuantities] = useState({}); // orderItemId -> số lượng trả (0 = không trả)
  const [reasonCode, setReasonCode] = useState('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !orderId) {
      if (!orderId) setStatus('notFound');
      return;
    }
    let active = true;
    getMyOrder(orderId)
      .then((order) => {
        if (!active) return;
        const found = order.shops?.find((shop) => shop.id === shopOrderId);
        setShopOrder(found ? { ...found, orderNumber: order.orderNumber, orderId: order.id } : null);
        setStatus(found ? 'success' : 'notFound');
      })
      .catch(() => active && setStatus('error'));
    return () => {
      active = false;
    };
  }, [user, orderId, shopOrderId]);

  const selected = useMemo(
    () => (shopOrder?.items ?? []).filter((item) => (quantities[item.id] ?? 0) > 0),
    [shopOrder, quantities],
  );
  const refundEstimate = selected.reduce(
    (sum, item) => sum + Math.round((item.lineTotalMinor / item.quantity) * quantities[item.id]),
    0,
  );

  const setQty = (item, value) =>
    setQuantities((current) => ({ ...current, [item.id]: Math.max(0, Math.min(item.quantity, value)) }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (selected.length === 0) return setError(t('returns.errors.noItem'));
    if (!reasonCode) return setError(t('returns.errors.noReason'));
    if (reasonCode === 'OTHER' && !description.trim()) return setError(t('returns.errors.noDescription'));
    setError('');
    setSubmitting(true);
    try {
      const created = await createReturn({
        shopOrderId,
        reasonCode,
        description,
        evidenceKeys: evidence,
        items: selected.map((item) => ({ orderItemId: item.id, quantity: quantities[item.id] })),
      });
      onNotify?.('success', t('returns.created'));
      navigate(`/account/returns/${created.id}`, { replace: true });
    } catch (apiError) {
      console.error(apiError);
      setError(t(ERROR_KEYS[apiError?.code] ?? 'account.actionError'));
    } finally {
      setSubmitting(false);
    }
  };

  const crumbs = [{ label: t('returns.title'), to: '/account/returns' }, { label: t('returns.newTitle') }];

  return (
    <AccountLayout title={t('returns.newTitle')} subtitle={t('returns.newSubtitle')} breadcrumb={crumbs}>
      {status === 'loading' && <div className="account-skeleton" />}
      {(status === 'error' || status === 'notFound') && (
        <div className="account-card">
          <EmptyState
            tone={status === 'error' ? 'error' : 'default'}
            icon={status === 'error' ? 'alert' : 'package'}
            title={status === 'error' ? t('account.loadError') : t('returns.orderNotFound')}
            action={<Button as={Link} to="/account/orders" variant="outline">{t('orderDetail.backToList')}</Button>}
          />
        </div>
      )}

      {status === 'success' && (
        <form className="return-form" onSubmit={handleSubmit} noValidate>
          <div className="return-form__main">
            <section className="account-card">
              <h2 className="account-card__title return-form__step">
                <span className="return-form__num">1</span>
                {t('returns.stepItems')}
              </h2>
              <p className="account-muted return-form__ref">
                {t('orders.orderNumber', { number: shopOrder.orderNumber })} ·{' '}
                {t('orderDetail.shopOrder', { number: shopOrder.shopOrderNumber })}
              </p>
              <ul className="order-items return-items">
                {shopOrder.items.filter((item) => !item.isGift).map((item) => {
                  const qty = quantities[item.id] ?? 0;
                  return (
                    <li key={item.id} className={`order-item ${qty > 0 ? 'return-items__on' : ''}`}>
                      <label className="return-items__check">
                        <input
                          type="checkbox"
                          checked={qty > 0}
                          onChange={(event) => setQty(item, event.target.checked ? item.quantity : 0)}
                        />
                        <span className="visually-hidden">{item.productName}</span>
                      </label>
                      <span className="item-thumb" aria-hidden="true">
                        {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <Icon name="hanger" size={26} />}
                      </span>
                      <div className="order-item__info">
                        <p className="order-item__name">{item.productName}</p>
                        {formatOptions(item.options) && <p className="account-muted">{formatOptions(item.options)}</p>}
                        <p className="account-muted">
                          {formatPrice(item.unitPriceMinor, language)} · {t('returns.purchased', { count: item.quantity })}
                        </p>
                      </div>
                      <div className="qty-stepper" role="group" aria-label={t('returns.returnQty')}>
                        <button type="button" onClick={() => setQty(item, qty - 1)} disabled={qty <= 0} aria-label={t('productDetail.decrease')}>
                          <Icon name="minus" size={14} />
                        </button>
                        <span aria-live="polite">{qty}</span>
                        <button type="button" onClick={() => setQty(item, qty + 1)} disabled={qty >= item.quantity} aria-label={t('productDetail.increase')}>
                          <Icon name="plus" size={14} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="account-card">
              <fieldset className="radio-list">
                <legend className="account-card__title return-form__step">
                  <span className="return-form__num">2</span>
                  {t('returns.stepReason')}
                </legend>
                <div className="return-reasons">
                  {RETURN_REASONS.map((code) => (
                    <label key={code} className="radio-list__item">
                      <input type="radio" name="return-reason" checked={reasonCode === code} onChange={() => setReasonCode(code)} />
                      <span>{t(`returns.reasons.${code}`)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </section>

            <section className="account-card return-form__details">
              <h2 className="account-card__title return-form__step">
                <span className="return-form__num">3</span>
                {t('returns.stepDetails')}
              </h2>
              <Textarea
                label={t('returns.description')}
                value={description}
                maxLength={5000}
                rows={4}
                placeholder={t('returns.descriptionPlaceholder')}
                onChange={(event) => setDescription(event.target.value)}
              />
              <ImageUrlField label={t('returns.evidence')} value={evidence} onChange={setEvidence} max={8} />
            </section>
          </div>

          <aside className="return-form__side">
            <div className="account-card">
              <h2 className="account-card__title">
                <Icon name="receipt" size={18} />
                {t('returns.summary')}
              </h2>
              <dl className="order-sum">
                <div>
                  <dt>{t('returns.selectedItems')}</dt>
                  <dd>{selected.reduce((sum, item) => sum + quantities[item.id], 0)}</dd>
                </div>
                <div className="order-sum__total">
                  <dt>{t('returns.refundEstimate')}</dt>
                  <dd>{formatPrice(refundEstimate, language)}</dd>
                </div>
              </dl>
              <p className="account-muted return-form__hint">{t('returns.estimateNote')}</p>
              {error && (
                <p className="field__error return-form__error" role="alert">
                  <Icon name="alert" size={16} />
                  {error}
                </p>
              )}
              <Button type="submit" fullWidth disabled={submitting}>
                {submitting ? t('common.saving') : t('returns.submit')}
              </Button>
              <Button as={Link} to={`/account/orders/${orderId}`} variant="ghost" fullWidth>
                {t('common.cancel')}
              </Button>
            </div>
          </aside>
        </form>
      )}
    </AccountLayout>
  );
}

export default ReturnRequestScreen;
