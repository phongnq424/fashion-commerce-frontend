// =====================================================================
// SẢN PHẨM MẪU CỦA CÁC SHOP KHÁC TRÊN SÀN (ngoài TrendyLab Official và Lam Studio)
// Cùng định dạng với mockProducts.js. seed.js đổi sang ProductResponse của Backend.
//   shop      khoá shop trong seed.js: 'denim' | 'may' | 'vipham'
//   category  'tops' (Áo) | 'bottoms' (Quần) | 'dresses' (Váy & Đầm) — 3 danh mục BE đang có
//   price / originalPrice  đơn vị VND; originalPrice > price -> sản phẩm đang giảm giá
// Ảnh dùng ảnh có sẵn trong public/categories (chạy offline vẫn hiện).
// =====================================================================
const JEANS = '/categories/quan-jeans.jpg';
const JACKET = '/categories/ao-khoac.jpg';
const TEE = '/categories/ao-thun.jpg';
const SHIRT = '/categories/ao-so-mi.jpg';
const DRESS = '/categories/dam.jpg';
const SKIRT = '/categories/vay.jpg';

const BASIC_COLORS = [
  { id: 'den', name: 'Đen', hex: '#1F1F1F' },
  { id: 'trang', name: 'Trắng', hex: '#F5F5F0' },
  { id: 'be', name: 'Be', hex: '#D8C3A5' },
];
const DENIM_COLORS = [
  { id: 'xanh-dam', name: 'Xanh đậm', hex: '#22355A' },
  { id: 'xanh-nhat', name: 'Xanh nhạt', hex: '#7FA3C8' },
];

export const extraProducts = [
  // ----- Bụi Denim: chuyên đồ jean -----
  { id: 'd001', shop: 'denim', category: 'bottoms', name: 'Quần Jean Ống Suông Nam Nữ Wash Nhẹ', price: 389000, originalPrice: 459000, image: JEANS, isNew: true, inStock: true, sizes: ['28', '29', '30', '31', '32'], colors: DENIM_COLORS, material: 'Denim 100% cotton', description: 'Ống suông rộng vừa, lưng cao, wash nhẹ không phai màu khi giặt máy.' },
  { id: 'd002', shop: 'denim', category: 'bottoms', name: 'Quần Jean Skinny Co Giãn 4 Chiều', price: 349000, originalPrice: null, image: JEANS, isNew: false, inStock: true, sizes: ['26', '27', '28', '29', '30'], colors: DENIM_COLORS, material: 'Denim pha spandex', description: 'Ôm dáng, co giãn tốt, phù hợp đi làm và đi chơi.' },
  { id: 'd003', shop: 'denim', category: 'bottoms', name: 'Quần Short Jean Rách Gấu Mùa Hè', price: 219000, originalPrice: 279000, image: JEANS, isNew: true, inStock: true, sizes: ['S', 'M', 'L'], colors: [DENIM_COLORS[1]], material: 'Denim', description: 'Short jean lưng cao, gấu tua rua, mặc mát ngày hè.' },
  { id: 'd004', shop: 'denim', category: 'tops', name: 'Áo Khoác Jean Form Rộng Unisex', price: 529000, originalPrice: 650000, image: JACKET, isNew: false, inStock: true, sizes: ['M', 'L', 'XL'], colors: DENIM_COLORS, material: 'Denim 14oz', description: 'Áo khoác jean dày dặn, form boxy, 4 túi tiện dụng.' },
  { id: 'd005', shop: 'denim', category: 'bottoms', name: 'Quần Jean Ống Loe Retro', price: 419000, originalPrice: null, image: JEANS, isNew: true, inStock: true, sizes: ['26', '27', '28', '29'], colors: [DENIM_COLORS[0]], material: 'Denim', description: 'Dáng loe phong cách thập niên 70, kéo dài chân.' },
  { id: 'd006', shop: 'denim', category: 'dresses', name: 'Chân Váy Jean Chữ A Có Túi', price: 259000, originalPrice: null, image: SKIRT, isNew: false, inStock: false, sizes: ['S', 'M', 'L'], colors: [DENIM_COLORS[1]], material: 'Denim', description: 'Chân váy chữ A ngắn, cài cúc trước. (Mẫu đang hết hàng)' },

  // ----- Mây Basic: đồ basic giá tốt -----
  { id: 'm001', shop: 'may', category: 'tops', name: 'Áo Thun Cotton Basic Cổ Tròn', price: 129000, originalPrice: 169000, image: TEE, isNew: true, inStock: true, sizes: ['S', 'M', 'L', 'XL'], colors: BASIC_COLORS, material: 'Cotton 100%', description: 'Áo thun trơn 220gsm, không xù lông, không bai cổ.' },
  { id: 'm002', shop: 'may', category: 'tops', name: 'Áo Polo Pique Thoáng Mát', price: 199000, originalPrice: null, image: TEE, isNew: false, inStock: true, sizes: ['M', 'L', 'XL'], colors: BASIC_COLORS.slice(0, 2), material: 'Cotton pique', description: 'Polo cổ bẻ, vải pique thoáng khí, mặc đi làm lịch sự.' },
  { id: 'm003', shop: 'may', category: 'tops', name: 'Áo Sơ Mi Oxford Dài Tay', price: 289000, originalPrice: 349000, image: SHIRT, isNew: true, inStock: true, sizes: ['S', 'M', 'L'], colors: [{ id: 'xanh-oxford', name: 'Xanh oxford', hex: '#9DB4CF' }, BASIC_COLORS[1]], material: 'Oxford cotton', description: 'Sơ mi oxford dày vừa, ít nhăn, cúc gỗ.' },
  { id: 'm004', shop: 'may', category: 'tops', name: 'Áo Sơ Mi Linen Cộc Tay', price: 249000, originalPrice: null, image: SHIRT, isNew: false, inStock: true, sizes: ['M', 'L', 'XL'], colors: [BASIC_COLORS[2]], material: 'Linen pha', description: 'Linen mát, form rộng, hợp đi biển.' },
  { id: 'm005', shop: 'may', category: 'bottoms', name: 'Quần Kaki Ống Đứng Basic', price: 299000, originalPrice: 359000, image: JEANS, isNew: false, inStock: true, sizes: ['29', '30', '31', '32'], colors: [BASIC_COLORS[2], BASIC_COLORS[0]], material: 'Kaki cotton', description: 'Kaki co giãn nhẹ, ống đứng, dễ phối đồ.' },
  { id: 'm006', shop: 'may', category: 'dresses', name: 'Đầm Suông Basic Cổ Tròn', price: 239000, originalPrice: null, image: DRESS, isNew: true, inStock: true, sizes: ['S', 'M', 'L'], colors: BASIC_COLORS.slice(0, 2), material: 'Thun cotton', description: 'Đầm suông dáng dài qua gối, mặc ở nhà hay đi chơi đều hợp.' },

  // ----- Shop đã bị TẠM KHOÁ (admin xử lý vi phạm): sản phẩm KHÔNG hiện cho khách -----
  { id: 'v001', shop: 'vipham', category: 'tops', name: 'Áo Thun In Logo Thương Hiệu Nổi Tiếng', price: 99000, originalPrice: 899000, image: TEE, isNew: false, inStock: true, sizes: ['M', 'L'], colors: [BASIC_COLORS[0]], material: 'Cotton', description: 'Sản phẩm bị báo cáo hàng nhái.' },
];
