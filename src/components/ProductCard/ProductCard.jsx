import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../common/Button';
import Icon from '../common/Icon';
import { useLanguage } from '../../hooks/useLanguage';
import { formatPrice, getDiscountPercent } from '../../utils/format';
import './ProductCard.css';

// Các loại nhãn có thể hiện ở góc trái trên ảnh (truyền qua prop badges):
//   bestSeller "Bán chạy" / "Best seller"  (khi product.isBestSeller)
//   sale       "-25%"                      (khi có giá gốc cao hơn giá bán)
//   new        "Mới" / "New"               (khi product.isNew)
//   soldOut    "Hết hàng" / "Sold out"     (khi product.inStock = false)
// Mặc định KHÔNG hiện nhãn nào. Hiện tại chỉ mục "Gợi ý cho bạn" bật nhãn.
const DEFAULT_BADGES = [];

/**
 * Thẻ sản phẩm, dùng ở Home, trang danh mục, sản phẩm liên quan...
 * - product: { id, name, price, originalPrice, image, isNew, inStock }
 * - onAddToCart(product): gọi khi bấm "Thêm vào giỏ"
 * - badges: danh sách nhãn muốn hiện (xem DEFAULT_BADGES ở trên)
 * Bấm vào ảnh hoặc tên -> mở trang chi tiết /product/<id>
 */
function ProductCard({ product, onAddToCart, badges = DEFAULT_BADGES }) {
  const { t, language } = useLanguage();
  const [imageFailed, setImageFailed] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  const { id, name, price, originalPrice, image, isNew, isBestSeller, inStock } = product;
  const discount = getDiscountPercent(price, originalPrice);
  const showImage = image && !imageFailed;

  // Nhãn bằng CHỮ ("Mới", "-25%", "Hết hàng"), không chỉ là chấm màu
  const badgeList = [
    badges.includes('bestSeller') && isBestSeller && { key: 'bestSeller', label: t('product.badgeBestSeller'), tone: 'hot' },
    badges.includes('new') && isNew && { key: 'new', label: t('product.badgeNew') },
    badges.includes('sale') && discount > 0 && {
      key: 'sale',
      label: t('product.badgeSale', { percent: discount }),
      tone: 'sale',
    },
    badges.includes('soldOut') && !inStock && { key: 'soldOut', label: t('product.soldOut'), tone: 'muted' },
  ].filter(Boolean);

  return (
    <article className={`product-card ${inStock ? '' : 'product-card--sold-out'}`}>
      <div className="product-card__media">
        {showImage ? (
          <img
            src={image}
            alt={name}
            className="product-card__image"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="product-card__placeholder" role="img" aria-label={t('product.imageMissing')}>
            <Icon name="hanger" size={40} />
          </div>
        )}

        {badgeList.length > 0 && (
          <div className="product-card__badges">
            {badgeList.map((badge) => (
              <span
                key={badge.key}
                className={`product-card__badge ${badge.tone ? `product-card__badge--${badge.tone}` : ''}`}
              >
                {badge.label}
              </span>
            ))}
          </div>
        )}

        <button
          type="button"
          className="product-card__wish"
          aria-pressed={wishlisted}
          aria-label={
            wishlisted ? t('product.removeFromWishlist', { name }) : t('product.addToWishlist', { name })
          }
          onClick={() => setWishlisted((value) => !value)}
        >
          <Icon name="heart" size={18} filled={wishlisted} />
        </button>
      </div>

      <div className="product-card__body">
        <h3 className="product-card__name">
          {/* Link của React Router: chuyển trang không tải lại. Vùng bấm phủ cả thẻ (xem CSS ::after) */}
          <Link to={`/product/${id}`} className="product-card__link">
            {name}
          </Link>
        </h3>

        <p className="product-card__price">
          {discount > 0 ? (
            <>
              <span className="visually-hidden">{t('product.salePrice')}: </span>
              <span className="product-card__price-current">{formatPrice(price, language)}</span>
              <span className="visually-hidden">{t('product.originalPrice')}: </span>
              <s className="product-card__price-original">{formatPrice(originalPrice, language)}</s>
            </>
          ) : (
            <>
              <span className="visually-hidden">{t('product.price')}: </span>
              <span className="product-card__price-current">{formatPrice(price, language)}</span>
            </>
          )}
        </p>

        <Button
          variant={inStock ? 'secondary' : 'ghost'}
          size="sm"
          fullWidth
          disabled={!inStock}
          aria-label={inStock ? t('product.addToCartLabel', { name }) : undefined}
          onClick={() => onAddToCart?.(product)}
        >
          {inStock ? t('product.addToCart') : t('product.soldOut')}
        </Button>
      </div>
    </article>
  );
}

export default ProductCard;
