import ProductCard from '../ProductCard/ProductCard';
import Button from '../common/Button';
import Icon from '../common/Icon';
import { useLanguage } from '../../hooks/useLanguage';
import './ProductGrid.css';

const SKELETON_COUNT = 8;

/**
 * Lưới sản phẩm có đủ 4 trạng thái: đang tải / lỗi / rỗng / có dữ liệu.
 * - status: 'loading' | 'error' | 'success'
 * - errorMessage, emptyMessage: chuỗi đã dịch do trang cha truyền vào
 */
function ProductGrid({ products = [], status, errorMessage, emptyMessage, onRetry, onAddToCart }) {
  const { t } = useLanguage();

  if (status === 'loading') {
    return (
      <div aria-busy="true">
        <p className="visually-hidden" role="status">
          {t('common.loading')}
        </p>
        <ul className="product-grid">
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <li key={index} className="product-skeleton" aria-hidden="true">
              <div className="product-skeleton__media" />
              <div className="product-skeleton__line" />
              <div className="product-skeleton__line product-skeleton__line--short" />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="product-grid__state product-grid__state--error" role="alert">
        <Icon name="alert" size={28} />
        <p>{errorMessage}</p>
        <Button variant="secondary" onClick={onRetry}>
          <Icon name="refresh" size={18} />
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="product-grid__state">
        <Icon name="hanger" size={28} />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="product-grid">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} onAddToCart={onAddToCart} />
        </li>
      ))}
    </ul>
  );
}

export default ProductGrid;
