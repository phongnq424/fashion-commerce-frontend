import { REVIEW_POOL } from '../data/mockReviews';

// =====================================================================
// ĐÁNH GIÁ SẢN PHẨM (hiện là dữ liệu GIẢ)
// Khi có Backend:
//   getReviews  -> GET  `${API}/products/${productId}/reviews?rating=5&page=1`
//                  trả về { average, total, breakdown: { 5: n, 4: n, ... }, items, hasMore }
//   addReview   -> POST `${API}/products/${productId}/reviews` với { rating, comment, size, color }
//                  Backend phải kiểm tra: đã đăng nhập + ĐÃ MUA sản phẩm này mới được đánh giá.
// =====================================================================
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const PAGE_SIZE = 5;

// Đánh giá khách vừa gửi trong lần mở trang này (giả lập Backend lưu lại)
const addedReviews = {};

// Chia tổng số đánh giá thành số lượng 5★ 4★ ... 1★ cho khớp với điểm trung bình
function buildBreakdown(average, total) {
  const ratio5 = Math.min(0.95, Math.max(0.3, (average - 3) / 2));
  const rest = 1 - ratio5;
  const parts = { 5: ratio5, 4: rest * 0.6, 3: rest * 0.25, 2: rest * 0.1, 1: rest * 0.05 };
  const breakdown = {};
  let used = 0;
  [4, 3, 2, 1].forEach((star) => {
    breakdown[star] = Math.round(total * parts[star]);
    used += breakdown[star];
  });
  breakdown[5] = Math.max(0, total - used);
  return breakdown;
}

// Mỗi sản phẩm lấy 1 đoạn khác nhau trong REVIEW_POOL -> nhìn "thật" hơn
function sampleReviews(product) {
  const seed = [...product.id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const sizes = product.sizes?.length ? product.sizes : ['Freesize'];
  const colors = product.colors?.length ? product.colors.map((c) => c.name) : [null];
  return REVIEW_POOL.map((_, index) => {
    const base = REVIEW_POOL[(seed + index) % REVIEW_POOL.length];
    const day = new Date(2026, 9, 28 - index * 3);
    return {
      id: `${product.id}-r${index}`,
      name: base.name,
      rating: base.rating,
      comment: base.comment,
      date: day.toISOString(),
      size: sizes[(seed + index) % sizes.length],
      color: colors[(seed + index) % colors.length],
    };
  });
}

export async function getReviews(product, { rating = 0, page = 1 } = {}) {
  await wait(400);
  const all = [...(addedReviews[product.id] ?? []), ...sampleReviews(product)];
  const filtered = rating ? all.filter((review) => review.rating === rating) : all;
  const total = (product.reviewCount ?? all.length) + (addedReviews[product.id]?.length ?? 0);
  const average = product.rating ?? all.reduce((sum, r) => sum + r.rating, 0) / all.length;
  return {
    average,
    total,
    breakdown: buildBreakdown(average, total),
    items: filtered.slice(0, page * PAGE_SIZE),
    hasMore: filtered.length > page * PAGE_SIZE,
  };
}

export async function addReview(product, { name, rating, comment, size, color }) {
  await wait(600);
  const review = {
    id: `${product.id}-new-${Date.now()}`,
    name,
    rating,
    comment,
    size,
    color,
    date: new Date().toISOString(),
  };
  addedReviews[product.id] = [review, ...(addedReviews[product.id] ?? [])];
  return review;
}
