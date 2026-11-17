// =====================================================================
// NỘI DUNG CHUNG CỦA SÀN CHO TRANG CHI TIẾT SẢN PHẨM (chính sách chung, bảng size tham khảo)
// ---------------------------------------------------------------------
// Mô tả, chất liệu, dáng, hướng dẫn bảo quản là của TỪNG SẢN PHẨM (Backend: description, material, fitType,
// careInstructions). Đã bỏ phần "Giới thiệu về TrendyLab / TrendyLab cam kết" vì trên sàn mỗi sản phẩm
// thuộc một shop khác nhau, không phải của 1 thương hiệu.
// Tiêu đề các mục ("Mô tả sản phẩm", "Chính sách đổi trả"...) là chữ giao diện -> nằm trong vi.js / en.js.
// =====================================================================

export const COLOR_NOTE = 'Màu sắc có phần chênh lệch so với thực tế do ánh sáng khi chụp.';

// Chính sách CHUNG CỦA SÀN (áp dụng cho mọi shop), theo đúng luồng Backend đang có.
// Thông tin riêng từng shop (số ngày xử lý, số ngày cho trả hàng) nằm trong cài đặt shop — Backend chưa có API
// công khai để khách xem, nên ở đây chỉ ghi quy định chung.
export const POLICIES = {
  returns: {
    items: [
      'Yêu cầu trả hàng tại Tài khoản → Trả hàng / hoàn tiền, chọn đúng sản phẩm và số lượng cần trả trong đơn đã giao.',
      'Shop xem xét và duyệt / từ chối yêu cầu. Được duyệt thì bạn gửi hàng về shop và nhập mã vận đơn trả hàng.',
      'Shop nhận lại hàng, kiểm tra rồi hoàn tiền. Đơn COD được hoàn bằng chuyển khoản (shop ghi nhận mã giao dịch).',
      'Thời hạn được trả hàng do từng shop cài đặt, tính từ ngày nhận hàng.',
    ],
    notes: [
      'Sản phẩm chưa qua sử dụng và giặt ủi, còn nguyên tem.',
      'Nên quay video lúc mở hàng để làm bằng chứng khi khiếu nại.',
    ],
    footer: 'Nếu shop không phản hồi hoặc có tranh chấp, liên hệ bộ phận hỗ trợ của sàn TrendyLab.',
  },
  shipping:
    'Mỗi shop tự đóng gói và giao cho hãng vận chuyển (GHN, GHTK, Viettel Post...). Đơn có hàng của nhiều shop sẽ được tách thành nhiều kiện, giao riêng. Theo dõi trạng thái và mã vận đơn tại Tài khoản → Đơn mua.',
  payment: [
    'Thanh toán khi nhận hàng (COD) — hiện có trên mọi shop',
    'Ví MoMo, ZaloPay, VNPay — hiển thị khi sàn đã cấu hình cổng thanh toán',
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
