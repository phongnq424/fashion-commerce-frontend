import { useEffect, useState } from 'react';
import Icon from '../../../components/common/Icon';
import OrderThumb from './OrderThumb';
import { useLanguage } from '../../../hooks/useLanguage';
import { formatPrice } from '../../../utils/format';
import { getAvailableVouchers } from '../../../services/orderService';

const optionText = (options) => Object.values(options ?? {}).filter(Boolean).join(' / ');

// Ô nhập mã + mã gợi ý của 1 shop (GET /vouchers/available)
function ShopVouchers({ shop, codes, onAdd, onRemove, readOnly }) {
  const { t, language } = useLanguage();
  const [value, setValue] = useState('');
  const [available, setAvailable] = useState([]);

  useEffect(() => {
    if (readOnly || !shop.shopId) return undefined;
    let active = true;
    getAvailableVouchers({ shopId: shop.shopId, subtotalMinor: shop.itemsSubtotalMinor, shippingFeeMinor: shop.shippingFeeMinor ?? 0 })
      .then((list) => active && setAvailable(Array.isArray(list) ? list : []))
      .catch(() => active && setAvailable([]));
    return () => {
      active = false;
    };
  }, [shop.shopId, shop.itemsSubtotalMinor, shop.shippingFeeMinor, readOnly]);

  if (readOnly) return null;
  const submit = (event) => {
    event.preventDefault();
    const code = value.trim().toUpperCase();
    if (code) onAdd(code);
    setValue('');
  };

  return (
    <div className="voucher">
      <form className="voucher__form" onSubmit={submit}>
        <input
          className="input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t('market.checkout.voucherPlaceholder')}
          aria-label={t('market.checkout.voucherPlaceholder')}
          pattern="[A-Za-z0-9_\-]+"
          maxLength={60}
        />
        <button type="submit" className="btn btn--outline btn--sm voucher__submit">
          {t('market.checkout.apply')}
        </button>
      </form>
      {available.length > 0 && (
        <div className="voucher__chips">
          {available
            .filter((voucher) => !codes.includes(voucher.code))
            .map((voucher) => (
              <button key={voucher.id} type="button" className="voucher-chip" onClick={() => onAdd(voucher.code)} title={voucher.name}>
                {voucher.code} · −{formatPrice(voucher.estimatedDiscountMinor, language)}
              </button>
            ))}
        </div>
      )}
      {codes.length > 0 && (
        <div className="voucher__chips">
          {codes.map((code) => (
            <span key={code} className="voucher-chip voucher__applied">
              {code}
              <button type="button" className="voucher__remove" onClick={() => onRemove(code)} aria-label={t('market.checkout.removeVoucher', { code })}>
                <Icon name="close" size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Cột phải trang thanh toán.
 * - preview: CheckoutPreviewResponse (null = chưa chọn địa chỉ -> hiện các dòng giỏ đang mua)
 * - lines: dòng giỏ đang mua (dùng khi chưa có preview)
 * - voucherCodes / onVoucherCodesChange: mã đang áp dụng (gửi kèm khi xem trước đơn)
 */
function CheckoutSummary({ preview, lines, voucherCodes, onVoucherCodesChange, readOnly = false }) {
  const { t, language } = useLanguage();
  const price = (value) => formatPrice(value, language);

  if (!preview) {
    const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    return (
      <div className="order-summary">
        <h2 id="order-summary-title" className="visually-hidden">{t('checkout.summaryTitle')}</h2>
        <ul className="order-summary__items">
          {lines.map((line) => (
            <li key={line.key} className="order-line">
              <OrderThumb src={line.image} badge={line.quantity} badgeLabel={t('checkout.quantityBadge', { count: line.quantity })} />
              <div className="order-line__info">
                <p className="order-line__name">{line.name}</p>
                {line.variantText && <p className="order-line__variant">{line.variantText}</p>}
                {line.shopName && <p className="order-line__variant">{line.shopName}</p>}
              </div>
              <p className="order-line__price">{price(line.unitPrice * line.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="order-totals">
          <div className="order-totals__row">
            <dt>{t('checkout.subtotal')}</dt>
            <dd>{price(subtotal)}</dd>
          </div>
          <div className="order-totals__row">
            <dt>{t('checkout.shippingFee')}</dt>
            <dd>{t('market.checkout.afterAddress')}</dd>
          </div>
        </dl>
      </div>
    );
  }

  const addCode = (code) => !voucherCodes.includes(code) && onVoucherCodesChange([...voucherCodes, code]);
  const removeCode = (code) => onVoucherCodesChange(voucherCodes.filter((item) => item !== code));
  const applied = preview.appliedVouchers ?? [];
  const unapplied = voucherCodes.filter((code) => !applied.some((v) => v.code === code));

  return (
    <div className="order-summary">
      <h2 id="order-summary-title" className="visually-hidden">{t('checkout.summaryTitle')}</h2>
      {preview.shops.map((shop) => {
        const shopCodes = applied.filter((v) => v.shopId === shop.shopId).map((v) => v.code);
        return (
          <section key={shop.shopId} className="order-summary__gifts" aria-label={shop.shopName}>
            <h3 className="order-summary__gift-title">
              <Icon name="store" size={16} />
              {shop.shopName}
            </h3>
            <ul className="order-summary__items">
              {shop.items.map((item) => (
                <li key={item.cartItemId} className="order-line">
                  <OrderThumb src={item.imageUrl} badge={item.quantity} badgeLabel={t('checkout.quantityBadge', { count: item.quantity })} />
                  <div className="order-line__info">
                    <p className="order-line__name">{item.productName}</p>
                    {optionText(item.options) && <p className="order-line__variant">{optionText(item.options)}</p>}
                  </div>
                  <p className="order-line__price">{price(item.lineSubtotalMinor)}</p>
                </li>
              ))}
            </ul>
            <ShopVouchers
              shop={shop}
              codes={shopCodes}
              onAdd={addCode}
              onRemove={removeCode}
              readOnly={readOnly}
            />
            <dl className="order-totals">
              <div className="order-totals__row">
                <dt>{t('market.checkout.shopShipping')}</dt>
                <dd>{shop.shippingFeeMinor === 0 ? t('checkout.free') : price(shop.shippingFeeMinor)}</dd>
              </div>
              {shop.discountMinor > 0 && (
                <div className="order-totals__row">
                  <dt>{t('market.checkout.shopDiscount')}</dt>
                  <dd className="order-totals__discount">−{price(shop.discountMinor)}</dd>
                </div>
              )}
            </dl>
          </section>
        );
      })}

      {unapplied.length > 0 && (
        <p className="checkout-alert" role="alert">
          {t('market.checkout.voucherNotApplied', { codes: unapplied.join(', ') })}{' '}
          <button type="button" className="checkout-link" onClick={() => onVoucherCodesChange(voucherCodes.filter((c) => !unapplied.includes(c)))}>
            {t('market.checkout.removeInvalid')}
          </button>
        </p>
      )}

      <dl className="order-totals">
        <div className="order-totals__row">
          <dt>{t('checkout.subtotal')}</dt>
          <dd>{price(preview.itemsSubtotalMinor)}</dd>
        </div>
        <div className="order-totals__row">
          <dt>{t('checkout.shippingFee')}</dt>
          <dd>{preview.shippingFeeMinor === 0 ? t('checkout.free') : price(preview.shippingFeeMinor)}</dd>
        </div>
        {preview.discountTotalMinor > 0 && (
          <div className="order-totals__row">
            <dt>{t('market.checkout.discountTotal')}</dt>
            <dd className="order-totals__discount">−{price(preview.discountTotalMinor)}</dd>
          </div>
        )}
      </dl>
      <div className="order-total">
        <span className="order-total__label">{t('checkout.total')}</span>
        <span className="order-total__value">
          <span className="order-total__currency">{preview.currency ?? t('checkout.currency')}</span>
          <strong className="order-total__amount">{price(preview.grandTotalMinor)}</strong>
        </span>
      </div>
    </div>
  );
}

export default CheckoutSummary;
