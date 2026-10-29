// =====================================================================
// ẢNH + ĐƯỜNG DẪN của 2 khối quảng cáo trên trang chủ
//   COLLECTION: khối "Fashion Collection" (hình 1) + "Back in stock" (hình 2) -> LookbookSection.jsx
//   PROMO:      banner "Giảm đến 50%" + dải lợi ích                           -> PromoSection.jsx
// Chữ hiển thị nằm trong vi.js / en.js (home.lookbook, home.promo).
//
// ẢNH: bỏ ảnh của bạn vào thư mục public/banners/ đúng TÊN FILE bên dưới
//      (hoặc sửa đường dẫn cho khớp tên ảnh của bạn).
//      Chưa có ảnh / ảnh lỗi -> khối vẫn hiện nền pastel + chữ, không vỡ bố cục.
// position: phần ảnh ưu tiên giữ lại khi bị cắt (giống object-position trong CSS)
// =====================================================================

export const COLLECTION = {
  to: '/category/tops/jackets', // bấm vào khối -> trang danh mục này

  // ----- Hình 1: hàng chữ trên cùng + 4 ảnh ngang -----
  // Hàng chữ: các phong cách, mỗi chữ 1 cột. Chữ thật: vi.js / en.js -> home.lookbook.styles.<key>
  // Muốn bớt / đổi thứ tự -> sửa mảng này
  styleKeys: ['elegant', 'dynamic', 'youthful', 'edgy', 'feminine', 'minimal'],
  strip: [
    { 
      id: 'red', 
      image: 'https://i.pinimg.com/736x/4f/0d/de/4f0dde28671f689c6e8e43c63b91b0f6.jpg', 
      position: 'center 20%' 
    },
    { 
      id: 'pink', 
      image: 'https://i.pinimg.com/1200x/69/2a/10/692a1010d9ce9b324da9008efa6449d2.jpg', 
      position: 'center 20%' 
    },
    { 
      id: 'gray', 
      image: 'https://i.pinimg.com/1200x/bb/4e/a7/bb4ea79d047f5603e07035be37f563ee.jpg', 
      position: 'center 20%' 
    },
    { 
      id: 'black', 
      image: 'https://i.pinimg.com/736x/5d/68/6b/5d686b31af16fd03fd21f7e8dbf1997c.jpg', 
      position: 'center 20%' 
    },
  ],

  // ----- Hình 2: ảnh lớn "Back in stock" + 3 ảnh nhỏ bên phải -----
  feature: { 
    image: 'https://i.pinimg.com/736x/c7/88/63/c78863f5d08a62ba55fd4df05451d3c8.jpg', 
    position: 'center 25%' 
  },
  // 3 ô vuông bên phải. Chữ dưới mỗi ô: vi.js / en.js -> home.lookbook.looks.<id>
  looks: [
    { 
      id: 'look1', 
      image: 'https://i.pinimg.com/736x/8c/83/66/8c83667cc6823b38137036a6f4b7e39a.jpg', 
      position: 'center' 
    },
    { 
      id: 'look2', 
      image: 'https://i.pinimg.com/1200x/86/20/32/86203280245b41173cd3c241d0e7f03c.jpg', 
      position: 'center' 
    },
    { 
      id: 'look3',
      image: 'https://i.pinimg.com/1200x/64/6a/85/646a8561c9e35ed4be391a28513839a9.jpg', 
      position: 'center' 
    },
  ],
};

export const PROMO = {
  to: '/collections/sale', // nút "Mua hàng giảm giá" -> trang các sản phẩm đang giảm
  image: 'public/banners/banner-5.png',
  position: 'center',

  layout: 'full',
  // Chỉ dùng khi layout 'full':
  aspectRatio: '1916 / 821', // tỉ lệ ảnh (rộng / cao) -> banner cao vừa khít, không bị cắt ảnh
  textLeft: '31%', // khối chữ cách mép TRÁI banner bao nhiêu % bề rộng
  textTop: '10%', // khối chữ cách mép TRÊN banner bao nhiêu % chiều cao
  textWidth: '20%', // bề rộng tối đa của khối chữ (nhỏ lại nếu chữ đè lên người mẫu)
};