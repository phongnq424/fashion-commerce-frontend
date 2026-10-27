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
