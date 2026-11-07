import Icon from '../../../components/common/Icon';
import OrderThumb from './OrderThumb';
import VoucherBox from './VoucherBox';
import { useLanguage } from '../../../hooks/useLanguage';
import { formatPrice } from '../../../utils/format';

/**
 * Cột phải trang thanh toán (thứ tự từ trên xuống):
 *   1. Sản phẩm: ảnh + số lượng | tên + phân loại | thành tiền
 *   2. Quà tặng kèm (chỉ hiện khi có sản phẩm kèm quà)
 *   3. Ô mã giảm giá (ẩn khi readOnly, vd màn "Đặt hàng thành công")
 *   4. Tạm tính, giảm giá, phí vận chuyển, Tổng tiền
 * - totals: kết quả calculateTotals() trong orderService
 */
function OrderSummary({ items, totals, voucher, readOnly = false, onApplyVoucher, onRemoveVoucher }) {
  const { t, language } = useLanguage();
  const price = (value) => formatPrice(value, language);
  const gifts = items.filter((item) => item.gift);

  const { subtotal, discount, shippingFee, shippingDiscount, total } = totals;
  const finalFee = Math.max(0, (shippingFee ?? 0) - shippingDiscount);

  return (
    <div className="order-summary">
      <h2 id="order-summary-title" className="visually-hidden">
        {t('checkout.summaryTitle')}
      </h2>

      {/* ----- 1. Sản phẩm ----- */}
      <ul className="order-summary__items">
        {items.map((item) => (
          <li key={item.key} className="order-line">
            <OrderThumb
              src={item.image}
              badge={item.quantity}
              badgeLabel={t('checkout.quantityBadge', { count: item.quantity })}
            />
            <div className="order-line__info">
              <p className="order-line__name">{item.name}</p>
              {(item.color || item.size) && (
                <p className="order-line__variant">{[item.color, item.size].filter(Boolean).join(' / ')}</p>
              )}
            </div>
            <p className="order-line__price">{price(item.price * item.quantity)}</p>
          </li>
        ))}
      </ul>

      {/* ----- 2. Quà tặng kèm: nằm dưới sản phẩm, trước ô mã giảm giá ----- */}
      {gifts.length > 0 && (
        <section className="order-summary__gifts" aria-labelledby="order-gift-title">
          <h3 id="order-gift-title" className="order-summary__gift-title">
            <Icon name="gift" size={16} />
            {t('checkout.giftTitle')}
          </h3>
          <ul className="order-summary__items">
            {gifts.map((item) => (
              <li key={item.key} className="order-line order-line--gift">
                <OrderThumb
                  src={item.gift.image}
                  fallbackIcon="package"
                  badge={<Icon name="gift" size={12} />}
                  badgeLabel={t('checkout.giftTitle')}
                  tone="gift"
                />
                <div className="order-line__info">
                  <p className="order-line__name">{item.gift.name}</p>
                  {item.gift.option && (
                    <p className="order-line__variant">{t('checkout.giftOption', { option: item.gift.option })}</p>
                  )}
                </div>
                <p className="order-line__price">
                  <span>{price(0)}</span>
                  {item.gift.originalPrice > 0 && (
                    <s className="order-line__price-old">{price(item.gift.originalPrice)}</s>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ----- 3. Mã giảm giá ----- */}
      {!readOnly && (
        <VoucherBox subtotal={subtotal} applied={voucher} onApply={onApplyVoucher} onRemove={onRemoveVoucher} />
      )}

      {/* ----- 4. Tiền ----- */}
      <dl className="order-totals">
        <div className="order-totals__row">
          <dt>{t('checkout.subtotal')}</dt>
          <dd>{price(subtotal)}</dd>
        </div>
        {discount > 0 && (
          <div className="order-totals__row">
            <dt>{t('checkout.discount', { code: voucher.code })}</dt>
            <dd className="order-totals__discount">−{price(discount)}</dd>
          </div>
        )}
        <div className="order-totals__row">
          <dt>{t('checkout.shippingFee')}</dt>
          <dd>
            {shippingFee === null && (
              // Chưa chọn tỉnh/thành -> chưa tính được phí ship
              <span aria-label={t('checkout.notCalculated')}>—</span>
            )}
            {shippingFee !== null && shippingDiscount > 0 && (
              <s className="order-totals__old">{price(shippingFee)}</s>
            )}
            {shippingFee !== null && (finalFee === 0 ? t('checkout.free') : price(finalFee))}
          </dd>
        </div>
      </dl>

      <div className="order-total">
        <span className="order-total__label">{t('checkout.total')}</span>
        <span className="order-total__value">
          <span className="order-total__currency">{t('checkout.currency')}</span>
          <strong className="order-total__amount">{price(total)}</strong>
        </span>
      </div>
    </div>
  );
}

export default OrderSummary;
