import ProductCard from '../ProductCard/ProductCard';
import Button from '../common/Button';
import Icon from '../common/Icon';
import { useLanguage } from '../../hooks/useLanguage';
import './ProductGrid.css';

/**
 * Lưới sản phẩm có đủ 4 trạng thái: đang tải / lỗi / rỗng / có dữ liệu.
 * - status: 'loading' | 'error' | 'success'
 * - errorMessage, emptyMessage: chuỗi đã dịch do trang cha truyền vào
 * - columns: số cột trên máy tính (4 hoặc 5). Màn hình nhỏ tự giảm cột.
 * - skeletonCount: số ô "đang tải" (nên bằng số sản phẩm sẽ hiện)
 * - cardBadges: nhãn hiện trên thẻ, truyền thẳng cho ProductCard (prop badges)
 */
function ProductGrid({
  products = [],
  status,
  errorMessage,
  emptyMessage,
  onRetry,
  onAddToCart,
  columns = 4,
  skeletonCount = 8,
  cardBadges,
}) {
  const { t } = useLanguage();
  const gridClass = `product-grid product-grid--cols-${columns}`;

  if (status === 'loading') {
    return (
      <div aria-busy="true">
        <p className="visually-hidden" role="status">
          {t('common.loading')}
        </p>
        <ul className={gridClass}>
          {Array.from({ length: skeletonCount }, (_, index) => (
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
    <ul className={gridClass}>
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} onAddToCart={onAddToCart} badges={cardBadges} />
        </li>
      ))}
    </ul>
  );
}

export default ProductGrid;
