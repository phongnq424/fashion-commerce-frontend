import { apiClient } from '../apiClient';
import { enc, fetchAllSlices, MAX_PAGE } from './constants';

// =====================================================================
// SẢN PHẨM CỦA SHOP — API thật
//   GET    /shops/{shopId}/products?limit=&offset=           -> SliceResponse<ShopProductSummaryResponse>
//   POST   /shops/{shopId}/products                         CreateProductRequest -> ProductResponse (DRAFT)
//   GET    /shops/{shopId}/products/{id}                    -> ProductResponse
//   PATCH  /shops/{shopId}/products/{id}                    UpdateProductRequest (expectedVersion)
//   POST   .../{id}/publish?expectedVersion=N               -> ACTIVE (cần SKU đang bán + ảnh chính)
//   POST   .../{id}/unpublish?expectedVersion=N             ACTIVE -> ARCHIVED
//   POST   .../{id}/variants                                CreateVariantRequest
//   PATCH  .../{id}/variants/{variantId}                    UpdateVariantRequest
//   PUT    .../{id}/variants/{variantId}/price | /status
//   POST   .../{id}/images ; DELETE .../images/{imageId}?expectedVersion= ; PUT .../images/order ; PUT .../images/{imageId}/primary
//   PUT    /shops/{shopId}/products/variants/{variantId}/inventory   InventoryRequest (không cần version)
// Mọi thao tác (trừ tồn kho) phải gửi version mới nhất, sai -> 409 PRODUCT_VERSION_CONFLICT.
// Chưa có API upload: ảnh gửi bằng đường link trong storageKey.
// =====================================================================

export const PRODUCT_STATUSES = ['DRAFT', 'ACTIVE', 'HIDDEN', 'ARCHIVED', 'REMOVED'];
export const TARGET_GENDERS = ['FEMALE', 'MALE', 'UNISEX', 'KIDS'];

const base = (shopId) => `/shops/${enc(shopId)}/products`;
const one = (shopId, productId) => `${base(shopId)}/${enc(productId)}`;
const variant = (shopId, productId, variantId) => `${one(shopId, productId)}/variants/${enc(variantId)}`;

export function getShopProducts(shopId, { limit = MAX_PAGE, offset = 0 } = {}) {
  return apiClient.get(`${base(shopId)}?limit=${Math.min(limit, MAX_PAGE)}&offset=${offset}`);
}

// Tải tối đa 500 sản phẩm (danh sách / tồn kho / thống kê)
export function getAllShopProducts(shopId) {
  return fetchAllSlices(({ limit, offset }) => getShopProducts(shopId, { limit, offset }));
}

export function getShopProduct(shopId, productId) {
  return apiClient.get(one(shopId, productId));
}

export function createProduct(shopId, request) {
  return apiClient.post(base(shopId), request);
}

export function updateProduct(shopId, productId, request) {
  const body = Object.fromEntries(
    Object.entries(request)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, value === '' ? null : value]),
  );
  return apiClient.patch(one(shopId, productId), body);
}

export function publishProduct(shopId, productId, expectedVersion) {
  return apiClient.post(`${one(shopId, productId)}/publish?expectedVersion=${expectedVersion}`);
}

export function unpublishProduct(shopId, productId, expectedVersion) {
  return apiClient.post(`${one(shopId, productId)}/unpublish?expectedVersion=${expectedVersion}`);
}

export function addVariant(shopId, productId, request) {
  return apiClient.post(`${one(shopId, productId)}/variants`, request);
}

export function updateVariant(shopId, productId, variantId, request) {
  return apiClient.patch(variant(shopId, productId, variantId), request);
}

export function updateVariantPrice(shopId, productId, variantId, { expectedVersion, priceMinor, compareAtPriceMinor }) {
  return apiClient.put(`${variant(shopId, productId, variantId)}/price`, {
    expectedVersion,
    priceMinor: Number(priceMinor),
    compareAtPriceMinor: compareAtPriceMinor ? Number(compareAtPriceMinor) : null,
  });
}

export function updateVariantStatus(shopId, productId, variantId, { expectedVersion, status }) {
  return apiClient.put(`${variant(shopId, productId, variantId)}/status`, { expectedVersion, status });
}

export function addImage(shopId, productId, { expectedVersion, storageKey, altText, primary, sortOrder = 0, variantId = null }) {
  return apiClient.post(`${one(shopId, productId)}/images`, {
    expectedVersion,
    storageKey,
    altText: altText || null,
    sortOrder,
    primary: Boolean(primary),
    variantId,
  });
}

export function deleteImage(shopId, productId, imageId, expectedVersion) {
  return apiClient.delete(`${one(shopId, productId)}/images/${enc(imageId)}?expectedVersion=${expectedVersion}`);
}

export function reorderImages(shopId, productId, { expectedVersion, items }) {
  return apiClient.put(`${one(shopId, productId)}/images/order`, { expectedVersion, items });
}

export function setPrimaryImage(shopId, productId, imageId, expectedVersion) {
  return apiClient.put(`${one(shopId, productId)}/images/${enc(imageId)}/primary`, { expectedVersion });
}

export function updateInventory(shopId, variantId, { quantityOnHand, reorderPoint, note }) {
  return apiClient.put(`${base(shopId)}/variants/${enc(variantId)}/inventory`, {
    quantityOnHand: Number(quantityOnHand),
    reorderPoint: Number(reorderPoint),
    note: note?.trim() || null,
  });
}
