import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import ProductGrid from '../../../components/ProductGrid/ProductGrid';
import { useLanguage } from '../../../hooks/useLanguage';
import { useWishlist } from '../../../hooks/useWishlist';
import AccountLayout from '../components/AccountLayout';

/**
 * /account/wishlist — Sản phẩm yêu thích (GET /wishlist, giá / tồn kho mới nhất do Backend trả).
 * Lưới thẻ sản phẩm như trang danh mục. Bấm ♥ trên thẻ để bỏ thích -> thẻ biến mất ngay.
 * - onAddToCart: giống trang danh mục (sản phẩm nhiều size/màu -> mở trang chi tiết)
 */
function WishlistScreen({ onAddToCart }) {
  const { t } = useLanguage();
  const { items: products } = useWishlist();

  return (
    <AccountLayout
      title={t('wishlist.title')}
      subtitle={products.length ? t('wishlist.count', { count: products.length }) : t('wishlist.subtitle')}
      breadcrumb={[{ label: t('wishlist.title') }]}
    >
      {products.length === 0 ? (
        <div className="account-card">
          <EmptyState
            icon="heart"
            title={t('wishlist.emptyTitle')}
            text={t('wishlist.emptyText')}
            action={<Button as={Link} to="/products">{t('orders.shopNow')}</Button>}
          />
        </div>
      ) : (
        <ProductGrid
          products={products}
          status="success"
          columns={4}
          emptyMessage={t('wishlist.emptyTitle')}
          onAddToCart={onAddToCart}
          cardBadges={['sale', 'soldOut']}
        />
      )}
    </AccountLayout>
  );
}

export default WishlistScreen;
