// =====================================================================
// NỘI DUNG DÙNG CHUNG CHO TRANG CHI TIẾT SẢN PHẨM
// (hướng dẫn sử dụng, giới thiệu thương hiệu, cam kết, chính sách, bảng size)
// ---------------------------------------------------------------------
// Đây là NỘI DUNG của shop (sau này Backend / trang quản trị trả về), giống mô tả sản phẩm
// -> viết 1 ngôn ngữ, KHÔNG đưa vào vi.js / en.js.
// Tiêu đề các mục ("Mô tả sản phẩm", "Chính sách đổi trả"...) là chữ giao diện -> nằm trong vi.js / en.js.
//
// Sản phẩm nào cần nội dung riêng thì ghi đè trong mockProducts.js:
//   care: [...]  -> thay hướng dẫn sử dụng mặc định bên dưới
// =====================================================================

// Hướng dẫn sử dụng mặc định (sản phẩm không có trường "care" thì dùng danh sách này)
export const DEFAULT_CARE = [
  'Giặt máy ở chế độ nhẹ, nhiệt độ thường.',
  'Không sử dụng hoá chất tẩy có chứa Clo.',
  'Phơi trong bóng mát.',
  'Sấy thùng, chế độ nhẹ nhàng.',
  'Là ở nhiệt độ trung bình 150 độ C.',
  'Giặt với sản phẩm cùng màu.',
  'Không là lên chi tiết trang trí.',
];

export const COLOR_NOTE = 'Màu sắc có phần chênh lệch so với thực tế do ánh sáng khi chụp.';

export const BRAND_INTRO =
  'TrendyLab là thương hiệu thời trang trẻ, mang đến những thiết kế Ready-to-wear đa dạng phong cách: từ năng động, trẻ trung đến dịu dàng, nữ tính. Chúng tôi chú trọng chuẩn size cho từng dáng người, chất lượng sản phẩm và dịch vụ tận tâm, với mức giá phải chăng. Ghé TrendyLab để trải nghiệm thật nhiều sản phẩm xinh, luôn sẵn hàng nhé!';

export const COMMITMENTS = [
  'Hàng đúng mô tả sản phẩm',
  'Hình ảnh do TrendyLab tự chụp',
  'Giao hàng nhanh',
  'Tư vấn nhiệt tình, tận tâm',
];

// 3 chính sách trong phần xổ xuống (accordion) của trang chi tiết
export const POLICIES = {
  returns: {
    items: [
      'Trường hợp đổi size: khách vui lòng thanh toán phí vận chuyển 2 chiều (22.000₫ hoặc 44.000₫ tuỳ khu vực).',
      'Sản phẩm bị lỗi, giao sai hoặc giao thiếu: TrendyLab chịu hoàn toàn phí.',
      'Đổi sang sản phẩm khác: vui lòng chọn sản phẩm có giá bằng hoặc cao hơn và thanh toán phần chênh lệch cùng phí vận chuyển.',
      'Không nhận đổi / trả sản phẩm Freesize và hàng Sale (nếu muốn đổi hàng Sale, sản phẩm được tính theo giá gốc).',
    ],
    notes: [
      'Sản phẩm chưa qua sử dụng và giặt ủi.',
      'Sản phẩm còn nguyên tem và hoá đơn.',
      'Chỉ giải quyết khiếu nại khi có video quay lúc mở hàng.',
      'Hỗ trợ đổi trả trong vòng 3 ngày kể từ ngày nhận hàng.',
    ],
    footer:
      'Nếu có ý kiến đóng góp hoặc khiếu nại về chất lượng sản phẩm, quý khách vui lòng liên hệ đường dây chăm sóc khách hàng của TrendyLab.',
  },
  shipping:
    'Đơn hàng được giao trong vòng 05 - 07 ngày làm việc kể từ ngày đặt. Quý khách có thể liên hệ TrendyLab qua Email, Điện thoại hoặc Facebook để theo dõi lộ trình đơn hàng.',
  payment: [
    'Thanh toán khi nhận hàng (COD)',
    'Chuyển khoản ngân hàng',
    'Thẻ tín dụng',
    'Thẻ ATM nội địa',
  ],
};

// Bảng size chung (popup "Hướng dẫn chọn size"). Đơn vị: cm, kg
export const SIZE_CHART = [
  { size: 'S', height: '150 - 158', weight: '40 - 46', bust: '80 - 84', waist: '62 - 66' },
  { size: 'M', height: '155 - 163', weight: '46 - 52', bust: '84 - 88', waist: '66 - 70' },
  { size: 'L', height: '160 - 168', weight: '52 - 58', bust: '88 - 92', waist: '70 - 74' },
  { size: 'XL', height: '165 - 172', weight: '58 - 65', bust: '92 - 96', waist: '74 - 78' },
  { size: 'Freesize', height: '150 - 165', weight: '40 - 55', bust: '80 - 90', waist: '62 - 72' },
];
