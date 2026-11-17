import { useCallback, useEffect, useState } from 'react';
import ProductGrid from '../../../components/ProductGrid/ProductGrid';
import SectionHeading from '../../../components/common/SectionHeading';
import { useLanguage } from '../../../hooks/useLanguage';
import { getSaleProducts } from '../../../services/productService';

// "Đang giảm giá": sản phẩm của mọi shop có giá gốc (compareAtPriceMinor) cao hơn giá bán, giảm nhiều trước.
// 2 hàng x 5 cột. Trước đây là "Bán chạy" nhưng Backend chưa trả số lượng đã bán nên đổi sang mục này.
const COLUMNS = 5;
const ROWS = 2;

function SaleSection({ onAddToCart }) {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'error' | 'success'

  const loadProducts = useCallback(async () => {
    setStatus('loading');
    try {
      setProducts(await getSaleProducts(COLUMNS * ROWS));
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
    <section id="sale" className="home-section container" aria-labelledby="sale-title">
      <SectionHeading
        id="sale-title"
        align="split"
        title={t('market.home.sale.title')}
        actionLabel={t('common.seeMoreProducts')}
        actionHref="/collections/sale"
      />
      <ProductGrid
        products={products}
        status={status}
        columns={COLUMNS}
        skeletonCount={COLUMNS * ROWS}
        errorMessage={t('market.home.sale.error')}
        emptyMessage={t('market.home.sale.empty')}
        onRetry={loadProducts}
        onAddToCart={onAddToCart}
      />
    </section>
  );
}

export default SaleSection;
