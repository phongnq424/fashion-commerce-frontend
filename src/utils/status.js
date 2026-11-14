// =====================================================================
// TRẠNG THÁI -> MÀU HUY HIỆU (StatusBadge tone). Chữ hiển thị nằm trong i18n:
//   orderStatus.<STATUS>, shopOrderStatus.<STATUS>, paymentStatus.<STATUS>, returnStatus.<STATUS>
// Giá trị trạng thái lấy đúng từ CHECK constraint trong migration của backend.
// =====================================================================

const TONES = {
  // Đơn hàng (orders.status)
  PENDING_PAYMENT: 'warning',
  CONFIRMED: 'info',
  PROCESSING: 'info',
  PARTIALLY_SHIPPED: 'info',
  SHIPPED: 'info',
  COMPLETED: 'success',
  CANCELLED: 'muted',
  PARTIALLY_CANCELLED: 'warning',
  // Đơn của từng shop (shop_orders.status)
  PENDING_CONFIRMATION: 'warning',
  READY_TO_SHIP: 'info',
  DELIVERED: 'success',
  RETURNED: 'muted',
  // Thanh toán (payment_intents.status)
  CREATED: 'muted',
  PENDING: 'warning',
  AWAITING_COLLECTION: 'warning',
  PAID: 'success',
  FAILED: 'danger',
  EXPIRED: 'muted',
  // Trả hàng (return_requests.status)
  REQUESTED: 'warning',
  APPROVED: 'info',
  REJECTED: 'danger',
  RETURNING: 'info',
  RECEIVED: 'info',
  REFUNDED: 'success',
};

export const statusTone = (status) => TONES[status] ?? 'muted';

// Tab trên trang "Đơn hàng của tôi": tab -> các trạng thái đơn thuộc tab đó
export const ORDER_TABS = [
  { id: 'all', statuses: null },
  { id: 'pending', statuses: ['PENDING_PAYMENT', 'CONFIRMED'] },
  { id: 'processing', statuses: ['PROCESSING'] },
  { id: 'shipping', statuses: ['PARTIALLY_SHIPPED', 'SHIPPED'] },
  { id: 'completed', statuses: ['COMPLETED'] },
  { id: 'cancelled', statuses: ['CANCELLED', 'PARTIALLY_CANCELLED'] },
];

// Thanh tiến trình đơn hàng: Đặt hàng -> Xác nhận -> Đang giao -> Hoàn thành
export const ORDER_STEPS = ['placed', 'confirmed', 'shipping', 'completed'];
export function orderStepIndex(status) {
  switch (status) {
    case 'PENDING_PAYMENT':
    case 'CONFIRMED': // backend: đơn đã đặt xong, shop chưa xác nhận
      return 0;
    case 'PROCESSING':
      return 1;
    case 'PARTIALLY_SHIPPED':
    case 'SHIPPED':
      return 2;
    case 'COMPLETED':
      return 3;
    default:
      return -1; // đã hủy
  }
}

// Ngày giờ: vi "14/11/2026 20:15"
export function formatDateTime(iso, language) {
  if (!iso) return '';
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

// "5 phút trước" / "5 minutes ago"
export function formatRelative(iso, language) {
  if (!iso) return '';
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(language === 'en' ? 'en' : 'vi', { numeric: 'auto' });
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, seconds] of units) {
    if (Math.abs(diff) >= seconds) return rtf.format(Math.round(diff / seconds), unit);
  }
  return rtf.format(0, 'minute');
}

// Phân loại hàng từ OrderItemResponse.options: { SIZE: 'M', COLOR: 'BLACK' } -> "M / BLACK"
export const formatOptions = (options) => Object.values(options ?? {}).filter(Boolean).join(' / ');

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
