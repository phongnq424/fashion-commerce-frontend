import { apiClient } from './apiClient';

// =====================================================================
// THANH TOÁN / ĐẶT HÀNG — API thật (cần đăng nhập). Server tính toàn bộ tiền, frontend chỉ hiển thị.
//   POST /checkout/preview                      { expectedCartVersion, addressId, expectedUnitPrices?, voucherCodes? }
//        -> CheckoutPreviewResponse (snapshotId, shops[], tổng tiền, issues[], readyForOrder)
//   GET  /checkout/{snapshotId}/payment-methods -> PaymentMethodResponse[] (COD | MOMO | ZALOPAY | VNPAY)
//   POST /orders  (header Idempotency-Key)      { checkoutSnapshotId, paymentMethod, buyerNote?, returnUrl? }
//        -> OrderResponse. Backend tự xoá các dòng đã mua khỏi giỏ.
//   GET  /vouchers/available?shopId=&subtotalMinor=&shippingFeeMinor= -> AvailableVoucherResponse[]
// Backend chỉ thanh toán các dòng ĐANG ĐƯỢC CHỌN (selected) trong giỏ.
// =====================================================================

const newKey = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;

export function previewCheckout({ cartVersion, addressId, voucherCodes = [], expectedUnitPrices }) {
  return apiClient.post('/checkout/preview', {
    expectedCartVersion: cartVersion,
    addressId,
    expectedUnitPrices: expectedUnitPrices && Object.keys(expectedUnitPrices).length ? expectedUnitPrices : undefined,
    voucherCodes: voucherCodes.length ? voucherCodes : undefined,
  });
}

export function getPaymentMethods(snapshotId) {
  return apiClient.get(`/checkout/${encodeURIComponent(snapshotId)}/payment-methods`);
}

// idempotencyKey: giữ nguyên khi bấm lại sau lỗi mạng để không tạo 2 đơn
export function placeOrder({ snapshotId, paymentMethod, buyerNote, returnUrl, idempotencyKey = newKey() }) {
  return apiClient.post(
    '/orders',
    {
      checkoutSnapshotId: snapshotId,
      paymentMethod,
      buyerNote: buyerNote?.trim() || null,
      returnUrl: returnUrl ?? null,
    },
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
}

export function getAvailableVouchers({ shopId, subtotalMinor, shippingFeeMinor = 0 }) {
  const query = new URLSearchParams({ shopId, subtotalMinor: String(subtotalMinor), shippingFeeMinor: String(shippingFeeMinor) });
  return apiClient.get(`/vouchers/available?${query}`);
}

export const newIdempotencyKey = newKey;
