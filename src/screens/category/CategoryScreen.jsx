import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Breadcrumb from '../../components/common/Breadcrumb';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import NotFoundScreen from '../notFound/NotFoundScreen';
import { useLanguage } from '../../hooks/useLanguage';
import { findCategory } from '../../constants/navigation';
import { getProductsByCategory } from '../../services/productService';
import './CategoryScreen.css';

/**
 * Trang danh mục đơn giản: /category/tops -> tất cả Áo.
 * Backend chỉ có 3 danh mục gốc (Áo / Quần / Đầm & Váy), không có danh mục con.
 * (App.jsx hiện dùng CatalogScreen cho /category/...; màn hình này giữ lại để dùng khi cần.)
 */
function CategoryScreen({ onAddToCart }) {
  const { t } = useLanguage();
  const { categoryId } = useParams();
  const found = findCategory(categoryId);
  const isValid = Boolean(found);

  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');

  const loadProducts = useCallback(async () => {
    setStatus('loading');
    try {
      setProducts(await getProductsByCategory(categoryId));
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }, [categoryId]);

  useEffect(() => {
    if (isValid) loadProducts();
  }, [isValid, loadProducts]);

  if (!found) return <NotFoundScreen />;

  const title = t(found.category.key);
  const breadcrumbItems = [
    { label: t('breadcrumb.home'), to: '/' },
    { label: t('breadcrumb.category') },
    { label: title },
  ];

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />

      <section className="category-page container" aria-labelledby="category-title">
        <header className="category-page__header">
          <h1 id="category-title" className="category-page__title">
            {title}
          </h1>
          {status === 'success' && (
            <p className="category-page__count">{t('category.count', { count: products.length })}</p>
          )}
        </header>

        <ProductGrid
          products={products}
          status={status}
          errorMessage={t('category.error')}
          emptyMessage={t('category.empty')}
          onRetry={loadProducts}
          onAddToCart={onAddToCart}
        />
      </section>
    </>
  );
}

export default CategoryScreen;
