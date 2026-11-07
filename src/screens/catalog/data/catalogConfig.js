// =====================================================================
// CẤU HÌNH TRANG "DANH MỤC SẢN PHẨM"  (/products và /category/...)
// Chữ hiển thị nằm trong vi.js / en.js -> catalog.*
// =====================================================================

// ----- BANNER đầu trang -----
// Cố định cho MỌI trang danh mục (khác banner trang chủ). Lọc / đổi danh mục -> banner KHÔNG đổi.
// image: dán link ảnh (https://...) hoặc bỏ ảnh vào public/banners/ rồi ghi '/banners/ten-anh.jpg'
//        Để trống '' -> hiện nền màu thương hiệu + chữ (catalog.banner.* trong vi.js / en.js)
// showText: true -> hiện chữ đè lên ảnh. Ảnh đã có sẵn chữ thì đặt false.
export const CATALOG_BANNER = {
  image: '/categories/TrendyLab.png', // ảnh nằm ở public/categories/TrendyLab.png -> KHÔNG ghi chữ /public
  imageAlt: 'Banner danh mục sản phẩm', // mô tả ảnh cho trình đọc màn hình
  position: 'center', // phần ảnh ưu tiên giữ lại khi bị cắt (object-position)
  // KÍCH THƯỚC: banner luôn rộng bằng màn hình, chiều cao = chiều rộng x (cao / rộng).
  // aspectRatio: điền ĐÚNG kích thước thật của ảnh ('rộng / cao') -> hiện trọn ảnh, không bị cắt
  aspectRatio: '1774 / 887', // kích thước thật của TrendyLab.png
  // maxHeight: chiều cao tối đa. 'none' = không giới hạn (hiện trọn ảnh trên mọi màn hình).
  //   Đặt số (vd '520px') -> màn hình rộng sẽ cắt bớt trên/dưới ảnh, phần giữ lại theo `position`
  maxHeight: 'none',
  showText: false, // ảnh đã có sẵn chữ TRENDYLAB -> tắt chữ đè
  link: '', // bấm banner đi đâu (vd '/products?offer=sale'). Để trống = không bấm được
};

// ----- Mức giá (bộ lọc bên trái) -----
// id dùng trên đường dẫn (?price=100-200). min <= giá < max (đơn vị đồng)
export const PRICE_RANGES = [
  { id: 'under-100', min: 0, max: 100_000 },
  { id: '100-200', min: 100_000, max: 200_000 },
  { id: '200-300', min: 200_000, max: 300_000 },
  { id: '300-500', min: 300_000, max: 500_000 },
  { id: 'over-500', min: 500_000, max: Infinity },
];

// ----- Bộ sưu tập (bộ lọc bên trái) -----
// Mỗi bộ sưu tập = 1 ô tick. Tên hiển thị: vi.js / en.js -> catalog.collections.<id>
// Sản phẩm thuộc bộ sưu tập khi:
//   - id sản phẩm có trong productIds bên dưới, HOẶC
//   - sản phẩm có trường collections: ['tet-2027'] (thêm vào data/mockProducts.js)
// Muốn thêm bộ sưu tập: thêm 1 dòng ở đây + thêm tên trong vi.js / en.js
export const COLLECTIONS = [
  { id: 'tet-2027', productIds: ['p003', 'p006', 'p010', 'p014', 'p015'] },
];

// Lọc ưu đãi qua đường dẫn (không có ô tick bên trái), vd /products?offer=sale
// Đang giữ để các link cũ vẫn chạy. sale = đang giảm giá, new = hàng mới, best = bán chạy
export const OFFERS = ['sale', 'new', 'best'];

// ----- Sắp xếp (nút bên phải, cùng hàng tiêu đề) -----
export const SORT_OPTIONS = ['default', 'newest', 'bestSelling', 'priceAsc', 'priceDesc', 'discount', 'nameAsc'];

export const PAGE_SIZE = 20; // số sản phẩm hiện trước, bấm "Xem thêm" để hiện tiếp
