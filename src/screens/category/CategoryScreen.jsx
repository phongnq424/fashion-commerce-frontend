import { useCallback, useEffect, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import Breadcrumb from '../../components/common/Breadcrumb';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import NotFoundScreen from '../notFound/NotFoundScreen';
import { useLanguage } from '../../hooks/useLanguage';
import { findCategory } from '../../constants/navigation';
import { getProductsByCategory } from '../../services/productService';
import './CategoryScreen.css';

/**
 * Trang danh mục. Dùng chung cho 2 dạng đường dẫn:
 *   /category/tops          -> tất cả Áo
 *   /category/tops/shirts   -> chỉ Áo sơ mi
 * useParams() đọc phần :categoryId và :subId trên đường dẫn (khai báo trong App.jsx).
 */
function CategoryScreen({ onAddToCart }) {
  const { t } = useLanguage();
  const { categoryId, subId } = useParams();
  const found = findCategory(categoryId, subId);
  const isValid = Boolean(found); // dùng boolean làm dependency (object "found" tạo mới mỗi lần render)

  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');

  const loadProducts = useCallback(async () => {
    setStatus('loading');
    try {
      setProducts(await getProductsByCategory(categoryId, subId));
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }, [categoryId, subId]);

  // Tải lại mỗi khi đổi danh mục / danh mục con
  useEffect(() => {
    if (isValid) loadProducts();
  }, [isValid, loadProducts]);

  // Gõ sai đường dẫn, ví dụ /category/abc -> trang không tìm thấy
  if (!found) return <NotFoundScreen />;

  const { category, sub } = found;
  const categoryLabel = t(category.key);
  const title = sub ? t(sub.key) : categoryLabel;

  // Breadcrumb luôn 3 cấp, mục cuối là trang đang xem:
  //   /category/tops         -> Trang chủ / Danh mục / Áo
  //   /category/tops/tshirts -> Trang chủ / Danh mục / Áo thun
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

        {/* Lọc nhanh theo danh mục con */}
        <nav className="category-page__filters" aria-label={t('category.filterLabel')}>
          <NavLink
            to={category.to}
            end
            className={({ isActive }) => `category-chip ${isActive ? 'is-active' : ''}`}
          >
            {t('category.all')}
          </NavLink>
          {category.children.map((child) => (
            <NavLink
              key={child.id}
              to={child.to}
              className={({ isActive }) => `category-chip ${isActive ? 'is-active' : ''}`}
            >
              {t(child.key)}
            </NavLink>
          ))}
        </nav>

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
