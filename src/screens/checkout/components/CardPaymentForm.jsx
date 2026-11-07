import { useState } from 'react';
import Input from '../../../components/common/Input';
import Icon from '../../../components/common/Icon';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../hooks/useLanguage';
import { detectCardBrand, formatCardNumber, formatMonthYear } from '../../../utils/cardValidation';
// Danh sách loại thẻ + ví điện tử, kèm LINK ẢNH LOGO -> sửa trong data/paymentInfo.js
import { CARD_BRANDS, WALLETS } from '../../../data/paymentInfo';

// Ảnh logo / icon; link lỗi hoặc để trống -> hiện chữ thay thế
function LogoOrText({ src, text, className }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) return <img src={src} alt="" className={className} onError={() => setFailed(true)} />;
  return text;
}

/**
 * Form thẻ ATM / Visa / Mastercard (hiện khi chọn "Thẻ ATM / Visa / Mastercard").
 *   [  Pay ]  [ G Pay ]          <- icon + chữ (ảnh lấy từ data/paymentInfo.js)
 *   ───── HOẶC ─────
 *   [ Số thẻ                VISA Mastercard JCB NAPAS ]
 *   [ Ngày hết hạn ] [ Mã bảo mật ]     <- thẻ quốc tế
 *   [ Tên chủ thẻ  ] [ Ngày phát hành ]  <- thẻ ATM nội địa (số bắt đầu 9704)
 *   [ ] Lưu thẻ cho những lần mua sau tại TrendyLab
 * - value / onChange(next): dữ liệu thẻ do PaymentStep giữ (để kiểm tra khi bấm Hoàn tất)
 * - errors: { tênÔ: 'key lỗi' }
 */
function CardPaymentForm({ value, onChange, errors }) {
  const { t } = useLanguage();
  const { user } = useAuth(); // lưu thẻ cần có tài khoản -> chưa đăng nhập thì khoá ô này
  const [walletNotice, setWalletNotice] = useState(null);
  const brand = detectCardBrand(value.number);
  const isNapas = brand === 'napas';

  const update = (patch) => onChange({ ...value, ...patch });
  const errorOf = (name) => (errors[name] ? t(errors[name]) : undefined);

  return (
    <div className="payment-method__desc card-form">
      {/* ----- Ví điện tử ----- */}
      <div className="card-form__wallets">
        {WALLETS.map((wallet) => (
          <button
            key={wallet.id}
            type="button"
            className="card-form__wallet"
            aria-label={wallet.label}
            onClick={() => setWalletNotice(wallet.label)}
          >
            {wallet.icon ? (
              <>
                <LogoOrText src={wallet.icon} text={null} className="card-form__wallet-icon" />
                <span>{wallet.textWithIcon}</span>
              </>
            ) : (
              wallet.label
            )}
          </button>
        ))}
      </div>
      {walletNotice && (
        <p className="card-form__notice" role="status">
          <Icon name="info" size={16} />
          {t('checkout.card.walletPending', { wallet: walletNotice })}
        </p>
      )}

      <p className="card-form__divider">
        <span>{t('checkout.card.or')}</span>
      </p>

      {/* ----- Số thẻ (nhãn loại thẻ bên phải, loại đang nhập được tô đậm) ----- */}
      <div className="card-form__number">
        <Input
          floating
          label={t('checkout.card.number')}
          value={value.number}
          onChange={(event) => update({ number: formatCardNumber(event.target.value) })}
          error={errorOf('number')}
          inputMode="numeric"
          autoComplete="cc-number"
          maxLength={23}
        />
        <span className="card-form__brands" aria-hidden="true">
          {CARD_BRANDS.map((item) => (
            <span
              key={item.id}
              className={`card-brand card-brand--${item.id} ${brand && brand !== item.id ? 'is-dim' : ''}`}
            >
              <LogoOrText src={item.logo} text={item.label} className="card-brand__img" />
            </span>
          ))}
        </span>
      </div>

      {isNapas ? (
        // Thẻ ATM nội địa: không có ngày hết hạn / CVV, dùng tên chủ thẻ + ngày phát hành
        <div className="card-form__row">
          <Input
            floating
            label={t('checkout.card.holder')}
            value={value.holder}
            onChange={(event) => update({ holder: event.target.value.toUpperCase() })}
            error={errorOf('holder')}
            autoComplete="cc-name"
          />
          <Input
            floating
            label={t('checkout.card.issueDate')}
            value={value.issueDate}
            onChange={(event) => update({ issueDate: formatMonthYear(event.target.value) })}
            error={errorOf('issueDate')}
            hint={errors.issueDate ? undefined : t('checkout.card.dateHint')}
            inputMode="numeric"
          />
        </div>
      ) : (
        <div className="card-form__row">
          <Input
            floating
            label={t('checkout.card.expiry')}
            value={value.expiry}
            onChange={(event) => update({ expiry: formatMonthYear(event.target.value) })}
            error={errorOf('expiry')}
            hint={errors.expiry ? undefined : t('checkout.card.dateHint')}
            inputMode="numeric"
            autoComplete="cc-exp"
          />
          <div className="card-form__cvc">
            <Input
              floating
              label={t('checkout.card.cvc')}
              value={value.cvc}
              onChange={(event) => update({ cvc: event.target.value.replace(/\D/g, '').slice(0, 4) })}
              error={errorOf('cvc')}
              hint={errors.cvc ? undefined : t(brand === 'amex' ? 'checkout.card.cvcHint4' : 'checkout.card.cvcHint3')}
              inputMode="numeric"
              autoComplete="cc-csc"
              type="password"
            />
            {/* Hình thẻ có "123" ở mặt sau: gợi ý vị trí mã bảo mật */}
            <svg className="card-form__cvc-icon" viewBox="0 0 40 28" aria-hidden="true">
              <rect x="1" y="1" width="38" height="26" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
              <rect x="1" y="7" width="38" height="5" fill="currentColor" />
              <text x="33" y="23" textAnchor="end" fontSize="8" fontWeight="700" fill="currentColor">
                123
              </text>
            </svg>
          </div>
        </div>
      )}

      <label className={`card-form__save ${user ? '' : 'is-disabled'}`}>
        <input
          type="checkbox"
          checked={Boolean(user) && value.save}
          onChange={(event) => update({ save: event.target.checked })}
          disabled={!user}
        />
        <span>
          {t('checkout.card.save')}
          {!user && <small className="card-form__save-hint">{t('checkout.card.saveNeedLogin')}</small>}
        </span>
      </label>

      <p className="card-form__secure">
        <Icon name="shield" size={14} />
        {t('checkout.card.secureNote')}
      </p>
    </div>
  );
}

export default CardPaymentForm;
