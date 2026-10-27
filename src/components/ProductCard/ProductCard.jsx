import { useState } from 'react';
import Button from '../common/Button';
import Icon from '../common/Icon';
import { useLanguage } from '../../hooks/useLanguage';
import { formatPrice, getDiscountPercent } from '../../utils/format';
import './ProductCard.css';

/**
 * Thẻ sản phẩm, dùng ở Home, trang danh sách, sản phẩm liên quan...
 * - product: { id, name, price, originalPrice, image, isNew, inStock }
 * - onAddToCart(product): gọi khi bấm "Thêm vào giỏ"
 */
function ProductCard({ product, onAddToCart }) {
  const { t, language } = useLanguage();
  const [imageFailed, setImageFailed] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  const { name, price, originalPrice, image, isNew, inStock } = product;
  const discount = getDiscountPercent(price, originalPrice);
  const showImage = image && !imageFailed;

  return (
    <article className="product-card">
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

        {/* Huy hiệu bằng CHỮ ("Mới", "-25%"), không chỉ là chấm màu */}
        <div className="product-card__badges">
          {isNew && <span className="product-card__badge">{t('product.badgeNew')}</span>}
          {discount > 0 && (
            <span className="product-card__badge product-card__badge--sale">
              {t('product.badgeSale', { percent: discount })}
            </span>
          )}
        </div>

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
          <a href={`#product-${product.id}`} className="product-card__link">
            {name}
          </a>
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
