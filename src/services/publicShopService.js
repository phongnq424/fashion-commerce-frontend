import { apiClient } from './apiClient';
import { getAllPublicProducts } from './catalogService';

// =====================================================================
// THÔNG TIN SHOP CHO KHÁCH MUA (trang "Xem shop", thẻ shop ở trang sản phẩm, mục shop trên trang chủ)
//
// Backend CHƯA có API công khai cho shop:
//   - GET /shops/{shopId} cần là thành viên shop (quyền shop.profile.read) -> khách thường bị 403
//   - GET /products không lọc được theo shopId
// => Tạm thời FE suy ra từ danh sách sản phẩm công khai GET /products (mỗi sản phẩm đã có
//    shopId, shopName, shopSlug). Chỉ có: tên shop, số sản phẩm, sản phẩm của shop.
//    Logo, mô tả, đánh giá shop... cần BE bổ sung API (vd GET /shops/{slug}/public, GET /products?shopId=).
// =====================================================================

function groupShops(products) {
  const shops = new Map();
  products.forEach((product) => {
    if (!product.shopId) return;
    const shop = shops.get(product.shopId) ?? {
      id: product.shopId,
      name: product.shopName ?? '',
      slug: product.shopSlug ?? '',
      productCount: 0,
      images: [],
      products: [],
    };
    shop.productCount += 1;
    shop.products.push(product);
    if (product.image && shop.images.length < 3) shop.images.push(product.image);
    shops.set(product.shopId, shop);
  });
  return [...shops.values()];
}

// Mọi shop đang có sản phẩm bán, nhiều sản phẩm trước
export async function getPublicShops() {
  const shops = groupShops(await getAllPublicProducts());
  return shops.sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name, 'vi'));
}

// 1 shop theo id. null = shop không có sản phẩm công khai (chưa bán, bị khoá, đã đóng...)
export async function getPublicShop(shopId) {
  const shops = groupShops(await getAllPublicProducts());
  return shops.find((shop) => shop.id === shopId) ?? null;
}

// Số liệu hiển thị ở khối thông tin shop (trang chi tiết sản phẩm):
//   productCount  số sản phẩm đang bán
//   saleCount     số sản phẩm đang giảm giá
//   reviewCount / averageRating  cộng dồn từ GET /products/{id}/reviews?limit=1 (summary) của từng sản phẩm
// Backend chưa có API thống kê shop -> tính tạm trên trình duyệt (tối đa MAX_REVIEW_PRODUCTS sản phẩm), có cache.
// Ngày tham gia, tỉ lệ phản hồi, người theo dõi: Backend chưa có dữ liệu công khai -> không hiển thị.
const MAX_REVIEW_PRODUCTS = 40;
const statsCache = new Map();

export function getPublicShopStats(shopId) {
  if (!statsCache.has(shopId)) {
    const request = (async () => {
      const shop = await getPublicShop(shopId);
      if (!shop) return null;
      const summaries = await Promise.all(
        shop.products.slice(0, MAX_REVIEW_PRODUCTS).map((product) =>
          apiClient
            .get(`/products/${encodeURIComponent(product.id)}/reviews?limit=1`, { auth: false })
            .then((page) => page?.summary ?? null)
            .catch(() => null),
        ),
      );
      const reviewCount = summaries.reduce((sum, item) => sum + (item?.count ?? 0), 0);
      const ratingSum = summaries.reduce((sum, item) => sum + (item?.averageRating ?? 0) * (item?.count ?? 0), 0);
      return {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        productCount: shop.productCount,
        saleCount: shop.products.filter((p) => p.originalPrice > p.price).length,
        reviewCount,
        averageRating: reviewCount ? Math.round((ratingSum / reviewCount) * 10) / 10 : 0,
      };
    })().catch((error) => {
      statsCache.delete(shopId);
      throw error;
    });
    statsCache.set(shopId, request);
  }
  return statsCache.get(shopId);
}
