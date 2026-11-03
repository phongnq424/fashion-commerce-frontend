const NEW_PRODUCT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function isRecentlyPublished(publishedAt, now = Date.now()) {
  const publishedTime = Date.parse(publishedAt);
  const age = now - publishedTime;

  return Number.isFinite(publishedTime) && age >= 0 && age <= NEW_PRODUCT_WINDOW_MS;
}

export function mapProductSummaryResponse(product) {
  if (!product || typeof product !== 'object' || !product.id || !product.name) {
    throw new TypeError('Product summary response không đúng API contract');
  }

  return {
    id: product.id,
    slug: product.slug,
    shopId: product.shopId,
    shopName: product.shopName,
    shopSlug: product.shopSlug,
    categoryId: product.categoryId,
    brandId: product.brandId ?? null,
    name: product.name,
    targetGender: product.targetGender,

    price: product.minPriceMinor,
    maxPrice: product.maxPriceMinor,
    originalPrice: product.compareAtPriceMinor ?? null,

    imageKey: product.primaryImageKey ?? null,
    // Contract chỉ trả storage key, chưa có public URL nên ProductCard dùng placeholder.
    image: null,

    variantCount: product.variantCount,
    availableQuantity: product.availableQuantity,
    inStock: product.availableQuantity > 0,
    publishedAt: product.publishedAt,
    isNew: isRecentlyPublished(product.publishedAt),
  };
}

export function mapProductSummaryPage(response) {
  if (!response || typeof response !== 'object' || !Array.isArray(response.items)) {
    throw new TypeError('Product page response không đúng API contract');
  }

  return {
    items: response.items.map(mapProductSummaryResponse),
    limit: response.limit,
    nextCursor: response.nextCursor ?? null,
    hasMore: Boolean(response.hasMore),
  };
}
