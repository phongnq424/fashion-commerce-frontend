import { useEffect, useState } from 'react';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';
import { getVouchers, validateVoucher } from '../../../services/orderService';
import { formatPrice } from '../../../utils/format';

// Số mã hiện sẵn dạng "vé" khi chưa bấm "Xem thêm mã giảm giá"
const QUICK_VOUCHERS = 2;

/**
 * Ô nhập mã giảm giá + danh sách mã gợi ý.
 *   [ Mã giảm giá           ] [ SỬ DỤNG ]
 *   🎟 Xem thêm mã giảm giá
 *   (Giảm Ship 100%) (Giảm 50K)   <- bấm vào là áp dụng luôn
 * - subtotal: tiền hàng, để kiểm tra điều kiện "đơn tối thiểu"
 * - applied: mã đang dùng (null = chưa có) | onApply(voucher) | onRemove()
 * Đã áp dụng mã -> mã hiện NGAY TRONG Ô (khoá lại, viền xanh + "✓ Giảm 50K" bên dưới),
 * nút "Sử dụng" đổi thành "Gỡ mã".
 */
function VoucherBox({ subtotal, applied, onApply, onRemove }) {
  const { t, language } = useLanguage();
  const [code, setCode] = useState('');
  const [error, setError] = useState(null); // { key, params } -> đổi ngôn ngữ vẫn dịch đúng
  const [loading, setLoading] = useState(false);
  const [vouchers, setVouchers] = useState([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    getVouchers().then((list) => {
      if (active) setVouchers(list);
    });
    return () => {
      active = false;
    };
  }, []);

  const apply = async (value) => {
    setLoading(true);
    setError(null);
    try {
      const voucher = await validateVoucher(value, subtotal);
      onApply(voucher);
      setCode('');
    } catch (err) {
      setError(
        err.code === 'VOUCHER_MIN_SUBTOTAL'
          ? { key: 'checkout.errors.voucherMinSubtotal', params: { amount: formatPrice(err.minSubtotal, language) } }
          : { key: 'checkout.errors.voucherInvalid' },
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (applied) return;
    if (code.trim()) apply(code);
  };

  const remove = () => {
    onRemove();
    setCode('');
    setError(null);
  };

  const quickList = vouchers.slice(0, QUICK_VOUCHERS);

  return (
    <div className="voucher">
      <form className="voucher__form" onSubmit={handleSubmit} noValidate>
        {/* Đã áp dụng -> ô hiện chính mã đó (chỉ đọc), không hiện dòng mã riêng bên dưới nữa */}
        <Input
          floating
          label={t('checkout.voucherLabel')}
          value={applied ? applied.code : code}
          readOnly={Boolean(applied)}
          onChange={(event) => {
            setCode(event.target.value);
            setError(null);
          }}
          hint={applied ? `✓ ${t('checkout.voucherAppliedHint', { label: applied.label })}` : undefined}
          error={error ? t(error.key, error.params) : undefined}
          autoComplete="off"
          className={`voucher__input ${applied ? 'voucher__input--applied' : ''}`}
        />
        {applied ? (
          <Button
            type="button"
            variant="outline"
            className="voucher__submit"
            onClick={remove}
            aria-label={t('checkout.removeVoucher', { code: applied.code })}
          >
            {t('checkout.removeVoucherShort')}
          </Button>
        ) : (
          <Button type="submit" variant="primary" className="voucher__submit" disabled={!code.trim() || loading}>
            {t('checkout.applyVoucher')}
          </Button>
        )}
      </form>

      {vouchers.length > 0 && (
        <>
          <button
            type="button"
            className="checkout-link voucher__more"
            aria-expanded={expanded}
            aria-controls="voucher-list"
            onClick={() => setExpanded((value) => !value)}
          >
            <Icon name="ticket" size={18} />
            {expanded ? t('checkout.lessVouchers') : t('checkout.moreVouchers')}
          </button>

          {!expanded && (
            <ul className="voucher__chips">
              {quickList.map((voucher) => (
                <li key={voucher.code}>
                  <button
                    type="button"
                    className="voucher-chip"
                    onClick={() => apply(voucher.code)}
                    disabled={loading || applied?.code === voucher.code}
                    aria-pressed={applied?.code === voucher.code}
                    title={voucher.description}
                  >
                    {voucher.label}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Danh sách đầy đủ: tên mã, mô tả, điều kiện + nút Áp dụng */}
          <ul id="voucher-list" className="voucher__list" hidden={!expanded}>
            {vouchers.map((voucher) => {
              const isApplied = applied?.code === voucher.code;
              return (
                <li key={voucher.code} className="voucher-card">
                  <div className="voucher-card__info">
                    <p className="voucher-card__label">
                      {voucher.label} <span className="voucher-card__code">{voucher.code}</span>
                    </p>
                    <p className="voucher-card__desc">{voucher.description}</p>
                    {voucher.minSubtotal > 0 && (
                      <p className="voucher-card__min">
                        {t('checkout.voucherMin', { amount: formatPrice(voucher.minSubtotal, language) })}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => apply(voucher.code)}
                    disabled={loading || isApplied}
                  >
                    {isApplied ? <Icon name="check" size={16} /> : t('checkout.applyThis')}
                  </Button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

export default VoucherBox;
