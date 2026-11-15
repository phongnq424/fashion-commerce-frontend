import { apiError, now, requireShop, slice, slugify, transact, uuid } from './adminDb';

// =====================================================================
// SẢN PHẨM CỦA SHOP — GIẢ LẬP, đúng dạng backend (contract mục 8):
//   GET    /shops/{shopId}/products                         -> SliceResponse<ShopProductSummaryResponse>
//   POST   /shops/{shopId}/products                         CreateProductRequest -> ProductResponse (DRAFT)
//   GET    /shops/{shopId}/products/{id}                    -> ProductResponse
//   PATCH  /shops/{shopId}/products/{id}                    UpdateProductRequest (expectedVersion)
//   POST   .../{id}/publish?expectedVersion=N               DRAFT -> ACTIVE (cần SKU đang bán + ảnh chính)
//   POST   .../{id}/unpublish?expectedVersion=N             ACTIVE -> ARCHIVED
//   POST   .../{id}/variants                                CreateVariantRequest
//   PATCH  .../variants/{variantId}                         UpdateVariantRequest
//   PUT    .../variants/{variantId}/price | /status
//   POST   .../{id}/images ; DELETE .../images/{imageId} ; PUT .../images/order ; PUT .../images/{imageId}/primary
//   PUT    /shops/{shopId}/products/variants/{variantId}/inventory   InventoryRequest (không cần version)
// Mọi thao tác (trừ tồn kho) phải gửi version mới nhất, sai -> 409 PRODUCT_VERSION_CONFLICT.
// Chưa có API upload: ảnh gửi bằng đường link trong storageKey.
// =====================================================================

export const PRODUCT_STATUSES = ['DRAFT', 'ACTIVE', 'HIDDEN', 'ARCHIVED', 'REMOVED'];
export const TARGET_GENDERS = ['FEMALE', 'MALE', 'UNISEX', 'KIDS'];

export function toSummary(product) {
  const prices = product.variants.map((v) => v.priceMinor);
  const primary = product.images.find((img) => img.primary) ?? product.images[0];
  return {
    id: product.id,
    shopId: product.shopId,
    sellerProductCode: product.sellerProductCode,
    name: product.name,
    slug: product.slug,
    status: product.status,
    version: product.version,
    primaryImageKey: primary?.storageKey ?? null,
    primaryImageUrl: primary?.url ?? null,
    minPriceMinor: prices.length ? Math.min(...prices) : null,
    maxPriceMinor: prices.length ? Math.max(...prices) : null,
    variantCount: product.variants.length,
    activeVariantCount: product.variants.filter((v) => v.status === 'ACTIVE').length,
    quantityOnHand: product.variants.reduce((sum, v) => sum + v.quantityOnHand, 0),
    quantityReserved: product.variants.reduce((sum, v) => sum + v.quantityReserved, 0),
    publishedAt: product.publishedAt,
    updatedAt: product.updatedAt,
    categoryId: product.categoryId, // riêng bản giả lập: để lọc theo danh mục
  };
}

function find(db, me, shopId, productId) {
  const shop = requireShop(db, me, shopId);
  const product = shop.products.find((p) => p.id === productId);
  if (!product) throw apiError(404, 'PRODUCT_NOT_FOUND');
  return { shop, product };
}

// Kiểm tra version + tăng version sau mỗi thay đổi
function mutate(db, me, shopId, productId, expectedVersion, fn) {
  const { shop, product } = find(db, me, shopId, productId);
  if (Number(expectedVersion) !== product.version) throw apiError(409, 'PRODUCT_VERSION_CONFLICT');
  if (product.status === 'REMOVED') throw apiError(409, 'PRODUCT_STATE_CONFLICT');
  fn(product, shop);
  product.version += 1;
  product.updatedAt = now();
  return product;
}

const available = (variant) => {
  variant.availableQuantity = Math.max(0, variant.quantityOnHand - variant.quantityReserved);
  return variant;
};

function variantFrom(input, optionTypes) {
  if (!input.sellerSku?.trim()) throw apiError(400, 'PRODUCT_SKU_REQUIRED');
  const keys = Object.keys(input.selections ?? {});
  if (keys.length !== optionTypes.length || !optionTypes.every((type) => keys.includes(type))) {
    throw apiError(400, 'PRODUCT_VARIANT_SELECTION_INVALID');
  }
  if (!(input.priceMinor > 0)) throw apiError(400, 'PRODUCT_PRICE_INVALID');
  if (input.compareAtPriceMinor != null && input.compareAtPriceMinor <= input.priceMinor) {
    throw apiError(400, 'PRODUCT_COMPARE_PRICE_INVALID');
  }
  return available({
    id: uuid(),
    sellerSku: input.sellerSku.trim(),
    barcode: input.barcode || null,
    selections: input.selections,
    priceMinor: Number(input.priceMinor),
    compareAtPriceMinor: input.compareAtPriceMinor ? Number(input.compareAtPriceMinor) : null,
    weightGrams: Number(input.weightGrams) || 300,
    lengthMm: input.lengthMm ? Number(input.lengthMm) : null,
    widthMm: input.widthMm ? Number(input.widthMm) : null,
    heightMm: input.heightMm ? Number(input.heightMm) : null,
    status: 'ACTIVE',
    quantityOnHand: Number(input.initialStock) || 0,
    quantityReserved: 0,
    reorderPoint: Number(input.reorderPoint) || 0,
  });
}

function uniqueSkus(variants) {
  const skus = variants.map((v) => v.sellerSku.toLowerCase());
  if (new Set(skus).size !== skus.length) throw apiError(409, 'PRODUCT_SKU_DUPLICATED');
}

export function getShopProducts(shopId, { limit = 200, offset = 0 } = {}) {
  return transact((db, me) => {
    const items = requireShop(db, me, shopId)
      .products.slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(toSummary);
    return slice(items, limit, offset);
  }, 150);
}

export function getShopProduct(shopId, productId) {
  return transact((db, me) => find(db, me, shopId, productId).product, 120);
}

export function createProduct(shopId, request) {
  return transact((db, me) => {
    const shop = requireShop(db, me, shopId);
    if (!request.name?.trim() || !request.description?.trim() || !request.categoryId) throw apiError(400, 'REQUEST_INVALID');
    if (!request.variants?.length) throw apiError(400, 'PRODUCT_VARIANT_REQUIRED');
    if (!request.images?.length) throw apiError(400, 'PRODUCT_IMAGE_REQUIRED');
    const optionTypes = request.options.map((o) => o.type);
    const options = request.options.map((option) => ({
      id: uuid(),
      type: option.type,
      displayName: option.displayName,
      sortOrder: option.sortOrder,
      values: option.values.map((value) => ({ id: uuid(), ...value, hexColor: value.hexColor ?? null })),
    }));
    const variants = request.variants.map((v) => variantFrom(v, optionTypes));
    uniqueSkus(variants);
    const at = now();
    const product = {
      id: uuid(),
      shopId,
      categoryId: request.categoryId,
      brandId: request.brandId ?? null,
      sellerProductCode: request.sellerProductCode || null,
      name: request.name.trim(),
      slug: `${slugify(request.name)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      description: request.description.trim(),
      material: request.material || null,
      fitType: request.fitType || null,
      targetGender: request.targetGender,
      careInstructions: request.careInstructions || null,
      sizeChart: request.sizeChart ?? null,
      version: 1,
      status: 'DRAFT',
      publishedAt: null,
      options,
      variants,
      images: request.images.map((img, i) => ({
        id: uuid(),
        variantId: null,
        storageKey: img.storageKey,
        url: img.storageKey,
        altText: img.altText || null,
        sortOrder: img.sortOrder ?? i,
        primary: Boolean(img.primary),
      })),
      createdAt: at,
      updatedAt: at,
    };
    if (!product.images.some((img) => img.primary)) product.images[0].primary = true;
    shop.products.unshift(product);
    return product;
  }, 350);
}

export function updateProduct(shopId, productId, request) {
  return transact((db, me) =>
    mutate(db, me, shopId, productId, request.expectedVersion, (product) => {
      ['categoryId', 'brandId', 'sellerProductCode', 'name', 'description', 'material', 'fitType', 'targetGender', 'careInstructions', 'sizeChart'].forEach((key) => {
        if (request[key] !== undefined) product[key] = request[key] === '' ? null : request[key];
      });
      if (!product.name || !product.description) throw apiError(400, 'REQUEST_INVALID');
    }),
  );
}

export function publishProduct(shopId, productId, expectedVersion) {
  return transact((db, me) =>
    mutate(db, me, shopId, productId, expectedVersion, (product) => {
      const ready = product.variants.some((v) => v.status === 'ACTIVE') && product.images.some((img) => img.primary);
      if (!['DRAFT', 'ARCHIVED'].includes(product.status) || !ready) throw apiError(409, 'PRODUCT_NOT_PUBLISHABLE');
      product.status = 'ACTIVE';
      product.publishedAt = now();
    }),
  );
}

export function unpublishProduct(shopId, productId, expectedVersion) {
  return transact((db, me) =>
    mutate(db, me, shopId, productId, expectedVersion, (product) => {
      if (product.status !== 'ACTIVE') throw apiError(409, 'PRODUCT_STATE_CONFLICT');
      product.status = 'ARCHIVED';
    }),
  );
}

export function addVariant(shopId, productId, request) {
  return transact((db, me) =>
    mutate(db, me, shopId, productId, request.expectedVersion, (product) => {
      const variant = variantFrom(request, product.options.map((o) => o.type));
      const key = JSON.stringify(variant.selections);
      if (product.variants.some((v) => JSON.stringify(v.selections) === key)) throw apiError(409, 'PRODUCT_VARIANT_DUPLICATED');
      product.variants.push(variant);
      uniqueSkus(product.variants);
    }),
  );
}

function variantOf(product, variantId) {
  const variant = product.variants.find((v) => v.id === variantId);
  if (!variant) throw apiError(404, 'PRODUCT_VARIANT_NOT_FOUND');
  return variant;
}

export function updateVariant(shopId, productId, variantId, request) {
  return transact((db, me) =>
    mutate(db, me, shopId, productId, request.expectedVersion, (product) => {
      const variant = variantOf(product, variantId);
      ['sellerSku', 'barcode', 'weightGrams', 'lengthMm', 'widthMm', 'heightMm'].forEach((key) => {
        if (request[key] !== undefined) variant[key] = request[key];
      });
      uniqueSkus(product.variants);
    }),
  );
}

export function updateVariantPrice(shopId, productId, variantId, { expectedVersion, priceMinor, compareAtPriceMinor }) {
  return transact((db, me) =>
    mutate(db, me, shopId, productId, expectedVersion, (product) => {
      const variant = variantOf(product, variantId);
      if (!(priceMinor > 0)) throw apiError(400, 'PRODUCT_PRICE_INVALID');
      if (compareAtPriceMinor != null && compareAtPriceMinor <= priceMinor) throw apiError(400, 'PRODUCT_COMPARE_PRICE_INVALID');
      variant.priceMinor = priceMinor;
      variant.compareAtPriceMinor = compareAtPriceMinor ?? null;
    }),
  );
}

export function updateVariantStatus(shopId, productId, variantId, { expectedVersion, status }) {
  return transact((db, me) =>
    mutate(db, me, shopId, productId, expectedVersion, (product) => {
      const variant = variantOf(product, variantId);
      const activeCount = product.variants.filter((v) => v.status === 'ACTIVE').length;
      if (status === 'INACTIVE' && product.status === 'ACTIVE' && variant.status === 'ACTIVE' && activeCount <= 1) {
        throw apiError(409, 'PRODUCT_LAST_ACTIVE_VARIANT');
      }
      variant.status = status;
    }),
  );
}

export function addImage(shopId, productId, { expectedVersion, storageKey, altText, primary }) {
  return transact((db, me) =>
    mutate(db, me, shopId, productId, expectedVersion, (product) => {
      if (product.images.length >= 30) throw apiError(400, 'PRODUCT_IMAGE_LIMIT');
      if (primary) product.images.forEach((img) => (img.primary = false));
      product.images.push({
        id: uuid(),
        variantId: null,
        storageKey,
        url: storageKey,
        altText: altText || null,
        sortOrder: product.images.length,
        primary: Boolean(primary) || product.images.length === 0,
      });
    }),
  );
}

export function deleteImage(shopId, productId, imageId, expectedVersion) {
  return transact((db, me) =>
    mutate(db, me, shopId, productId, expectedVersion, (product) => {
      const image = product.images.find((img) => img.id === imageId);
      if (!image) throw apiError(404, 'PRODUCT_IMAGE_NOT_FOUND');
      if (product.status === 'ACTIVE' && image.primary) throw apiError(409, 'PRODUCT_PRIMARY_IMAGE_REQUIRED');
      product.images = product.images.filter((img) => img.id !== imageId).map((img, i) => ({ ...img, sortOrder: i }));
      if (image.primary && product.images[0]) product.images[0].primary = true;
    }),
  );
}

export function reorderImages(shopId, productId, { expectedVersion, items }) {
  return transact((db, me) =>
    mutate(db, me, shopId, productId, expectedVersion, (product) => {
      const order = new Map(items.map((item) => [item.imageId, item.sortOrder]));
      product.images = product.images
        .map((img) => ({ ...img, sortOrder: order.get(img.id) ?? img.sortOrder }))
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }),
  );
}

export function setPrimaryImage(shopId, productId, imageId, expectedVersion) {
  return transact((db, me) =>
    mutate(db, me, shopId, productId, expectedVersion, (product) => {
      if (!product.images.some((img) => img.id === imageId)) throw apiError(404, 'PRODUCT_IMAGE_NOT_FOUND');
      product.images.forEach((img) => (img.primary = img.id === imageId));
    }),
  );
}

export function updateInventory(shopId, variantId, { quantityOnHand, reorderPoint }) {
  return transact((db, me) => {
    const shop = requireShop(db, me, shopId);
    const product = shop.products.find((p) => p.variants.some((v) => v.id === variantId));
    if (!product) throw apiError(404, 'PRODUCT_VARIANT_NOT_FOUND');
    const variant = variantOf(product, variantId);
    if (!Number.isInteger(quantityOnHand) || quantityOnHand < variant.quantityReserved) throw apiError(409, 'INVENTORY_BELOW_RESERVED');
    if (!Number.isInteger(reorderPoint) || reorderPoint < 0) throw apiError(400, 'REQUEST_INVALID');
    variant.quantityOnHand = quantityOnHand;
    variant.reorderPoint = reorderPoint;
    available(variant);
    product.updatedAt = now();
    return product;
  });
}
