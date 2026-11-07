import { mockProducts } from '../data/mockProducts';
import { getCategoryRouteId } from '../mappers/categoryMapper';
import { mapProductSummaryPage } from '../mappers/productMapper';
import { apiClient } from './apiClient';
import { getCategories } from './productService';

/**
 * Dữ liệu cho trang "Danh mục sản phẩm" (/products và /category/...).
 * Gộp 2 nguồn rồi lọc + sắp xếp ngay trên trình duyệt (số sản phẩm còn ít nên làm vậy cho nhanh):
 *   - Backend: GET /products (mỗi lần tối đa 100, đi theo nextCursor) -> CHỈ ĐỌC, không sửa gì Backend
 *   - Mock:    data/mockProducts.js
 * Mỗi sản phẩm được gắn thêm categoryRouteId / subcategoryRouteId ('tops' / 'tshirts'...)
 * để khớp với menu (constants/navigation.js).
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
    const parent = category?.parentId ? byId.get(category.parentId) : null;
    return {
      ...product,
      categoryRouteId: getCategoryRouteId(parent ?? category),
      subcategoryRouteId: parent ? category.slug : null,
      soldCount: product.soldCount ?? 0,
      order: index, // thứ tự "Mặc định" = thứ tự Backend trả về (mới nhất trước)
    };
  });
}

function getMockProducts(offset) {
  return mockProducts.map((product, index) => ({
    ...product,
    source: 'mock',
    categoryRouteId: product.category,
    subcategoryRouteId: product.subcategory ?? null,
    order: offset + index,
  }));
}

// Trả về { products, apiFailed }. Backend lỗi -> vẫn hiện sản phẩm mock, apiFailed = true.
export async function getCatalogProducts() {
  let apiProducts = [];
  let apiFailed = false;
  try {
    apiProducts = await getApiProducts();
  } catch (error) {
    console.warn('[Catalog] Không tải được sản phẩm từ Backend, chỉ hiện dữ liệu mock', error);
    apiFailed = true;
  }
  return { products: [...apiProducts, ...getMockProducts(apiProducts.length)], apiFailed };
}

// ---------------------------------------------------------------------------
// Lọc + sắp xếp
// ---------------------------------------------------------------------------

const discountOf = (product) =>
  product.originalPrice > product.price ? 1 - product.price / product.originalPrice : 0;

const inCollection = (product, collection) =>
  collection.productIds?.includes(product.id) || (product.collections ?? []).includes(collection.id);

const OFFER_TESTS = {
  sale: (product) => discountOf(product) > 0,
  new: (product) => Boolean(product.isNew),
  best: (product) => Boolean(product.isBestSeller),
};

/**
 * filters: { categoryId, subId, priceRanges: [{min, max}], offers: ['sale' | 'new' | 'best'],
 *            collections: [{ id, productIds }] }
 * - Nhiều mức giá / nhiều ưu đãi được chọn cùng lúc -> sản phẩm chỉ cần khớp 1 trong số đó (HOẶC)
 * - Giữa các nhóm (danh mục, giá, ưu đãi, bộ sưu tập) -> phải khớp tất cả (VÀ)
 */
export function filterProducts(products, { categoryId, subId, priceRanges = [], offers = [], collections = [] }) {
  return products.filter((product) => {
    if (categoryId && product.categoryRouteId !== categoryId) return false;
    if (subId && product.subcategoryRouteId !== subId) return false;
    if (priceRanges.length && !priceRanges.some((range) => product.price >= range.min && product.price < range.max)) {
      return false;
    }
    if (offers.length && !offers.some((offer) => OFFER_TESTS[offer]?.(product))) return false;
    if (collections.length && !collections.some((collection) => inCollection(product, collection))) return false;
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
