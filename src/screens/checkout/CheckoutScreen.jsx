import { useCallback, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import Logo from '../../components/layout/Logo';
import Icon from '../../components/common/Icon';
import Button from '../../components/common/Button';
import CheckoutSteps from './components/CheckoutSteps';
import AddressStep from './components/AddressStep';
import PaymentStep from './components/PaymentStep';
import CheckoutSummary from './components/CheckoutSummary';
import OrderSuccess from './components/OrderSuccess';
import CheckoutEmpty from './components/CheckoutEmpty';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { placeOrder, previewCheckout } from '../../services/orderService';
import { formatPrice } from '../../utils/format';
import './CheckoutScreen.css';

/**
 * Trang thanh toán /checkout — theo luồng Backend (sàn nhiều shop):
 *   1. Chọn địa chỉ đã lưu  -> POST /checkout/preview (server tính tiền hàng, phí ship, giảm giá theo TỪNG SHOP)
 *   2. Chọn phương thức thanh toán (GET /checkout/{snapshotId}/payment-methods) -> POST /orders
 * Backend chỉ thanh toán các dòng giỏ đang được CHỌN. "Mua ngay" -> chọn riêng đúng món đó trước khi xem trước.
 * Cần đăng nhập (giỏ khách vãng lai được chuyển lên Backend sau khi đăng nhập).
 */
function CheckoutScreen({ onNotify }) {
  const { t, language } = useLanguage();
  const { items: cartItems, selectedItems, selectOnly, reload, isServerCart } = useCart();
  const { user, openAuth } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [buyNowKey] = useState(() => location.state?.buyNowKey ?? null);

  const buyingLines = useMemo(() => {
    const buyNowLine = buyNowKey && cartItems.find((item) => item.key === buyNowKey && item.purchasable);
    return buyNowLine ? [buyNowLine] : selectedItems;
  }, [buyNowKey, cartItems, selectedItems]);

  const [addressId, setAddressId] = useState(null);
  const [voucherCodes, setVoucherCodes] = useState([]);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const step = searchParams.get('step') === 'payment' && preview ? 'payment' : 'shipping';
  const goToStep = (next) => {
    setSearchParams(next === 'payment' ? { step: 'payment' } : {});
    window.scrollTo(0, 0);
  };

  // Xem trước đơn. codes: mã giảm giá muốn áp dụng. Trả về preview hoặc ném lỗi.
  const runPreview = useCallback(
    async (codes) => {
      const cart = await selectOnly(buyingLines);
      const expectedUnitPrices = Object.fromEntries(buyingLines.map((line) => [line.variantId, line.unitPrice]));
      return previewCheckout({ cartVersion: cart?.version, addressId, voucherCodes: codes, expectedUnitPrices });
    },
    [selectOnly, buyingLines, addressId],
  );

  const handleAddressSubmit = async () => {
    setBusy(true);
    setPreviewError(null);
    try {
      const result = await runPreview(voucherCodes);
      setPreview(result);
      goToStep('payment');
    } catch (error) {
      console.error(error);
      // Mã giảm giá không còn hợp lệ -> bỏ hết mã, thử lại
      if (String(error?.code ?? '').startsWith('VOUCHER_') && voucherCodes.length) {
        setVoucherCodes([]);
        onNotify?.('warning', t(`market.errors.${error.code}`, { defaultValue: t('market.errors.UNKNOWN') }));
      }
      setPreviewError(error?.code ?? 'UNKNOWN');
    } finally {
      setBusy(false);
    }
  };

  // Thêm / bỏ mã -> xem trước lại. Mã bị Backend từ chối -> giữ mã cũ, báo lỗi.
  const handleVoucherCodesChange = async (codes) => {
    if (!preview) {
      setVoucherCodes(codes);
      return;
    }
    setBusy(true);
    try {
      const result = await runPreview(codes);
      setVoucherCodes(codes);
      setPreview(result);
    } catch (error) {
      onNotify?.('error', t(`market.errors.${error?.code}`, { defaultValue: t('market.errors.UNKNOWN') }));
    } finally {
      setBusy(false);
    }
  };

  const handlePlaceOrder = async ({ paymentMethod, buyerNote, idempotencyKey }) => {
    const returnUrl = `${window.location.origin}/account/orders`;
    const order = await placeOrder({ snapshotId: preview.snapshotId, paymentMethod, buyerNote, returnUrl, idempotencyKey });
    reload(); // Backend đã xoá các dòng vừa mua khỏi giỏ
    // Ví điện tử: chuyển sang trang cổng thanh toán
    if (order?.payment?.checkoutUrl) {
      window.location.assign(order.payment.checkoutUrl);
      return;
    }
    setPlacedOrder({ order, preview });
    window.scrollTo(0, 0);
  };

  if (!user) {
    return (
      <div className="checkout">
        <header className="checkout__header">
          <Logo />
        </header>
        <div className="checkout__main">
          <section className="checkout-section checkout-empty">
            <span className="checkout-empty__icon" aria-hidden="true">
              <Icon name="user" size={32} />
            </span>
            <h1 className="checkout-section__title">{t('market.checkout.loginTitle')}</h1>
            <p className="checkout-empty__text">{t('market.checkout.loginText')}</p>
            <Button onClick={() => openAuth('login')}>{t('market.checkout.login')}</Button>
          </section>
        </div>
      </div>
    );
  }

  if (!placedOrder && (buyingLines.length === 0 || !isServerCart)) {
    return <CheckoutEmpty />;
  }

  const shownPreview = placedOrder?.preview ?? preview;
  const total = shownPreview?.grandTotalMinor ?? buyingLines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  return (
    <div className={`checkout ${summaryOpen ? 'checkout--summary-open' : ''}`}>
      <header className="checkout__header">
        <Logo />
      </header>

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
        <span className="checkout__summary-toggle-total">{formatPrice(total, language)}</span>
      </button>

      <aside id="checkout-summary" className="checkout__aside" aria-labelledby="order-summary-title" aria-busy={busy}>
        <div className="checkout__aside-inner">
          <CheckoutSummary
            preview={shownPreview}
            lines={buyingLines}
            voucherCodes={voucherCodes}
            onVoucherCodesChange={handleVoucherCodesChange}
            readOnly={Boolean(placedOrder)}
          />
          {shownPreview?.issues?.length > 0 && (
            <ul className="checkout-alert">
              {shownPreview.issues.map((issue) => (
                <li key={`${issue.cartItemId}-${issue.code}`}>{t(`market.checkoutIssues.${issue.code}`, { defaultValue: issue.message })}</li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <div className="checkout__main">
        {placedOrder ? (
          <OrderSuccess order={placedOrder.order} />
        ) : (
          <>
            <CheckoutSteps current={step} onStepChange={goToStep} />
            {step === 'shipping' ? (
              <AddressStep
                selectedId={addressId}
                onSelect={(id) => {
                  setAddressId(id);
                  setPreview(null);
                }}
                onSubmit={handleAddressSubmit}
                busy={busy}
                error={previewError}
              />
            ) : (
              <PaymentStep preview={preview} onEditShipping={() => goToStep('shipping')} onPlaceOrder={handlePlaceOrder} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default CheckoutScreen;
