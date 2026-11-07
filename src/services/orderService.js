import { MOCK_VOUCHERS } from '../data/mockVouchers';

// =====================================================================
// ĐƠN HÀNG: mã giảm giá, phí vận chuyển, tính tổng tiền, đặt hàng.
// Frontend chỉ tính để HIỂN THỊ. Khi có Backend, server phải tính lại toàn bộ
// (giá, phí ship, giảm giá) khi đặt hàng, không tin số tiền gửi lên từ trình duyệt.
// =====================================================================

const wait = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

// ----- PHÍ VẬN CHUYỂN -----
// Giao trong 2-4 ngày (trừ Chủ nhật), đồng giá 30.000đ cho mọi tỉnh / thành.
// Chữ "Vận chuyển trong 2-4 ngày (trừ CN)": vi.js / en.js -> checkout.standardShipping
export const SHIPPING_FEE = 30000;
// Đơn từ mức này được miễn phí ship (khớp dòng thông báo trên Header "Miễn phí giao hàng cho đơn từ 499.000đ").
// Không muốn miễn phí ship nữa -> đổi thành null
export const FREE_SHIPPING_MIN = 499000;

// Backend: GET `${API}/shipping/fee?provinceId=...&subtotal=...`
export function getShippingFee({ subtotal }) {
  if (FREE_SHIPPING_MIN != null && subtotal >= FREE_SHIPPING_MIN) return 0;
  return SHIPPING_FEE;
}

// Backend: GET `${API}/vouchers`
export async function getVouchers() {
  await wait(150);
  return MOCK_VOUCHERS;
}

// Kiểm tra mã. Sai -> ném lỗi có error.code để giao diện chọn câu báo lỗi
// Backend: POST `${API}/vouchers/validate` với { code, subtotal }
export async function validateVoucher(code, subtotal) {
  await wait(300);
  const voucher = MOCK_VOUCHERS.find((item) => item.code === code.trim().toUpperCase());
  if (!voucher) {
    throw Object.assign(new Error('Voucher not found'), { code: 'VOUCHER_INVALID' });
  }
  if (subtotal < voucher.minSubtotal) {
    throw Object.assign(new Error('Subtotal too low'), {
      code: 'VOUCHER_MIN_SUBTOTAL',
      minSubtotal: voucher.minSubtotal,
    });
  }
  return voucher;
}

/**
 * Tính các dòng tiền ở cột "Đơn hàng":
 *   subtotal        tiền hàng
 *   discount        giảm trên tiền hàng (mã fixed / percent)
 *   shippingFee     phí ship gốc (null = chưa chọn địa chỉ)
 *   shippingDiscount  giảm phí ship (mã shipping)
 *   total           tổng phải trả
 */
export function calculateTotals({ subtotal, voucher, provinceId }) {
  const shippingFee = getShippingFee({ provinceId, subtotal });
  let discount = 0;
  let shippingDiscount = 0;

  if (voucher && subtotal >= voucher.minSubtotal) {
    if (voucher.type === 'fixed') discount = Math.min(voucher.value, subtotal);
    if (voucher.type === 'percent') {
      discount = Math.round((subtotal * voucher.value) / 100);
      if (voucher.maxDiscount) discount = Math.min(discount, voucher.maxDiscount);
    }
    if (voucher.type === 'shipping' && shippingFee) {
      shippingDiscount = Math.round((shippingFee * voucher.value) / 100);
    }
  }

  const total = Math.max(0, subtotal - discount) + Math.max(0, (shippingFee ?? 0) - shippingDiscount);
  return { subtotal, discount, shippingFee, shippingDiscount, total };
}

// Đặt hàng. Trả về mã đơn để hiện ở màn "Đặt hàng thành công"
// Backend: POST `${API}/orders` với { items, shipping, paymentMethod, voucherCode }
// paymentDetails (thẻ): { cardBrand, cardLast4, saveCard } — số thẻ đầy đủ KHÔNG BAO GIỜ đi qua đây.
//   Khi có cổng thanh toán thật, thẻ được nhập trong ô / trang của cổng, Backend chỉ nhận mã giao dịch.
export async function placeOrder({ items, shipping, paymentMethod, paymentDetails, voucherCode }) {
  await wait(800);
  if (!items?.length || !shipping || !paymentMethod) {
    throw Object.assign(new Error('Invalid order'), { code: 'ORDER_INVALID' });
  }
  void voucherCode;
  void paymentDetails;
  const orderCode = `TL${Date.now().toString().slice(-8)}`;
  return { orderCode };
}
