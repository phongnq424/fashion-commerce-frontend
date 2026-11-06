// Tên key lưu trong localStorage.
// Phải khớp với script chống nháy theme trong index.html.
export const STORAGE_KEYS = {
  theme: 'fc-theme',
  language: 'fc-lang',
  authSession: 'fc-auth-session',
  user: 'fc-user', // người dùng đang đăng nhập (khi bật "Ghi nhớ đăng nhập")
  cart: 'fc-cart', // giỏ hàng của khách chưa đăng nhập + sản phẩm mock
  cartVariantLabels: 'fc-cart-variant-labels', // nhãn size/màu của variant Backend (để hiện trong giỏ)
  mockUsers: 'fc-mock-users', // CHỈ dùng cho dữ liệu giả, xoá khi có Backend thật
};
