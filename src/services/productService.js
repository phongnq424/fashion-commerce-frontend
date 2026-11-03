import { findCategoryForRoute, mapCategoryResponse } from '../mappers/categoryMapper';
import { mapProductSummaryPage } from '../mappers/productMapper';
import { apiClient } from './apiClient';

const NEW_ARRIVALS_LIMIT = 8;
const CATEGORY_PRODUCTS_LIMIT = 20;

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
  const response = await apiClient.get(buildProductsPath(params));
  return mapProductSummaryPage(response);
}

export async function getNewArrivals() {
  const page = await getProductPage({ sort: 'NEWEST', limit: NEW_ARRIVALS_LIMIT });
  return page.items;
}

export async function getCategories() {
  if (!categoriesRequest) {
    categoriesRequest = apiClient
      .get('/catalog/categories')
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
