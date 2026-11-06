import { STORAGE_KEYS } from '../constants/storageKeys';

/**
 * Giỏ hàng lưu trong trình duyệt (localStorage), dùng khi:
 *   - khách CHƯA đăng nhập (Backend chỉ cho giỏ hàng khi đã đăng nhập), hoặc
 *   - sản phẩm mock (id p001...) không có variantId nên không gửi lên Backend được.
 * Khi khách đăng nhập, CartProvider tự chuyển các dòng có variantId lên giỏ Backend.
 */

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Chế độ ẩn danh / bộ nhớ đầy: giỏ vẫn chạy trong phiên hiện tại, chỉ không lưu lại
  }
}

export function readLocalCart() {
  const items = read(STORAGE_KEYS.cart, []);
  return Array.isArray(items) ? items.filter((item) => item && item.key && item.quantity > 0) : [];
}

export function writeLocalCart(items) {
  write(STORAGE_KEYS.cart, items);
}

// Nhãn hiển thị của variant ({ size: 'M', color: 'Đỏ đô' }), vì giỏ Backend chỉ trả MÃ option.
export function readVariantLabels() {
  const labels = read(STORAGE_KEYS.cartVariantLabels, {});
  return labels && typeof labels === 'object' ? labels : {};
}

export function rememberVariantLabel(variantId, label) {
  if (!variantId) return;
  write(STORAGE_KEYS.cartVariantLabels, { ...readVariantLabels(), [variantId]: label });
}
