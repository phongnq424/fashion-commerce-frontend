import vi from './vi';
import en from './en';
import buyerVi from './buyer.vi';
import buyerEn from './buyer.en';
import sellerVi from './seller.vi';
import sellerEn from './seller.en';
import adminVi from './admin.vi';
import adminEn from './admin.en';
import marketVi from './market.vi';
import marketEn from './market.en';

// Gộp sâu (deep merge): chữ các trang người mua (buyer.*), Kênh người bán (seller.*), quản trị (admin.*)
// và chữ theo luồng sàn của Backend (market.*) được thêm vào từ điển chính.
// Trùng key thì giữ chữ của từ điển đứng trước (market.* được ưu tiên nhất).
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

const build = (...parts) => parts.reduce((acc, part) => merge(acc, part), {});

export const dictionaries = {
  vi: build(marketVi, vi, buyerVi, sellerVi, adminVi),
  en: build(marketEn, en, buyerEn, sellerEn, adminEn),
};
export const SUPPORTED_LANGUAGES = ['vi', 'en'];
export const DEFAULT_LANGUAGE = 'vi';

// Mã locale dùng cho Intl (định dạng tiền, ngày)
export const LOCALES = { vi: 'vi-VN', en: 'en-US' };
