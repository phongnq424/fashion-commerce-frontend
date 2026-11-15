import vi from './vi';
import en from './en';
import buyerVi from './buyer.vi';
import buyerEn from './buyer.en';
import adminVi from './admin.vi';
import adminEn from './admin.en';

// Gộp sâu (deep merge): chữ các trang người mua (buyer.*.js) và người bán (seller.*.js) được thêm vào từ điển chính.
// Trùng key thì giữ chữ đã có trong vi.js / en.js.
function merge(base, extra) {
  const result = { ...base };
  Object.entries(extra).forEach(([key, value]) => {
    const current = result[key];
    if (value && typeof value === 'object' && current && typeof current === 'object') {
      result[key] = merge(current, value);
    } else if (current === undefined) {
      result[key] = value;
    }
  });
  return result;
}

export const dictionaries = {
  vi: merge(merge(vi, buyerVi), adminVi),
  en: merge(merge(en, buyerEn), adminEn),
};
export const SUPPORTED_LANGUAGES = ['vi', 'en'];
export const DEFAULT_LANGUAGE = 'vi';

// Mã locale dùng cho Intl (định dạng tiền, ngày)
export const LOCALES = { vi: 'vi-VN', en: 'en-US' };
