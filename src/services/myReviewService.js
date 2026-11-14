import { apiClient } from './apiClient';
import { STORAGE_KEYS } from '../constants/storageKeys';

// =====================================================================
// ĐÁNH GIÁ CỦA TÔI — theo backend:
//   POST /order-items/{orderItemId}/review   ReviewRequest -> ReviewResponse (chỉ dòng hàng đã giao, chưa review)
//   PUT  /reviews/{reviewId}                  ReviewRequest -> ReviewResponse
// ReviewRequest: { rating 1..5, title? (<=180), body? (<=5000), mediaKeys? (<=8 URL ảnh) }
//
// Backend chưa có API "đánh giá của tôi theo đơn", nên đánh giá vừa gửi được nhớ trên trình duyệt
// (orderItemId -> review) để hiện nút "Sửa đánh giá".
// =====================================================================

function readMap() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.myReviews) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

function remember(review) {
  try {
    const map = readMap();
    map[review.orderItemId] = review;
    localStorage.setItem(STORAGE_KEYS.myReviews, JSON.stringify(map));
  } catch {
    /* bỏ qua nếu không lưu được */
  }
}

export function getRememberedReview(orderItemId) {
  return readMap()[orderItemId] ?? null;
}

const toRequest = ({ rating, title, body, mediaKeys }) => ({
  rating,
  title: title?.trim() || null,
  body: body?.trim() || null,
  mediaKeys: mediaKeys?.length ? mediaKeys : null,
});

export async function createReview(orderItemId, data) {
  const review = await apiClient.post(`/order-items/${encodeURIComponent(orderItemId)}/review`, toRequest(data));
  remember(review);
  return review;
}

export async function updateReview(reviewId, data) {
  const review = await apiClient.put(`/reviews/${encodeURIComponent(reviewId)}`, toRequest(data));
  remember(review);
  return review;
}
