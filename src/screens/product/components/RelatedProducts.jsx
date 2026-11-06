import { useEffect, useState } from 'react';
import ProductCarousel from '../../../components/ProductCarousel/ProductCarousel';
import { useLanguage } from '../../../hooks/useLanguage';
import { getNewArrivals, getRecommendations, getRelatedProducts } from '../../../services/productService';

const LIMIT = 10;

// Gộp nhiều nguồn, bỏ trùng và bỏ chính sản phẩm đang xem
function mergeUnique(currentId, ...lists) {
  const seen = new Set([currentId]);
  const result = [];
  lists.flat().forEach((item) => {
    if (item && !seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  });
  return result;
}

// Một nguồn lỗi (vd Backend tắt) thì coi như rỗng, không làm hỏng cả mục
const safe = (promise) => promise.catch((error) => {
  console.warn('[RelatedProducts]', error);
  return [];
});

/**
 * "Có thể bạn sẽ thích": nằm DƯỚI phần đánh giá, 1 hàng sản phẩm trượt ‹ ›.
 * Thứ tự ưu tiên lấy sản phẩm:
 *   1. Cùng danh mục (Backend: GET /products?categoryId=...)
 *   2. Thiếu -> bù bằng hàng mới về (GET /products?sort=NEWEST)
 *   3. Vẫn trống (Backend chưa có dữ liệu / lỗi) -> dùng gợi ý mock
 */
function RelatedProducts({ product, onAddToCart }) {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let cancelled = false; // đổi sang sản phẩm khác trước khi tải xong -> bỏ kết quả cũ

    (async () => {
      let list = mergeUnique(product.id, await safe(getRelatedProducts(product, LIMIT)));
      if (list.length < LIMIT && product.source === 'api') {
        list = mergeUnique(product.id, list, await safe(getNewArrivals(LIMIT + 1)));
      }
      if (list.length === 0) {
        list = mergeUnique(product.id, await safe(getRecommendations(LIMIT)));
      }
      if (!cancelled) setProducts(list.slice(0, LIMIT));
    })();

    return () => {
      cancelled = true;
    };
  }, [product]);

  if (products.length === 0) return null;

  return (
    <section className="related" aria-labelledby="related-title">
      <h2 id="related-title" className="related__title">
        <span>{t('productDetail.related')}</span>
      </h2>
      <ProductCarousel products={products} onAddToCart={onAddToCart} />
    </section>
  );
}

export default RelatedProducts;
