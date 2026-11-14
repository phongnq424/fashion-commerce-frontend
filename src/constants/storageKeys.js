// Tên key lưu trong localStorage.
// Phải khớp với script chống nháy theme trong index.html.
export const STORAGE_KEYS = {
  theme: 'fc-theme',
  language: 'fc-lang',
  authSession: 'fc-auth-session',
  user: 'fc-user', // người dùng đang đăng nhập (khi bật "Ghi nhớ đăng nhập")
  cart: 'fc-cart', // giỏ hàng của khách chưa đăng nhập + sản phẩm mock
  cartVariantLabels: 'fc-cart-variant-labels', // nhãn size/màu của variant Backend (để hiện trong giỏ)
  myReviews: 'fc-my-reviews', // đánh giá đã gửi (orderItemId -> review) để hiện nút "Sửa đánh giá"
  mockOrders: 'fc-mock-orders', // đơn hàng giả lập đã đặt (services/mockOrderStore.js)
  mockWishlist: 'fc-mock-wishlist', // sản phẩm yêu thích giả lập, theo từng email (contexts/WishlistProvider.jsx)
  mockReturns: 'fc-mock-returns', // yêu cầu trả hàng giả lập (services/returnService.js)
  mockAddresses: 'fc-mock-addresses', // sổ địa chỉ giả lập, theo từng email (services/addressService.js)
  seenStories: 'fc-seen-stories', // danh mục đã xem tin nổi bật (viền vòng tròn chuyển xám)
  mockUsers: 'fc-mock-users', // CHỈ dùng cho dữ liệu giả, xoá khi có Backend thật
};
