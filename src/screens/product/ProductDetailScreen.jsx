import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Breadcrumb from '../../components/common/Breadcrumb';
import Button from '../../components/common/Button';
import Icon from '../../components/common/Icon';
import NotFoundScreen from '../notFound/NotFoundScreen';
import ProductDetail from './components/ProductDetail';
import { useLanguage } from '../../hooks/useLanguage';
import { findCategory } from '../../constants/navigation';
import { getProductById } from '../../services/productService';
import './ProductDetailScreen.css';

/**
 * Trang chi tiết sản phẩm: /product/:productId (khai báo trong App.jsx).
 * Màn hình này lo phần TẢI DỮ LIỆU (đang tải / lỗi / không tìm thấy),
 * còn phần hiển thị + chọn size, số lượng nằm ở ./components/ProductDetail.jsx
 */
function ProductDetailScreen({ onAddToCart }) {
  const { t } = useLanguage();
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'error' | 'notFound' | 'success'

  const loadProduct = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await getProductById(productId);
      setProduct(data);
      setStatus(data ? 'success' : 'notFound');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }, [productId]);

  // Tải lại mỗi khi đổi sang sản phẩm khác
  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  if (status === 'notFound') return <NotFoundScreen />;

  // Breadcrumb: Trang chủ / Áo / Áo sơ mi / Tên sản phẩm
  const found = product ? findCategory(product.category, product.subcategory) : null;
  const breadcrumbItems = [
    { label: t('breadcrumb.home'), to: '/' },
    ...(found ? [{ label: t(found.category.key), to: found.category.to }] : []),
    ...(found?.sub ? [{ label: t(found.sub.key), to: found.sub.to }] : []),
    { label: status === 'success' ? product.name : t('common.loading') },
  ];

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />

      <div className="product-page container">
        {status === 'loading' && (
          <div className="product-page__skeleton" aria-busy="true">
            <p className="visually-hidden" role="status">
              {t('common.loading')}
            </p>
            <div className="product-page__skeleton-media" />
            <div className="product-page__skeleton-info">
              <div className="product-page__skeleton-line product-page__skeleton-line--title" />
              <div className="product-page__skeleton-line" />
              <div className="product-page__skeleton-line product-page__skeleton-line--short" />
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="product-page__error" role="alert">
            <Icon name="alert" size={28} />
            <p>{t('productDetail.error')}</p>
            <Button variant="secondary" onClick={loadProduct}>
              <Icon name="refresh" size={18} />
              {t('common.retry')}
            </Button>
          </div>
        )}

        {/* key = id sản phẩm: sang sản phẩm khác thì size / số lượng đã chọn tự reset */}
        {status === 'success' && <ProductDetail key={product.id} product={product} onAddToCart={onAddToCart} />}
      </div>
    </>
  );
}

export default ProductDetailScreen;
