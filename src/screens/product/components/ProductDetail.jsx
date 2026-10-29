import { useState } from 'react';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';
import { formatPrice, getDiscountPercent } from '../../../utils/format';

const MAX_QUANTITY = 10;

/**
 * Nội dung trang chi tiết: ảnh bên trái, thông tin + chọn size/số lượng bên phải.
 * - product: 1 sản phẩm lấy từ productService.getProductById()
 * - onAddToCart(product, { size, quantity })
 */
function ProductDetail({ product, onAddToCart }) {
  const { t, language } = useLanguage();
  const { name, price, originalPrice, image, inStock, soldCount, sizes = [], material, description } = product;
  const discount = getDiscountPercent(price, originalPrice);

  // Chỉ có 1 size (vd "Free size") thì chọn sẵn luôn
  const [size, setSize] = useState(sizes.length === 1 ? sizes[0] : '');
  const [quantity, setQuantity] = useState(1);
  const [showSizeError, setShowSizeError] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const handleSelectSize = (value) => {
    setSize(value);
    setShowSizeError(false);
  };

  const handleAddToCart = () => {
    if (!size) {
      setShowSizeError(true); // chưa chọn size -> báo lỗi bằng chữ, không thêm vào giỏ
      return;
    }
    onAddToCart?.(product, { size, quantity });
  };

  return (
    <article className="product-detail">
      {/* ---------- Ảnh ---------- */}
      <div className="product-detail__media">
        {image && !imageFailed ? (
          <img src={image} alt={name} className="product-detail__image" onError={() => setImageFailed(true)} />
        ) : (
          <div className="product-detail__placeholder" role="img" aria-label={t('product.imageMissing')}>
            <Icon name="hanger" size={64} />
          </div>
        )}
        {discount > 0 && (
          <span className="product-detail__badge">{t('product.badgeSale', { percent: discount })}</span>
        )}
      </div>

      {/* ---------- Thông tin ---------- */}
      <div className="product-detail__info">
        <h1 className="product-detail__name">{name}</h1>

        <div className="product-detail__meta">
          {/* Trạng thái kho: có icon + chữ, không chỉ dựa vào màu */}
          <span className={`product-detail__stock ${inStock ? 'is-in-stock' : 'is-sold-out'}`}>
            <Icon name={inStock ? 'check' : 'alert'} size={16} />
            {inStock ? t('productDetail.inStock') : t('productDetail.outOfStock')}
          </span>
          {soldCount > 0 && <span>{t('productDetail.soldCount', { count: soldCount })}</span>}
        </div>

        <p className="product-detail__price">
          {discount > 0 ? (
            <>
              <span className="visually-hidden">{t('product.salePrice')}: </span>
              <span className="product-detail__price-current">{formatPrice(price, language)}</span>
              <span className="visually-hidden">{t('product.originalPrice')}: </span>
              <s className="product-detail__price-original">{formatPrice(originalPrice, language)}</s>
              <span className="product-detail__save">{t('productDetail.save', { percent: discount })}</span>
            </>
          ) : (
            <>
              <span className="visually-hidden">{t('product.price')}: </span>
              <span className="product-detail__price-current">{formatPrice(price, language)}</span>
            </>
          )}
        </p>

        {/* Chọn size: dùng radio thật (bàn phím dùng phím mũi tên được), chỉ trang trí lại bằng CSS */}
        <fieldset className="product-detail__field" aria-describedby={showSizeError ? 'size-error' : undefined}>
          <legend className="product-detail__label">
            {t('productDetail.size')}
            {size && <span className="product-detail__label-value">{size}</span>}
          </legend>
          <div className="size-options">
            {sizes.map((value) => (
              <label key={value} className="size-option">
                <input
                  type="radio"
                  name="size"
                  value={value}
                  checked={size === value}
                  onChange={() => handleSelectSize(value)}
                  disabled={!inStock}
                  className="size-option__input"
                />
                <span className="size-option__box">{value}</span>
              </label>
            ))}
          </div>
          {showSizeError && (
            <p id="size-error" className="product-detail__error" role="alert">
              <Icon name="alert" size={16} />
              {t('productDetail.sizeRequired')}
            </p>
          )}
        </fieldset>

        {/* Số lượng: nút − / + và số ở giữa */}
        <div className="product-detail__field">
          <span className="product-detail__label" id="quantity-label">
            {t('productDetail.quantity')}
          </span>
          <div className="quantity" role="group" aria-labelledby="quantity-label">
            <button
              type="button"
              className="quantity__btn"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={!inStock || quantity <= 1}
              aria-label={t('productDetail.decrease')}
            >
              −
            </button>
            <output className="quantity__value" aria-live="polite">
              {quantity}
            </output>
            <button
              type="button"
              className="quantity__btn"
              onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
              disabled={!inStock || quantity >= MAX_QUANTITY}
              aria-label={t('productDetail.increase')}
            >
              +
            </button>
          </div>
        </div>

        <div className="product-detail__actions">
          <Button size="md" fullWidth disabled={!inStock} onClick={handleAddToCart}>
            <Icon name="bag" size={18} />
            {inStock ? t('product.addToCart') : t('product.soldOut')}
          </Button>
          <button
            type="button"
            className="product-detail__wish"
            aria-pressed={wishlisted}
            aria-label={
              wishlisted ? t('product.removeFromWishlist', { name }) : t('product.addToWishlist', { name })
            }
            onClick={() => setWishlisted((value) => !value)}
          >
            <Icon name="heart" size={20} filled={wishlisted} />
          </button>
        </div>

        <ul className="product-detail__perks">
          <li>
            <Icon name="truck" size={18} />
            {t('productDetail.perkShipping')}
          </li>
          <li>
            <Icon name="refresh" size={18} />
            {t('productDetail.perkReturns')}
          </li>
          <li>
            <Icon name="shield" size={18} />
            {t('productDetail.perkPayment')}
          </li>
        </ul>

        {(description || material) && (
          <section className="product-detail__section" aria-labelledby="product-description-title">
            <h2 id="product-description-title" className="product-detail__section-title">
              {t('productDetail.description')}
            </h2>
            {description && <p>{description}</p>}
            {material && (
              <p>
                <strong>{t('productDetail.material')}:</strong> {material}
              </p>
            )}
          </section>
        )}
      </div>
    </article>
  );
}

export default ProductDetail;
