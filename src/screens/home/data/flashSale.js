// =====================================================================
// CẤU HÌNH FLASH SALE TRANG CHỦ  (giao diện: components/FlashSaleSection.jsx)
// ---------------------------------------------------------------------
// Sản phẩm: lấy các sản phẩm đang giảm giá (giá gốc > giá bán) từ getSaleProducts().
//   Hiện là dữ liệu mock (data/mockProducts.js -> sản phẩm có originalPrice).
//   Backend chưa có API flash sale -> khi có thì chỉ cần đổi hàm lấy dữ liệu trong FlashSaleSection.jsx.
// Chữ hiển thị: vi.js / en.js -> home.flashSale
// =====================================================================

export const FLASH_SALE = {
  enabled: true, // false -> ẩn hẳn khối Flash Sale

  // Cách tính thời gian:
  //   'daily': ngày nào cũng có, kết thúc lúc dailyEndHour giờ (24 = nửa đêm) -> luôn đang chạy, tiện demo
  //   'fixed': chạy từ startsAt tới endsAt. Trước giờ -> "Bắt đầu sau ...", hết giờ -> "Chương trình đã kết thúc"
  mode: 'daily',
  dailyEndHour: 24,
  startsAt: '2026-11-11T00:00:00+07:00',
  endsAt: '2026-11-11T23:59:59+07:00',
  hideWhenEnded: false, // true -> hết giờ thì ẩn khối, false -> vẫn hiện với nhãn "đã kết thúc"

  limit: 10, // tối đa bao nhiêu sản phẩm
  quota: 1000, // số suất của mỗi sản phẩm -> thanh "Đã bán": soldCount / quota
  almostGonePercent: 80, // bán từ 80% suất trở lên -> "Sắp cháy hàng"
  // nút "Xem thêm sản phẩm" -> trang Danh mục sản phẩm (Trang chủ › Danh mục sản phẩm)
  // Muốn mở sẵn chỉ các sản phẩm đang giảm giá -> đổi thành '/products?offer=sale'
  seeAllHref: '/products',
};
