// =====================================================================
// TRANG LIÊN HỆ (/contact): số điện thoại, email, bản đồ
//
// - Số điện thoại + email: lấy chung từ SHOP_CONTACT (src/constants/footer.js)
//   -> sửa 1 chỗ, footer và trang Liên hệ đổi theo.
// - Chữ (tên cửa hàng, địa chỉ, giờ làm việc, câu mô tả, nhãn ô nhập): vi.js / en.js -> contact
//   Địa chỉ dùng chung với footer: vi.js / en.js -> footer.address
// =====================================================================

import { SHOP_CONTACT } from './footer';

export const CONTACT_INFO = {
  phone: SHOP_CONTACT.phone,
  phoneHref: SHOP_CONTACT.phoneHref,
  email: SHOP_CONTACT.email,

  // ----- Bản đồ Google Maps bên phải -----
  // Cách 1 (đơn giản): ghi địa chỉ, Google tự tìm và ghim.
  mapQuery: '123 Nguyễn Văn Cừ, Quận 5, TP.HCM',

  // Cách 2 (ghim chính xác): Google Maps -> tìm cửa hàng -> Chia sẻ -> Nhúng bản đồ -> Sao chép HTML,
  // chỉ lấy phần link trong src="..." rồi dán vào đây. Có link này thì bỏ qua mapQuery.
  mapEmbedUrl: '',

  mapZoom: 16, // 1 (cả thế giới) -> 21 (sát nhà). Chỉ dùng cho cách 1
};

// Link nhúng bản đồ (không cần API key)
export function getMapEmbedUrl({ mapEmbedUrl, mapQuery, mapZoom }, lang = 'vi') {
  if (mapEmbedUrl) return mapEmbedUrl;
  return `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&hl=${lang}&z=${mapZoom}&output=embed`;
}
