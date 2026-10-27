import { useCallback, useEffect, useState } from 'react';
import ProductGrid from '../../../components/ProductGrid/ProductGrid';
import SectionHeading from '../../../components/common/SectionHeading';
import { useLanguage } from '../../../hooks/useLanguage';
import { getNewArrivals } from '../../../services/productService';

function NewArrivalsSection({ onAddToCart }) {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'error' | 'success'

  const loadProducts = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await getNewArrivals();
      setProducts(data);
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
      <SectionHeading
        id="new-arrivals-title"
        title={t('home.newArrivals.title')}
        description={t('home.newArrivals.description')}
        actionLabel={t('common.viewAll')}
        actionHref="#products"
      />
      <ProductGrid
        products={products}
        status={status}
        errorMessage={t('home.newArrivals.error')}
        emptyMessage={t('home.newArrivals.empty')}
        onRetry={loadProducts}
        onAddToCart={onAddToCart}
      />
    </section>
  );
}

export default NewArrivalsSection;
