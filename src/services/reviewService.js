import { apiClient } from './apiClient';

// =====================================================================
// ĐÁNH GIÁ SẢN PHẨM (trang chi tiết) — API thật, công khai
//   GET /products/{productId}/reviews?limit=&offset=
//       -> { summary: { count, averageRating }, items: ReviewResponse[], limit, offset, hasMore }
// Viết đánh giá: chỉ người ĐÃ MUA, từ trang "Đơn hàng của tôi" (POST /order-items/{orderItemId}/review,
// xem myReviewService.js). Backend chưa có lọc theo số sao / thống kê từng mức sao -> frontend tự tính
// trên các đánh giá đã tải (tối đa 100 mới nhất).
// =====================================================================

const PAGE_SIZE = 5;
const FETCH_LIMIT = 100; // Backend: limit 1..100
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cache = new Map(); // productId -> Promise<ProductReviewsResponse>

function fetchAll(productId) {
  if (!cache.has(productId)) {
    const request = apiClient
      .get(`/products/${encodeURIComponent(productId)}/reviews?limit=${FETCH_LIMIT}&offset=0`, { auth: false })
      .catch((error) => {
        cache.delete(productId);
        throw error;
      });
    cache.set(productId, request);
  }
  return cache.get(productId);
}

const toView = (review) => ({
  id: review.id,
  name: review.buyerDisplayName || '—',
  rating: review.rating,
  title: review.title,
  comment: review.body ?? '',
  mediaKeys: review.mediaKeys ?? [],
  date: review.createdAt,
  sellerReply: review.sellerReply,
  sellerRepliedAt: review.sellerRepliedAt,
});

export async function getReviews(product, { rating = 0, page = 1 } = {}) {
  // Sản phẩm mẫu của frontend (id không phải UUID) -> chưa có đánh giá
  if (!UUID_PATTERN.test(String(product.id))) {
    return { average: 0, total: 0, breakdown: {}, items: [], hasMore: false };
  }
  const data = await fetchAll(product.id);
  const all = (data.items ?? []).map(toView);
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  all.forEach((review) => {
    breakdown[review.rating] = (breakdown[review.rating] ?? 0) + 1;
  });
  const filtered = rating ? all.filter((review) => review.rating === rating) : all;
  return {
    average: data.summary?.averageRating ?? 0,
    total: data.summary?.count ?? all.length,
    breakdown,
    items: filtered.slice(0, page * PAGE_SIZE),
    hasMore: filtered.length > page * PAGE_SIZE,
  };
}

export function clearReviewCache(productId) {
  cache.delete(productId);
}
