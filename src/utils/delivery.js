import { LOCALES } from '../i18n';

// =====================================================================
// DỰ KIẾN NGÀY GIAO HÀNG
// Quy định hiện tại (khớp chữ "Vận chuyển trong 2-4 ngày (trừ CN)" ở trang thanh toán):
//   giao sau 2 → 4 ngày kể từ lúc đặt, KHÔNG tính Chủ nhật.
// Backend: người bán nhập estimatedDeliveryAt khi giao hàng cho đơn vị vận chuyển (bước dispatch).
// Khi đơn có shipment.estimatedDeliveryAt -> dùng NGÀY THẬT đó thay cho khoảng ước tính.
// Muốn đổi số ngày: sửa 2 hằng số dưới.
// =====================================================================
export const DELIVERY_MIN_DAYS = 2;
export const DELIVERY_MAX_DAYS = 4;

// Cộng n ngày làm việc (bỏ qua Chủ nhật)
function addDays(date, days) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0) added += 1;
  }
  return result;
}

// Trạng thái đơn còn đang chờ giao -> mới hiện "Dự kiến giao"
const ACTIVE = ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'PARTIALLY_SHIPPED', 'SHIPPED'];

/**
 * Trả về { from, to } (Date) hoặc null nếu đơn đã giao xong / đã hủy.
 * - order: OrderResponse | OrderSummaryResponse (cần status, placedAt; có thể có shops[].shipment)
 */
export function getDeliveryEstimate(order) {
  if (!order || !ACTIVE.includes(order.status)) return null;
  const exact = order.shops?.map((shop) => shop.shipment?.estimatedDeliveryAt).find(Boolean);
  if (exact) return { from: new Date(exact), to: new Date(exact) };
  const placed = new Date(order.placedAt ?? Date.now());
  return { from: addDays(placed, DELIVERY_MIN_DAYS), to: addDays(placed, DELIVERY_MAX_DAYS) };
}

// "T3, 17/11 – T5, 19/11" | "Tue, 11/17 – Thu, 11/19"  (1 ngày -> chỉ 1 mốc)
export function formatDeliveryRange(estimate, language) {
  if (!estimate) return '';
  const fmt = new Intl.DateTimeFormat(LOCALES[language] ?? 'vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
  const from = fmt.format(estimate.from);
  const to = fmt.format(estimate.to);
  return from === to ? from : `${from} – ${to}`;
}
