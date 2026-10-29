import { useCallback, useEffect, useState } from 'react';
import ProductGrid from '../../../components/ProductGrid/ProductGrid';
import SectionHeading from '../../../components/common/SectionHeading';
import { useLanguage } from '../../../hooks/useLanguage';
import { getNewArrivals } from '../../../services/productService';

// 1 hàng x 5 cột = 5 sản phẩm (muốn 2 hàng thì đổi ROWS = 2)
const COLUMNS = 5;
const ROWS = 1;

function NewArrivalsSection({ onAddToCart }) {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'error' | 'success'

  const loadProducts = useCallback(async () => {
    setStatus('loading');
    try {
      setProducts(await getNewArrivals(COLUMNS * ROWS));
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }, []);

  // Tải sản phẩm 1 lần khi section xuất hiện
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return (
    <section id="new-arrivals" className="home-section container" aria-labelledby="new-arrivals-title">
      {/* align="split": tiêu đề bên trái, "Xem tất cả →" bên phải */}
      <SectionHeading
        id="new-arrivals-title"
        align="split"
        title={t('home.newArrivals.title')}
        actionLabel={t('common.viewAll')}
        actionHref="/collections/new-arrivals"
      />
      <ProductGrid
        products={products}
        status={status}
        columns={COLUMNS}
        skeletonCount={COLUMNS * ROWS}
        errorMessage={t('home.newArrivals.error')}
        emptyMessage={t('home.newArrivals.empty')}
        onRetry={loadProducts}
        onAddToCart={onAddToCart}
      />
    </section>
  );
}

export default NewArrivalsSection;
