import { apiError, now, requireShop, transact } from './adminDb';

// =====================================================================
// ĐÁNH GIÁ SẢN PHẨM CỦA SHOP — GIẢ LẬP.
// Backend hiện CHƯA có API "mọi đánh giá của shop"; đọc theo từng sản phẩm:
//   GET /products/{productId}/reviews?limit=&offset=     -> ProductReviewsResponse (Public)
// Trả lời:
//   PUT /shops/{shopId}/reviews/{reviewId}/reply          { reply } -> ReviewResponse (gửi lại = sửa câu trả lời)
// Bản giả lập trả luôn danh sách gộp của cả shop (kèm productName, productImageUrl để hiển thị).
// =====================================================================

export function getShopReviews(shopId) {
  return transact((db, me) => {
    const shop = requireShop(db, me, shopId);
    const items = shop.reviews.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const count = items.length;
    const averageRating = count ? Math.round((items.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10 : 0;
    return { summary: { count, averageRating }, items, limit: count, offset: 0, hasMore: false };
  }, 150);
}

export function replyReview(shopId, reviewId, reply) {
  return transact((db, me) => {
    const shop = requireShop(db, me, shopId);
    const review = shop.reviews.find((r) => r.id === reviewId);
    if (!review) throw apiError(404, 'REVIEW_NOT_FOUND');
    if (!reply?.trim() || reply.length > 5000) throw apiError(400, 'REQUEST_INVALID');
    Object.assign(review, { sellerReply: reply.trim(), sellerRepliedAt: now(), updatedAt: now() });
    return review;
  });
}
