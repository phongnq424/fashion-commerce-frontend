import { LOCALES } from '../i18n';

// Định dạng giá theo ngôn ngữ đang chọn. Đây là ĐỊNH DẠNG, không phải dịch:
//   vi -> "459.000 ₫"     en -> "₫459,000"
export function formatPrice(value, language) {
  return new Intl.NumberFormat(LOCALES[language] ?? 'vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export function getDiscountPercent(price, originalPrice) {
  if (!originalPrice || originalPrice <= price) return 0;
  return Math.round((1 - price / originalPrice) * 100);
}

// Số lớn gọn kiểu Shopee: 312 -> "312", 2450 -> "2,4k", 2000 -> "2k+" (dùng cho "Đã bán")
export function formatCompact(value, language) {
  if (value < 1000) return String(value);
  const thousands = value / 1000;
  const rounded = Math.floor(thousands * 10) / 10;
  const text = new Intl.NumberFormat(LOCALES[language] ?? 'vi-VN', { maximumFractionDigits: 1 }).format(rounded);
  return `${text}k${Number.isInteger(rounded) ? '+' : ''}`;
}

// Ngày dạng ngắn theo ngôn ngữ: vi "28/10/2026" | en "10/28/2026"
export function formatDate(iso, language) {
  return new Intl.DateTimeFormat(LOCALES[language] ?? 'vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
}
