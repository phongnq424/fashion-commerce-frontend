import { getCategoryRouteId } from '../mappers/categoryMapper';
import { mapProductSummaryPage } from '../mappers/productMapper';
import { apiClient } from './apiClient';
import { getCategories } from './productService';

/**
 * Dữ liệu cho trang "Danh mục sản phẩm" (/products và /category/...).
 * Lấy sản phẩm đang bán của MỌI SHOP trên sàn rồi lọc + sắp xếp ngay trên trình duyệt:
 *   - Backend: GET /products (mỗi lần tối đa 100, đi theo nextCursor) -> CHỈ ĐỌC
 * Mỗi sản phẩm được gắn thêm categoryRouteId ('tops' | 'bottoms' | 'dresses') để khớp với menu
 * (constants/navigation.js). Backend chỉ có 3 danh mục gốc, không có danh mục con.
 */

const PAGE_LIMIT = 100; // Backend cho tối đa 100 / lần
const MAX_PAGES = 3; // tối đa 300 sản phẩm Backend

async function getApiProducts() {
  const categories = await getCategories();
  const byId = new Map(categories.map((category) => [category.id, category]));

  const items = [];
  let cursor = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const query = new URLSearchParams({ sort: 'NEWEST', limit: String(PAGE_LIMIT) });
    if (cursor) query.set('cursor', cursor);
    const result = mapProductSummaryPage(await apiClient.get(`/products?${query}`, { auth: false }));
    items.push(...result.items);
    if (!result.hasMore || !result.nextCursor) break;
    cursor = result.nextCursor;
  }

  return items.map((product, index) => {
    const category = byId.get(product.categoryId);
    return {
      ...product,
      categoryRouteId: getCategoryRouteId(category),
      soldCount: product.soldCount ?? 0,
      order: index, // thứ tự "Mặc định" = thứ tự Backend trả về (mới nhất trước)
    };
  });
}

// Cache ngắn (1 phút) để trang chủ / bộ sưu tập / tìm kiếm không tải lại nhiều lần
let cached = null;
export function getAllPublicProducts() {
  if (!cached || Date.now() - cached.at > 60_000) {
    const request = getApiProducts().catch((error) => {
      cached = null;
      throw error;
    });
    cached = { at: Date.now(), request };
  }
  return cached.request;
}

// Trả về { products, apiFailed }.
export async function getCatalogProducts() {
  try {
    return { products: await getAllPublicProducts(), apiFailed: false };
  } catch (error) {
    console.warn('[Catalog] Không tải được sản phẩm từ Backend', error);
    return { products: [], apiFailed: true };
  }
}

// ---------------------------------------------------------------------------
// Lọc + sắp xếp
// ---------------------------------------------------------------------------

const discountOf = (product) =>
  product.originalPrice > product.price ? 1 - product.price / product.originalPrice : 0;

const OFFER_TESTS = {
  sale: (product) => discountOf(product) > 0,
  new: (product) => Boolean(product.isNew),
  best: (product) => Boolean(product.isBestSeller),
};

/**
 * filters: { categoryId, priceRanges: [{min, max}], offers: ['sale' | 'new' | 'best'], shopIds: [uuid] }
 * - Nhiều mức giá / nhiều ưu đãi được chọn cùng lúc -> sản phẩm chỉ cần khớp 1 trong số đó (HOẶC)
 * - Giữa các nhóm (danh mục, giá, ưu đãi, shop) -> phải khớp tất cả (VÀ)
 */
export function filterProducts(products, { categoryId, priceRanges = [], offers = [], shopIds = [] }) {
  return products.filter((product) => {
    if (categoryId && product.categoryRouteId !== categoryId) return false;
    if (priceRanges.length && !priceRanges.some((range) => product.price >= range.min && product.price < range.max)) {
      return false;
    }
    if (offers.length && !offers.some((offer) => OFFER_TESTS[offer]?.(product))) return false;
    if (shopIds.length && !shopIds.includes(product.shopId)) return false;
    return true;
  });
}

const SORTERS = {
  default: (a, b) => a.order - b.order,
  newest: (a, b) =>
    Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)) ||
    String(b.publishedAt ?? '').localeCompare(String(a.publishedAt ?? '')) ||
    a.order - b.order,
  bestSelling: (a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0) || a.order - b.order,
  priceAsc: (a, b) => a.price - b.price || a.order - b.order,
  priceDesc: (a, b) => b.price - a.price || a.order - b.order,
  discount: (a, b) => discountOf(b) - discountOf(a) || a.order - b.order,
  nameAsc: (a, b) => a.name.localeCompare(b.name, 'vi'),
};

export function sortProducts(products, sortId) {
  return [...products].sort(SORTERS[sortId] ?? SORTERS.default);
}
