import { useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import Logo from '../../components/layout/Logo';
import Icon from '../../components/common/Icon';
import CheckoutSteps from './components/CheckoutSteps';
import ShippingForm from './components/ShippingForm';
import PaymentStep from './components/PaymentStep';
import OrderSummary from './components/OrderSummary';
import OrderSuccess from './components/OrderSuccess';
import CheckoutEmpty from './components/CheckoutEmpty';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { calculateTotals, placeOrder } from '../../services/orderService';
import { formatPrice } from '../../utils/format';
import './CheckoutScreen.css';

// Thông tin giao hàng ban đầu (trống). *Name lưu tên để hiện lại ở bước thanh toán.
const EMPTY_SHIPPING = {
  fullName: '',
  email: '',
  phone: '',
  address: '',
  provinceId: '',
  provinceName: '',
  districtId: '',
  districtName: '',
  wardId: '',
  wardName: '',
};

// Đã đăng nhập -> tự điền họ tên / email / SĐT vào các ô còn TRỐNG (không ghi đè chữ khách đã gõ)
const fillFromUser = (shipping, user) => ({
  ...shipping,
  fullName: shipping.fullName || user?.name || '',
  email: shipping.email || user?.email || '',
  phone: shipping.phone || user?.phone || '',
});

/**
 * Trang thanh toán /checkout. Bố cục 2 cột:
 *   TRÁI: logo, các bước (Giỏ hàng > Thông tin giao hàng > Phương thức thanh toán), nội dung bước
 *   PHẢI: sản phẩm đang mua, quà tặng kèm, mã giảm giá, tổng tiền
 * Bước đang mở nằm trên đường dẫn: /checkout (giao hàng) | /checkout?step=payment (thanh toán)
 * -> bấm Back của trình duyệt là quay về bước trước.
 *
 * SẢN PHẨM ĐƯỢC THANH TOÁN:
 *   - Từ giỏ hàng / popup giỏ hàng: các sản phẩm ĐANG ĐƯỢC TICK (selectedItems) — món bỏ tick vẫn nằm lại trong giỏ
 *   - Từ nút "Mua ngay": CHỈ đúng món vừa bấm (App gửi buyNowKey qua state của đường dẫn)
 * Đặt hàng xong chỉ xoá các món vừa mua khỏi giỏ.
 */
function CheckoutScreen({ onNotify }) {
  const { t, language } = useLanguage();
  const { items: cartItems, selectedItems, removeItems } = useCart();
  const { user, openAuth } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  // Giữ buyNowKey trong state: đổi bước (?step=payment) sẽ làm mất state của đường dẫn
  const [buyNowKey] = useState(() => location.state?.buyNowKey ?? null);

  // Các dòng giỏ được mua lần này (dữ liệu gốc của giỏ, dùng để xoá sau khi đặt)
  const buyingLines = useMemo(() => {
    const buyNowLine = buyNowKey && cartItems.find((item) => item.key === buyNowKey && item.purchasable);
    return buyNowLine ? [buyNowLine] : selectedItems;
  }, [buyNowKey, cartItems, selectedItems]);

  // Đổi sang dạng các khối thanh toán dùng: { key, id, name, image, price, color, size, quantity, gift }
  const items = useMemo(
    () =>
      buyingLines.map((line) => ({
        key: line.key,
        id: line.productId,
        name: line.name,
        image: line.image,
        price: line.unitPrice,
        color: line.color,
        size: line.size,
        quantity: line.quantity,
        gift: line.gift ?? null,
      })),
    [buyingLines],
  );
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const [shipping, setShipping] = useState(() => fillFromUser(EMPTY_SHIPPING, user));
  const [shippingDone, setShippingDone] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [voucher, setVoucher] = useState(null);
  const [placedOrder, setPlacedOrder] = useState(null); // đơn vừa đặt xong (giữ lại để hiện sau khi xoá giỏ)
  const [summaryOpen, setSummaryOpen] = useState(false); // chỉ dùng trên mobile

  // Khách bấm "Đăng nhập" ngay tại trang này -> đăng nhập xong thì tự điền thông tin.
  // So sánh user trong lúc render (cách React khuyên dùng thay cho useEffect khi cần cập nhật state theo prop/context)
  const [prevUser, setPrevUser] = useState(user);
  if (user !== prevUser) {
    setPrevUser(user);
    if (user) setShipping((current) => fillFromUser(current, user));
  }

  // Chưa điền xong form giao hàng mà mở thẳng ?step=payment -> vẫn hiện bước giao hàng
  const step = searchParams.get('step') === 'payment' && shippingDone ? 'payment' : 'shipping';

  const goToStep = (next) => {
    setSearchParams(next === 'payment' ? { step: 'payment' } : {});
    window.scrollTo(0, 0);
  };

  const totals = calculateTotals({ subtotal, voucher, provinceId: shipping.provinceId });

  const handleShippingSubmit = () => {
    setShippingDone(true);
    goToStep('payment');
  };

  const handleApplyVoucher = (nextVoucher) => {
    setVoucher(nextVoucher);
    onNotify?.('success', t('checkout.voucherApplied', { code: nextVoucher.code }));
  };

  // Lỗi (mất mạng...) được PaymentStep bắt và hiện ngay trên nút
  // paymentDetails: { cardBrand, cardLast4, saveCard } khi trả bằng thẻ (không bao giờ có số thẻ đầy đủ)
  const handlePlaceOrder = async (paymentDetails = null) => {
    const { orderCode } = await placeOrder({
      items,
      shipping,
      paymentMethod,
      paymentDetails,
      voucherCode: voucher?.code,
    });
    setPlacedOrder({ orderCode, items, totals, voucher, shipping, paymentMethod });
    window.scrollTo(0, 0);
    // Chỉ xoá các món VỪA MUA khỏi giỏ (món khách bỏ tick vẫn giữ lại). Lỗi xoá không ảnh hưởng đơn đã đặt.
    removeItems(buyingLines).catch((error) => console.warn('[Checkout] Không xoá được món đã mua khỏi giỏ', error));
  };

  // Giỏ trống (và chưa vừa đặt đơn) -> không có gì để thanh toán
  if (!placedOrder && items.length === 0) {
    return <CheckoutEmpty />;
  }

  // Sau khi đặt hàng: cột phải hiện lại đơn vừa đặt (giỏ đã được xoá)
  const summary = placedOrder ?? { items, totals, voucher };

  return (
    <div className={`checkout ${summaryOpen ? 'checkout--summary-open' : ''}`}>
      <header className="checkout__header">
        <Logo />
      </header>

      {/* Mobile: cột đơn hàng thu gọn, bấm để mở */}
      <button
        type="button"
        className="checkout__summary-toggle"
        aria-expanded={summaryOpen}
        aria-controls="checkout-summary"
        onClick={() => setSummaryOpen((open) => !open)}
      >
        <span className="checkout__summary-toggle-label">
          <Icon name="bag" size={18} />
          {summaryOpen ? t('checkout.hideSummary') : t('checkout.showSummary')}
          <Icon name="chevronDown" size={16} className="checkout__summary-toggle-icon" />
        </span>
        <span className="checkout__summary-toggle-total">{formatPrice(summary.totals.total, language)}</span>
      </button>

      <aside id="checkout-summary" className="checkout__aside" aria-labelledby="order-summary-title">
        <div className="checkout__aside-inner">
          <OrderSummary
            items={summary.items}
            totals={summary.totals}
            voucher={summary.voucher}
            readOnly={Boolean(placedOrder)}
            onApplyVoucher={handleApplyVoucher}
            onRemoveVoucher={() => setVoucher(null)}
          />
        </div>
      </aside>

      <div className="checkout__main">
        {placedOrder ? (
          <OrderSuccess order={placedOrder} />
        ) : (
          <>
            <CheckoutSteps current={step} onStepChange={goToStep} />

            {step === 'shipping' ? (
              <ShippingForm
                value={shipping}
                onChange={setShipping}
                onSubmit={handleShippingSubmit}
                user={user}
                onLogin={() => openAuth('login')}
              />
            ) : (
              <PaymentStep
                shipping={shipping}
                total={totals.total}
                shippingFee={totals.shippingFee}
                shippingDiscount={totals.shippingDiscount}
                method={paymentMethod}
                onMethodChange={setPaymentMethod}
                onEditShipping={() => goToStep('shipping')}
                onPlaceOrder={handlePlaceOrder}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default CheckoutScreen;
