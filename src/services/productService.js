import {
  findCategoryForRoute,
  getCategoryRouteId,
  mapCategoryResponse,
} from '../mappers/categoryMapper';
import { mapProductDetailResponse, mapProductSummaryPage } from '../mappers/productMapper';
import { ApiError, apiClient } from './apiClient';
import { getAllPublicProducts } from './catalogService';
import { getPublicShop } from './publicShopService';

// =====================================================================
// SẢN PHẨM CÔNG KHAI (mọi shop trên sàn) — API thật
//   GET /products?q=&categoryId=&minPriceMinor=&maxPriceMinor=&inStock=&sort=NEWEST|PRICE_ASC|PRICE_DESC|NAME_ASC&cursor=&limit<=100
//   GET /products/{productId}
//   GET /catalog/categories
// Backend CHƯA có: số lượng đã bán, gợi ý, lọc "đang giảm giá" -> frontend tự suy ra từ danh sách sản phẩm.
// =====================================================================

const DEFAULT_NEW_ARRIVALS_LIMIT = 8;
const CATEGORY_PRODUCTS_LIMIT = 20;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let categoriesRequest;

function buildProductsPath(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  return `/products?${query.toString()}`;
}

async function getProductPage(params) {
  const response = await apiClient.get(buildProductsPath(params), { auth: false });
  return mapProductSummaryPage(response);
}

const discountOf = (product) => (product.originalPrice > product.price ? 1 - product.price / product.originalPrice : 0);

export async function getNewArrivals(limit = DEFAULT_NEW_ARRIVALS_LIMIT) {
  const page = await getProductPage({ sort: 'NEWEST', limit: Math.min(limit, 100) });
  return page.items;
}

// Đang giảm giá = có giá gốc (compareAtPriceMinor) lớn hơn giá bán
export async function getSaleProducts(limit = 50) {
  const products = await getAllPublicProducts();
  return products
    .filter((product) => discountOf(product) > 0)
    .sort((a, b) => discountOf(b) - discountOf(a))
    .slice(0, limit);
}

// Gợi ý: còn hàng, ưu tiên đang giảm giá rồi mới nhất
export async function getRecommendations(limit = 10) {
  const products = await getAllPublicProducts();
  return products
    .filter((product) => product.inStock)
    .sort((a, b) => discountOf(b) - discountOf(a) || a.order - b.order)
    .slice(0, limit);
}

export async function getCategories() {
  if (!categoriesRequest) {
    categoriesRequest = apiClient
      .get('/catalog/categories', { auth: false })
      .then((categories) => categories.map(mapCategoryResponse))
      .catch((error) => {
        categoriesRequest = undefined;
        throw error;
      });
  }
  return categoriesRequest;
}

export async function getProductsByCategory(categoryRouteId) {
  const categories = await getCategories();
  const category = findCategoryForRoute(categories, categoryRouteId);
  if (!category) return [];
  const page = await getProductPage({ categoryId: category.id, sort: 'NEWEST', limit: CATEGORY_PRODUCTS_LIMIT });
  return page.items;
}

// Chi tiết sản phẩm + điểm đánh giá + thông tin shop bán.
// PublicProductResponse KHÔNG có tên shop và điểm đánh giá -> lấy thêm:
//   - điểm / số đánh giá: GET /products/{id}/reviews?limit=1 (phần summary)
//   - shop: suy ra từ GET /products (xem services/publicShopService.js)
export async function getProductById(productId) {
  if (!UUID_PATTERN.test(String(productId))) return null;
  const id = encodeURIComponent(productId);
  try {
    const [product, categories, reviews] = await Promise.all([
      apiClient.get(`/products/${id}`, { auth: false }),
      getCategories(),
      apiClient.get(`/products/${id}/reviews?limit=1`, { auth: false }).catch(() => null),
    ]);
    const category = categories.find((item) => item.id === product.categoryId);
    const shop = await getPublicShop(product.shopId).catch(() => null);
    return {
      ...mapProductDetailResponse(product, { categoryRouteId: getCategoryRouteId(category) }),
      rating: reviews?.summary?.averageRating ?? 0,
      reviewCount: reviews?.summary?.count ?? 0,
      shopName: shop?.name ?? null,
      shopSlug: shop?.slug ?? null,
      shop: shop ? { id: shop.id, name: shop.name, slug: shop.slug, productCount: shop.productCount } : null,
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getRelatedProducts(product, limit = 10) {
  const page = await getProductPage({ categoryId: product.categoryId, sort: 'NEWEST', limit: Math.min(limit + 1, 100) });
  return page.items.filter((item) => item.id !== product.id).slice(0, limit);
}
