import { mockProducts } from '../data/mockProducts';

// =====================================================================
// TÌM KIẾM SẢN PHẨM — dùng DỮ LIỆU GIẢ của frontend (data/mockProducts.js).
// Không gọi backend. Lọc + sắp xếp chạy ngay trên trình duyệt.
//
// Tìm theo từ khoá: bỏ dấu tiếng Việt, không phân biệt hoa thường
//   ("ao khoac" vẫn ra "Áo Khoác"). Mọi từ trong ô tìm kiếm đều phải xuất hiện
//   trong tên / mô tả / chất liệu / tên danh mục của sản phẩm.
//
// Sau này muốn tìm trên backend: chỉ cần thay thân hàm searchProducts(),
// giữ nguyên dạng trả về { items, total } -> giao diện không phải sửa.
// =====================================================================

export const SEARCH_PAGE_SIZE = 20;
// Chữ hiển thị: i18n searchPage.sorts.<id>
export const SEARCH_SORTS = ['relevance', 'newest', 'bestSelling', 'priceAsc', 'priceDesc', 'nameAsc'];
// Chữ hiển thị: i18n searchPage.offers.<id>
export const SEARCH_OFFERS = ['sale', 'new'];
// Khoảng giá gợi ý (VND). Chữ hiển thị: i18n searchPage.pricePresets.<id>
export const SEARCH_PRICE_PRESETS = [
  { id: 'under200', min: null, max: 200000 },
  { id: '200to500', min: 200000, max: 500000 },
  { id: '500to1000', min: 500000, max: 1000000 },
  { id: 'over1000', min: 1000000, max: null },
];

const wait = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

// "Áo Khoác Đỏ" -> "ao khoac do"
export function normalizeText(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const discountOf = (product) =>
  product.originalPrice > product.price ? 1 - product.price / product.originalPrice : 0;

// Điểm liên quan: khớp trong TÊN được nhiều điểm hơn khớp trong mô tả
function relevance(product, words) {
  const name = normalizeText(product.name);
  return words.reduce((score, word) => score + (name.includes(word) ? 3 : 1), 0);
}

const SORTERS = {
  relevance: (a, b) => b.score - a.score || a.order - b.order,
  newest: (a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)) || a.order - b.order,
  bestSelling: (a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0) || a.order - b.order,
  priceAsc: (a, b) => a.price - b.price || a.order - b.order,
  priceDesc: (a, b) => b.price - a.price || a.order - b.order,
  nameAsc: (a, b) => a.name.localeCompare(b.name, 'vi'),
};

/**
 * filters: { q, category, minPrice, maxPrice, offers: ['sale'|'new'], inStock, sort }
 * categoryLabels: { tops: 'Áo', bottoms: 'Quần', dresses: 'Đầm & Váy' } — tên danh mục đã dịch, để tìm
 *   "quần" ra cả sản phẩm có tên không chứa chữ đó nhưng thuộc danh mục Quần.
 * Trả về: { items: product[], total: number }  (toàn bộ kết quả; trang tự chia "Xem thêm")
 */
export async function searchProducts(filters, categoryLabels = {}) {
  await wait();
  const words = normalizeText(filters.q).split(' ').filter(Boolean);

  const results = mockProducts
    .map((product, index) => ({ ...product, source: 'mock', order: index }))
    .filter((product) => {
      if (filters.category && product.category !== filters.category) return false;
      if (filters.minPrice != null && product.price < filters.minPrice) return false;
      if (filters.maxPrice != null && product.price > filters.maxPrice) return false;
      if (filters.inStock && !product.inStock) return false;
      if (filters.offers?.includes('sale') && discountOf(product) <= 0) return false;
      if (filters.offers?.includes('new') && !product.isNew) return false;
      if (words.length === 0) return true;
      const haystack = normalizeText(
        [
          product.name,
          product.description,
          product.material,
          categoryLabels[product.category],
        ].join(' '),
      );
      return words.every((word) => haystack.includes(word));
    })
    .map((product) => ({ ...product, score: relevance(product, words) }));

  const sorter = SORTERS[filters.sort] ?? SORTERS.relevance;
  return { items: results.sort(sorter), total: results.length };
}
