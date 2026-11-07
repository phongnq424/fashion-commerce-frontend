import { useRef, useState } from 'react';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';
import { formatPrice } from '../../../utils/format';
import { BANK_TRANSFER } from '../../../data/paymentInfo';
import QrCode from '../../../components/common/QrCode';
import { buildVietQrPayload } from '../../../utils/vietqr';
import { cardLast4, detectCardBrand, validateCard } from '../../../utils/cardValidation';
import CardPaymentForm from './CardPaymentForm';

// Dữ liệu thẻ chỉ nằm trong bộ nhớ của trang (không localStorage), rời trang là mất
const EMPTY_CARD = { number: '', expiry: '', cvc: '', holder: '', issueDate: '', save: false };

// Các cách thanh toán. Chữ hiển thị nằm ở vi.js / en.js: checkout.methods.<id> và <id>Desc
const PAYMENT_METHODS = ['cod', 'bank', 'card'];

// 1 dòng thông tin chuyển khoản, có nút "Sao chép" (số tài khoản, nội dung CK)
function BankRow({ label, value, copyable = false }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Trình duyệt chặn clipboard -> khách tự bôi đen để chép
    }
  };

  return (
    <div className="bank-info__row">
      <dt>{label}</dt>
      <dd>
        <strong>{value}</strong>
        {copyable && (
          <button type="button" className="bank-info__copy" onClick={copy} aria-label={t('checkout.bankTransfer.copyLabel', { field: label })}>
            <Icon name={copied ? 'check' : 'copy'} size={14} />
            {copied ? t('checkout.bankTransfer.copied') : t('checkout.bankTransfer.copy')}
          </button>
        )}
      </dd>
    </div>
  );
}

// Khối hướng dẫn chuyển khoản (thay cho mô tả ngắn khi chọn "Chuyển khoản ngân hàng")
// Trái: thông tin tài khoản (có nút Sao chép) | Phải: mã VietQR điền sẵn số tiền + nội dung
function BankTransferInfo({ phone, amount }) {
  const { t, language } = useLanguage();
  const amountText = formatPrice(amount, language);
  const qrValue = BANK_TRANSFER.showQr
    ? buildVietQrPayload({
        bankBin: BANK_TRANSFER.bankBin,
        accountNumber: BANK_TRANSFER.accountNumber,
        amount,
        note: phone,
      })
    : null;

  return (
    <div className="payment-method__desc bank-info">
      <p className="bank-info__intro">{t('checkout.bankTransfer.intro')}</p>
      <div className={`bank-info__body ${qrValue ? 'bank-info__body--qr' : ''}`}>
        <dl className="bank-info__list">
          <BankRow label={t('checkout.bankTransfer.bank')} value={BANK_TRANSFER.bankName} />
          <BankRow label={t('checkout.bankTransfer.accountNumber')} value={BANK_TRANSFER.accountNumber} copyable />
          <BankRow label={t('checkout.bankTransfer.accountName')} value={BANK_TRANSFER.accountName} />
          <BankRow label={t('checkout.bankTransfer.amount')} value={amountText} />
          <BankRow
            label={t('checkout.bankTransfer.content')}
            value={phone || t('checkout.bankTransfer.contentFallback')}
            copyable={Boolean(phone)}
          />
        </dl>
        {qrValue && (
          <figure className="bank-info__qr">
            <QrCode value={qrValue} size={168} label={t('checkout.bankTransfer.qrLabel', { amount: amountText })} />
            <figcaption>{t('checkout.bankTransfer.qrCaption')}</figcaption>
          </figure>
        )}
      </div>
      <p className="bank-info__outro">{t('checkout.bankTransfer.outro')}</p>
    </div>
  );
}

/**
 * Bước 2: Phương thức thanh toán.
 *   [Liên hệ ......... Thay đổi]
 *   [Giao đến ........ Thay đổi]
 *   [Vận chuyển ...... phí ship]
 *   ( ) COD   ( ) Chuyển khoản   ( ) Thẻ
 *   ‹ Quay lại thông tin giao hàng          [ HOÀN TẤT ĐƠN HÀNG ]
 * - onPlaceOrder(paymentDetails): trả về Promise; lỗi -> hiện thông báo ngay trên nút
 *     paymentDetails (chỉ khi trả bằng thẻ) = { cardBrand, cardLast4, saveCard } — KHÔNG có số thẻ đầy đủ
 */
function PaymentStep({
  shipping,
  total,
  shippingFee,
  shippingDiscount,
  method,
  onMethodChange,
  onEditShipping,
  onPlaceOrder,
}) {
  const { t, language } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [card, setCard] = useState(EMPTY_CARD);
  const [cardErrors, setCardErrors] = useState({});
  const formRef = useRef(null);

  // Sửa ô nào -> xoá lỗi của ô đó
  const changeCard = (next) => {
    setCardErrors((current) => {
      const remaining = { ...current };
      Object.keys(next).forEach((key) => {
        if (next[key] !== card[key]) delete remaining[key];
      });
      return remaining;
    });
    setCard(next);
  };

  const contact = [shipping.fullName, shipping.phone, shipping.email].filter(Boolean).join(' · ');
  const address = [shipping.address, shipping.wardName, shipping.districtName, shipping.provinceName]
    .filter(Boolean)
    .join(', ');
  const finalFee = Math.max(0, (shippingFee ?? 0) - shippingDiscount);

  const handleSubmit = async (event) => {
    event.preventDefault();
    let details = null;
    if (method === 'card') {
      const errors = validateCard(card);
      setCardErrors(errors);
      if (Object.keys(errors).length > 0) {
        // Đưa con trỏ tới ô thẻ lỗi đầu tiên
        requestAnimationFrame(() => formRef.current?.querySelector('.card-form [aria-invalid="true"]')?.focus());
        return;
      }
      details = { cardBrand: detectCardBrand(card.number), cardLast4: cardLast4(card.number), saveCard: card.save };
    }
    setSubmitting(true);
    setFailed(false);
    try {
      await onPlaceOrder(details);
    } catch {
      setFailed(true);
      setSubmitting(false);
    }
  };

  return (
    <section className="checkout-section" aria-labelledby="payment-title">
      <h1 id="payment-title" className="checkout-section__title">
        {t('checkout.stepPayment')}
      </h1>

      {/* Tóm tắt thông tin đã nhập ở bước 1 */}
      <dl className="checkout-review">
        <div className="checkout-review__row">
          <dt>{t('checkout.contact')}</dt>
          <dd>{contact}</dd>
          <button
            type="button"
            className="checkout-link"
            onClick={onEditShipping}
            aria-label={t('checkout.changeLabel', { field: t('checkout.contact') })}
          >
            {t('checkout.change')}
          </button>
        </div>
        <div className="checkout-review__row">
          <dt>{t('checkout.shipTo')}</dt>
          <dd>{address}</dd>
          <button
            type="button"
            className="checkout-link"
            onClick={onEditShipping}
            aria-label={t('checkout.changeLabel', { field: t('checkout.shipTo') })}
          >
            {t('checkout.change')}
          </button>
        </div>
        <div className="checkout-review__row">
          <dt>{t('checkout.shippingMethod')}</dt>
          <dd>{t('checkout.standardShipping')}</dd>
          <strong className="checkout-review__fee">
            {finalFee === 0 ? t('checkout.free') : formatPrice(finalFee, language)}
          </strong>
        </div>
      </dl>

      <form ref={formRef} className="payment-form" onSubmit={handleSubmit} noValidate>
        <fieldset className="payment-methods">
          <legend className="payment-methods__legend">{t('checkout.paymentLegend')}</legend>
          {PAYMENT_METHODS.map((id) => (
            // Chỉ dòng có nút tròn là <label>; phần mô tả / thông tin chuyển khoản (có nút Sao chép) nằm ngoài
            <div key={id} className={`payment-method ${method === id ? 'payment-method--active' : ''}`}>
              <label className="payment-method__head">
                <input
                  type="radio"
                  name="payment-method"
                  value={id}
                  checked={method === id}
                  onChange={() => onMethodChange(id)}
                  className="payment-method__radio"
                />
                <span className="payment-method__title">{t(`checkout.methods.${id}`)}</span>
              </label>
              {/* Mô tả chỉ hiện ở cách đang chọn. Chuyển khoản -> hiện đủ thông tin tài khoản */}
              {method === id && id === 'bank' && <BankTransferInfo phone={shipping.phone?.trim()} amount={total} />}
              {method === id && id === 'card' && (
                <CardPaymentForm value={card} onChange={changeCard} errors={cardErrors} />
              )}
              {method === id && id === 'cod' && <p className="payment-method__desc">{t(`checkout.methods.${id}Desc`)}</p>}
            </div>
          ))}
        </fieldset>

        {failed && (
          <p className="checkout-alert" role="alert">
            <Icon name="alert" size={18} />
            {t('checkout.errors.placeOrderFailed')}
          </p>
        )}

        <div className="checkout-actions">
          <button type="button" className="checkout-link checkout-actions__back" onClick={onEditShipping}>
            <Icon name="chevronLeft" size={16} />
            {t('checkout.backToShipping')}
          </button>
          <Button type="submit" className="checkout-actions__next" disabled={submitting} aria-busy={submitting}>
            {submitting ? t('checkout.placing') : t('checkout.placeOrder')}
          </Button>
        </div>
      </form>
    </section>
  );
}

export default PaymentStep;
