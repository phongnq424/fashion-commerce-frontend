import { useCallback, useEffect, useState } from 'react';
import ProductGrid from '../../../components/ProductGrid/ProductGrid';
import SectionHeading from '../../../components/common/SectionHeading';
import { useLanguage } from '../../../hooks/useLanguage';
import { getBestSellers } from '../../../services/productService';

// 2 hàng x 5 cột = 10 sản phẩm bán chạy nhất. Không gắn nhãn trên ảnh.
const COLUMNS = 5;
const ROWS = 2;

function BestSellersSection({ onAddToCart }) {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'error' | 'success'

  const loadProducts = useCallback(async () => {
    setStatus('loading');
    try {
      setProducts(await getBestSellers(COLUMNS * ROWS));
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return (
    <section id="best-sellers" className="home-section container" aria-labelledby="best-sellers-title">
      <SectionHeading
        id="best-sellers-title"
        align="split"
        title={t('home.bestSellers.title')}
        actionLabel={t('common.viewAll')}
        actionHref="/collections/best-sellers"
      />
      <ProductGrid
        products={products}
        status={status}
        columns={COLUMNS}
        skeletonCount={COLUMNS * ROWS}
        errorMessage={t('home.bestSellers.error')}
        emptyMessage={t('home.bestSellers.empty')}
        onRetry={loadProducts}
        onAddToCart={onAddToCart}
      />
    </section>
  );
}

export default BestSellersSection;
