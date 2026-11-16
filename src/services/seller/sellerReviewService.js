import { apiClient } from '../apiClient';
import { enc } from './constants';
import { getAllShopProducts } from './sellerProductService';

// =====================================================================
// ĐÁNH GIÁ SẢN PHẨM CỦA SHOP — API thật
// Backend CHƯA có API "mọi đánh giá của shop" -> gộp đánh giá công khai của từng sản phẩm đang bán:
//   GET /products/{productId}/reviews?limit=100&offset=0   -> ProductReviewsResponse (Public)
// Trả lời:
//   PUT /shops/{shopId}/reviews/{reviewId}/reply           { reply } -> ReviewResponse (gửi lại = sửa)
// =====================================================================

export async function getShopReviews(shopId) {
  const products = (await getAllShopProducts(shopId)).items.filter((p) => p.publishedAt || p.status === 'ACTIVE');
  const pages = await Promise.all(
    products.map((product) =>
      apiClient
        .get(`/products/${enc(product.id)}/reviews?limit=100&offset=0`, { auth: false })
        .then((page) =>
          (page?.items ?? []).map((review) => ({
            ...review,
            productName: product.name,
            productImageUrl: product.primaryImageUrl ?? null,
          })),
        )
        .catch(() => []),
    ),
  );
  const items = pages.flat().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const count = items.length;
  const averageRating = count ? Math.round((items.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10 : 0;
  return { summary: { count, averageRating }, items, limit: count, offset: 0, hasMore: false };
}

export function replyReview(shopId, reviewId, reply) {
  return apiClient.put(`/shops/${enc(shopId)}/reviews/${enc(reviewId)}/reply`, { reply: reply.trim() });
}
