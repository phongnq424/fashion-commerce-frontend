import { guessColorHex } from '../utils/productVariants';

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

const sameCode = (a, b) => String(a ?? '').trim().toUpperCase() === String(b ?? '').trim().toUpperCase();

// Ảnh riêng của 1 màu. Backend gắn ảnh vào variant (image.variantId), variant có selections.COLOR = code màu.
// Không có ảnh gắn variant -> thử khớp theo altText (seller ghi tên/mã màu trong alt của ảnh).
function findColorImage(colorValue, variants, imageRecords) {
  const variantIds = new Set(
    variants.filter((variant) => sameCode(variant.selections?.COLOR, colorValue.code)).map((variant) => variant.id),
  );
  const byVariant = imageRecords.find((image) => image.url && image.variantId && variantIds.has(image.variantId));
  if (byVariant) return byVariant.url;

  const words = [colorValue.label, colorValue.code].filter(Boolean).map(toSlug).filter((word) => word.length > 1);
  const byText = imageRecords.find(
    (image) =>
      image.url &&
      words.some((word) => hasWord(image.altText, word) || hasWord(image.storageKey, word)),
  );
  return byText?.url ?? null;
}

// So khớp nguyên cụm từ: "be" khớp "ao-be.jpg" nhưng KHÔNG khớp "best.jpg"
const hasWord = (text, word) => `-${toSlug(text)}-`.includes(`-${word}-`);

// "Hồng Sữa" -> "hong-sua" để so khớp với altText / tên file ảnh (hong_sua.jpg, ao-hong-sua.webp...)
function toSlug(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Màu sắc + ảnh tương ứng của từng màu.
// Ưu tiên: ảnh gắn với variant của màu -> altText/tên file có tên màu -> (nếu không màu nào khớp được)
// lấy ảnh theo THỨ TỰ: màu thứ 1 = ảnh thứ 1, màu thứ 2 = ảnh thứ 2...
// Cách cuối dành cho dữ liệu nhập tay chưa gắn variant_id cho ảnh, miễn là xếp ảnh đúng thứ tự màu.
function mapColors(colorOption, variants, imageRecords) {
  const colors =
    colorOption?.values?.map((value) => ({
      id: value.id,
      code: value.code,
      name: value.label,
      // Thiếu hexColor -> đoán theo tên màu, để chấm màu không bị trống
      hex: value.hexColor ?? guessColorHex(value.label, value.code) ?? null,
      image: findColorImage(value, variants, imageRecords),
    })) ?? [];

  const urls = imageRecords.map((image) => image.url).filter(Boolean);
  if (colors.length > 1 && colors.every((color) => !color.image) && urls.length >= colors.length) {
    return colors.map((color, index) => ({ ...color, image: urls[index] }));
  }
  return colors;
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
    sizeOptions: sizeOption?.values?.map((value) => ({ code: value.code, label: value.label })) ?? [],
    colors: mapColors(colorOption, variants, imageRecords),

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
