// =====================================================================
// ẢNH + ĐƯỜNG DẪN của banner khuyến mãi trên trang chủ
//   PROMO: banner "Giảm đến 50%" + dải lợi ích -> PromoSection.jsx
// Chữ hiển thị nằm trong vi.js / en.js (home.promo).
//
// ẢNH: bỏ ảnh của bạn vào thư mục public/banners/ đúng TÊN FILE bên dưới
//      (hoặc sửa đường dẫn cho khớp tên ảnh của bạn).
//      Chưa có ảnh / ảnh lỗi -> khối vẫn hiện nền pastel + chữ, không vỡ bố cục.
// position: phần ảnh ưu tiên giữ lại khi bị cắt (giống object-position trong CSS)
// =====================================================================

export const PROMO = {
  to: '/collections/sale', // nút "Mua hàng giảm giá" -> trang các sản phẩm đang giảm
  image: '/banners/banner-5.png',
  position: 'center',

  layout: 'full',
  // Chỉ dùng khi layout 'full':
  aspectRatio: '1916 / 821', // tỉ lệ ảnh (rộng / cao) -> banner cao vừa khít, không bị cắt ảnh
  textLeft: '31%', // khối chữ cách mép TRÁI banner bao nhiêu % bề rộng
  textTop: '10%', // khối chữ cách mép TRÊN banner bao nhiêu % chiều cao
  textWidth: '20%', // bề rộng tối đa của khối chữ (nhỏ lại nếu chữ đè lên người mẫu)
};