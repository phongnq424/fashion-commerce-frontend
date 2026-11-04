const NEW_PRODUCT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function isRecentlyPublished(publishedAt, now = Date.now()) {
  const publishedTime = Date.parse(publishedAt);
  const age = now - publishedTime;

  return Number.isFinite(publishedTime) && age >= 0 && age <= NEW_PRODUCT_WINDOW_MS;
}

function mapCareInstructions(careInstructions) {
  if (!careInstructions) return [];

  return careInstructions
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getOption(product, type) {
  return product.options?.find((option) => option.type === type);
}

function getImageUrl(url, storageKey) {
  if (typeof url === 'string' && url.trim()) return url;
  if (typeof storageKey === 'string' && /^https?:\/\//i.test(storageKey)) return storageKey;
  return null;
}

function mapProductImages(images) {
  if (!Array.isArray(images)) return [];

  return [...images]
    .sort((first, second) => {
      if (first.primary !== second.primary) return first.primary ? -1 : 1;
      return first.sortOrder - second.sortOrder;
    })
    .map((image) => ({
      ...image,
      url: getImageUrl(image.url, image.storageKey),
    }));
}

export function mapProductSummaryResponse(product) {
  if (!product || typeof product !== 'object' || !product.id || !product.name) {
    throw new TypeError('Product summary response không đúng API contract');
  }

  return {
    source: 'api',
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
    image: getImageUrl(product.primaryImageUrl, product.primaryImageKey),

    variantCount: product.variantCount,
    availableQuantity: product.availableQuantity,
    inStock: product.availableQuantity > 0,
    publishedAt: product.publishedAt,
    isNew: isRecentlyPublished(product.publishedAt),
  };
}

export function mapProductDetailResponse(product, { categoryRouteId = null } = {}) {
  if (!product || typeof product !== 'object' || !product.id || !product.name) {
    throw new TypeError('Product detail response không đúng API contract');
  }

  const variants = Array.isArray(product.variants) ? product.variants : [];
  const priceVariant = variants.reduce(
    (lowest, variant) => (!lowest || variant.priceMinor < lowest.priceMinor ? variant : lowest),
    null,
  );
  const sizeOption = getOption(product, 'SIZE');
  const colorOption = getOption(product, 'COLOR');
  const imageRecords = mapProductImages(product.images);
  const images = imageRecords.map((image) => image.url).filter(Boolean);

  return {
    source: 'api',
    id: product.id,
    slug: product.slug,
    shopId: product.shopId,
    categoryId: product.categoryId,
    brandId: product.brandId ?? null,
    category: categoryRouteId,
    subcategory: null,
    name: product.name,
    description: product.description,
    material: product.material ?? null,
    fitType: product.fitType ?? null,
    targetGender: product.targetGender,
    care: mapCareInstructions(product.careInstructions),
    sizeChart: product.sizeChart ?? null,

    price: priceVariant?.priceMinor ?? 0,
    originalPrice: priceVariant?.compareAtPriceMinor ?? null,
    availableQuantity: variants.reduce((total, variant) => total + variant.availableQuantity, 0),
    inStock: variants.some((variant) => variant.availableQuantity > 0),
    variants,

    sizes: sizeOption?.values?.map((value) => value.label) ?? [],
    colors:
      colorOption?.values?.map((value) => ({
        id: value.id,
        code: value.code,
        name: value.label,
        hex: value.hexColor ?? 'transparent',
      })) ?? [],

    image: images[0] ?? null,
    images,
    imageRecords,
    publishedAt: product.publishedAt,
    isNew: isRecentlyPublished(product.publishedAt),
    isBestSeller: false,
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
