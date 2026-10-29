import { mockProducts } from '../data/mockProducts';

// Lớp "service": nơi DUY NHẤT biết dữ liệu đến từ đâu.
// Hiện tại trả dữ liệu giả sau một khoảng chờ ngắn để mô phỏng độ trễ mạng.
// Khi nối Backend, chỉ thay THÂN các hàm dưới đây bằng fetch(...) tương ứng,
// các component gọi hàm vẫn giữ nguyên.
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Hàng mới về (mặc định 10 sản phẩm = 2 hàng x 5 cột).
// Backend: fetch(`${import.meta.env.VITE_API_URL}/products?sort=newest&limit=${limit}`)
export async function getNewArrivals(limit = 10) {
  await wait(600);
  return mockProducts.filter((product) => product.isNew).slice(0, limit);
}

// Sản phẩm bán chạy: sắp xếp theo số lượng đã bán, cao nhất trước.
// Backend: fetch(`${API}/products?sort=best-selling&limit=${limit}`)
export async function getBestSellers(limit = 10) {
  await wait(600);
  return [...mockProducts].sort((a, b) => b.soldCount - a.soldCount).slice(0, limit);
}

// Lấy sản phẩm theo danh mục. subcategory có thể bỏ trống (= cả danh mục).
// Backend: fetch(`${API}/products?category=${category}&subcategory=${subcategory ?? ''}`)
export async function getProductsByCategory(category, subcategory) {
  await wait(500);
  return mockProducts.filter(
    (product) =>
      product.category === category && (!subcategory || product.subcategory === subcategory),
  );
}

// Chi tiết 1 sản phẩm. Không có -> trả null (trang chi tiết sẽ hiện "Không tìm thấy").
// Backend: const res = await fetch(`${API}/products/${id}`);
//          if (res.status === 404) return null;
//          if (!res.ok) throw new Error(`HTTP ${res.status}`);
//          return res.json();
export async function getProductById(id) {
  await wait(400);
  return mockProducts.find((product) => product.id === id) ?? null;
}

// Gợi ý cho bạn. Hiện tại: chọn sản phẩm CÒN HÀNG, ưu tiên sản phẩm đang giảm giá
// hoặc bán chạy, rồi tới các sản phẩm còn lại.
// Backend thật sẽ cá nhân hoá theo lịch sử xem / mua của từng người:
//   fetch(`${API}/products/recommendations?limit=${limit}`, { credentials: 'include' })
export async function getRecommendations(limit = 10) {
  await wait(600);
  const score = (product) => (product.originalPrice ? 2 : 0) + (product.isBestSeller ? 1 : 0);
  return mockProducts
    .filter((product) => product.inStock)
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit);
}

// Sản phẩm đang giảm giá (trang "Mua hàng giảm giá" của banner khuyến mãi)
// Backend: fetch(`${API}/products?onSale=true`)
export async function getSaleProducts(limit = 50) {
  await wait(500);
  return mockProducts.filter((product) => product.originalPrice > product.price).slice(0, limit);
}
