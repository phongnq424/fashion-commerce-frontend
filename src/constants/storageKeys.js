// Tên key lưu trong localStorage.
// Phải khớp với script chống nháy theme trong index.html.
export const STORAGE_KEYS = {
  theme: 'fc-theme',
  language: 'fc-lang',
  user: 'fc-user', // người dùng đang đăng nhập (khi bật "Ghi nhớ đăng nhập")
  mockUsers: 'fc-mock-users', // CHỈ dùng cho dữ liệu giả, xoá khi có Backend thật
};
