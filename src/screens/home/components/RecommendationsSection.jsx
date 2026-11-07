import { useCallback, useEffect, useState } from 'react';
import ProductCarousel from '../../../components/ProductCarousel/ProductCarousel';
import ProductGrid from '../../../components/ProductGrid/ProductGrid';
import SectionHeading from '../../../components/common/SectionHeading';
import { useLanguage } from '../../../hooks/useLanguage';
import { getRecommendations } from '../../../services/productService';

const VISIBLE = 5; // số thẻ thấy cùng lúc trên máy tính
const TOTAL = 10; // tổng số sản phẩm trong băng chuyền

// Nhãn trên ảnh ("Mới", "-25%") dùng quy tắc chung trong ProductCard.jsx -> giống mọi nơi khác

function RecommendationsSection({ onAddToCart }) {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'error' | 'success'

  const loadProducts = useCallback(async () => {
    setStatus('loading');
    try {
      setProducts(await getRecommendations(TOTAL));
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const hasProducts = status === 'success' && products.length > 0;

  return (
    <section id="recommendations" className="home-section container" aria-labelledby="recommendations-title">
      {/* Tiêu đề bên trái, "Xem thêm sản phẩm →" bên phải cùng hàng -> trang Danh mục sản phẩm */}
      <SectionHeading
        id="recommendations-title"
        align="split"
        title={t('home.recommendations.title')}
        actionLabel={t('common.seeMoreProducts')}
        actionHref="/products"
      />

      {hasProducts ? (
        // 1 hàng, bấm ‹ › để trượt từ phải qua trái (điện thoại thì vuốt)
        <ProductCarousel products={products} onAddToCart={onAddToCart} />
      ) : (
        // Đang tải / lỗi / rỗng: dùng lại ProductGrid (đã có sẵn 3 trạng thái này)
        <ProductGrid
          products={products}
          status={status}
          columns={VISIBLE}
          skeletonCount={VISIBLE}
          errorMessage={t('home.recommendations.error')}
          emptyMessage={t('home.recommendations.empty')}
          onRetry={loadProducts}
        />
      )}
    </section>
  );
}

export default RecommendationsSection;
