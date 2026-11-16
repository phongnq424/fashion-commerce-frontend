// Tên key lưu trong localStorage.
// Phải khớp với script chống nháy theme trong index.html.
export const STORAGE_KEYS = {
  theme: 'fc-theme',
  language: 'fc-lang',
  authSession: 'fc-auth-session',
  user: 'fc-user', // người dùng đang đăng nhập (khi bật "Ghi nhớ đăng nhập")
  cart: 'fc-cart', // giỏ hàng của khách chưa đăng nhập (chuyển lên Backend khi đăng nhập)
  cartVariantLabels: 'fc-cart-variant-labels', // nhãn size/màu của variant Backend (để hiện trong giỏ)
  myReviews: 'fc-my-reviews', // đánh giá đã gửi (orderItemId -> review) để hiện nút "Sửa đánh giá"
  sellerShop: 'fc-seller-shop', // shop đang chọn trong Kênh người bán
  seenStories: 'fc-seen-stories', // danh mục đã xem tin nổi bật (viền vòng tròn chuyển xám)
  mockUsers: 'fc-mock-users', // CHỈ dùng cho dữ liệu giả, xoá khi có Backend thật
};
