import { useEffect, useState } from 'react';
import ProductCarousel from '../../../components/ProductCarousel/ProductCarousel';
import { useLanguage } from '../../../hooks/useLanguage';
import { getRelatedProducts } from '../../../services/productService';

/**
 * "Có thể bạn sẽ thích": 1 hàng sản phẩm trượt ‹ ›, ưu tiên cùng danh mục.
 * Tiêu đề căn giữa, 2 bên có đường kẻ.
 */
function RelatedProducts({ product, onAddToCart }) {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let cancelled = false; // đổi sang sản phẩm khác trước khi tải xong -> bỏ kết quả cũ
    getRelatedProducts(product).then((data) => {
      if (!cancelled) setProducts(data);
    });
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
