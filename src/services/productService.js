import {
  findCategoryForRoute,
  getCategoryRouteId,
  mapCategoryResponse,
} from '../mappers/categoryMapper';
import { mapProductDetailResponse, mapProductSummaryPage } from '../mappers/productMapper';
import { ApiError, apiClient } from './apiClient';
import {
  getMockBestSellers,
  getMockProductById,
  getMockRecommendations,
  getMockRelatedProducts,
  getMockSaleProducts,
} from './mockProductService';

const DEFAULT_NEW_ARRIVALS_LIMIT = 8;
const CATEGORY_PRODUCTS_LIMIT = 20;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let categoriesRequest;

function buildProductsPath(params) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  return `/products?${query.toString()}`;
}

async function getProductPage(params) {
  const response = await apiClient.get(buildProductsPath(params), { auth: false });
  return mapProductSummaryPage(response);
}

export async function getNewArrivals(limit = DEFAULT_NEW_ARRIVALS_LIMIT) {
  const page = await getProductPage({ sort: 'NEWEST', limit });
  return page.items;
}

// Public product contract chưa có sold count, nên mục bán chạy tạm lấy mock.
export const getBestSellers = getMockBestSellers;

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

export async function getProductsByCategory(categoryRouteId, subcategoryRouteId) {
  const categories = await getCategories();
  const category = findCategoryForRoute(categories, categoryRouteId, subcategoryRouteId);

  // Backend hiện có thể chưa seed category con tương ứng với route frontend.
  if (!category) return [];

  const page = await getProductPage({
    categoryId: category.id,
    sort: 'NEWEST',
    limit: CATEGORY_PRODUCTS_LIMIT,
  });

  return page.items;
}

export async function getProductById(productId) {
  // Section mock dùng id p001..., còn sản phẩm Backend dùng UUID.
  if (!UUID_PATTERN.test(productId)) return getMockProductById(productId);

  try {
    const [product, categories] = await Promise.all([
      apiClient.get(`/products/${encodeURIComponent(productId)}`, { auth: false }),
      getCategories(),
    ]);
    const category = categories.find((item) => item.id === product.categoryId);

    return mapProductDetailResponse(product, {
      categoryRouteId: getCategoryRouteId(category),
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

// Backend chưa có recommendations và query lọc sale, nên hai luồng này tạm lấy mock.
export const getRecommendations = getMockRecommendations;
export const getSaleProducts = getMockSaleProducts;

export async function getRelatedProducts(product, limit = 10) {
  if (product.source === 'mock') return getMockRelatedProducts(product, limit);

  const page = await getProductPage({
    categoryId: product.categoryId,
    sort: 'NEWEST',
    limit: limit + 1,
  });

  return page.items.filter((item) => item.id !== product.id).slice(0, limit);
}
