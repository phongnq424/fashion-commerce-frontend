import { useState } from 'react';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import StarRating from '../../../components/common/StarRating';
import ProductGallery from './ProductGallery';
import SizeGuideDialog from './SizeGuideDialog';
import GiftOffer from './GiftOffer';
import ProductInfoTabs from './ProductInfoTabs';
import { useLanguage } from '../../../hooks/useLanguage';
import { formatCompact, formatPrice, getDiscountPercent } from '../../../utils/format';

const MAX_QUANTITY = 10;

/**
 * Nội dung chính trang chi tiết: ảnh (trái) | thông tin + chọn mua (phải).
 * - product: dữ liệu từ productService.getProductById(). Các trường MỚI đều tuỳ chọn,
 *   thiếu trường nào thì phần đó tự ẩn: rating, reviewCount, images, colors, gift, care
 * - onAddToCart(product, { size, color, quantity, gift, buyNow })
 */
function ProductDetail({ product, onAddToCart }) {
  const { t, language } = useLanguage();
  const {
    name,
    price,
    originalPrice,
    image,
    images = [],
    inStock,
    soldCount = 0,
    rating,
    reviewCount = 0,
    sizes = [],
    colors = [],
    gift,
  } = product;
  const discount = getDiscountPercent(price, originalPrice);
  const gallery = images.length ? images : [image].filter(Boolean);

  // Chỉ có 1 lựa chọn (vd "Freesize", 1 màu) thì chọn sẵn
  const [size, setSize] = useState(sizes.length === 1 ? sizes[0] : '');
  const [colorId, setColorId] = useState(colors.length === 1 ? colors[0].id : '');
  const [quantity, setQuantity] = useState(1);
  const [errors, setErrors] = useState({ size: false, color: false });
  const [wishlisted, setWishlisted] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [giftChoice, setGiftChoice] = useState({ selected: true, option: gift?.options?.[0] ?? '' });

  const color = colors.find((item) => item.id === colorId);

  const selectColor = (item) => {
    setColorId(item.id);
    setErrors((prev) => ({ ...prev, color: false }));
    // Màu có ảnh riêng -> ảnh lớn đổi sang ảnh của màu đó
    const index = gallery.indexOf(item.image);
    if (index >= 0) setActiveImage(index);
  };

  const selectSize = (value) => {
    setSize(value);
    setErrors((prev) => ({ ...prev, size: false }));
  };

  // Kiểm tra đã chọn đủ màu + size chưa. Thiếu -> báo lỗi bằng chữ, không thêm vào giỏ
  const submit = (buyNow) => {
    const nextErrors = { size: sizes.length > 0 && !size, color: colors.length > 0 && !colorId };
    setErrors(nextErrors);
    if (nextErrors.size || nextErrors.color) return;
    onAddToCart?.(product, {
      size,
      color: color?.name,
      quantity,
      gift: gift && giftChoice.selected ? { name: gift.name, option: giftChoice.option } : null,
      buyNow,
    });
  };

  return (
    <article className="product-detail">
      {/* ---------- Cột trái: ảnh ---------- */}
      <div className="product-detail__media">
        <ProductGallery
          images={gallery}
          name={name}
          activeIndex={Math.min(activeImage, Math.max(gallery.length - 1, 0))}
          onChange={setActiveImage}
          badge={discount > 0 ? t('product.badgeSale', { percent: discount }) : null}
        />
      </div>

      {/* ---------- Cột phải: thông tin ---------- */}
      <div className="product-detail__info">
        <h1 className="product-detail__name">{name}</h1>

        {/* Hàng đánh giá kiểu Shopee: 5.0 ★★★★★ | 509 Đánh giá | Đã bán 2k+ */}
        <div className="rating-bar">
          {rating > 0 && (
            <a href="#reviews" className="rating-bar__item">
              <span className="rating-bar__number">{rating.toFixed(1)}</span>
              <StarRating value={rating} size={15} />
            </a>
          )}
          {reviewCount > 0 && (
            <a href="#reviews" className="rating-bar__item">
              <span className="rating-bar__number">{formatCompact(reviewCount, language)}</span>
              <span className="rating-bar__label">{t('productDetail.reviewsLabel')}</span>
            </a>
          )}
          <span className="rating-bar__item">
            <span className="rating-bar__label">{t('productDetail.soldLabel')}</span>
            <span className="rating-bar__strong">{formatCompact(soldCount, language)}</span>
          </span>
          {!inStock && (
            <span className="rating-bar__item rating-bar__soldout">
              <Icon name="alert" size={14} />
              {t('productDetail.outOfStock')}
            </span>
          )}
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

        {/* ----- Màu sắc: chấm màu + tên màu (không chỉ dựa vào màu) ----- */}
        {colors.length > 0 && (
          <fieldset className="option-group" aria-describedby={errors.color ? 'color-error' : undefined}>
            <legend className="option-group__label">
              {t('productDetail.color')}
              {color && <span className="option-group__value">{color.name}</span>}
            </legend>
            <div className="option-group__choices">
              {colors.map((item) => (
                <label key={item.id} className="choice">
                  <input
                    type="radio"
                    name="color"
                    className="choice__input"
                    checked={colorId === item.id}
                    onChange={() => selectColor(item)}
                    disabled={!inStock}
                  />
                  <span className="choice__box choice__box--color">
                    <span className="choice__swatch" style={{ background: item.hex }} aria-hidden="true" />
                    {item.name}
                  </span>
                </label>
              ))}
            </div>
            {errors.color && (
              <p id="color-error" className="product-detail__error" role="alert">
                <Icon name="alert" size={16} />
                {t('productDetail.colorRequired')}
              </p>
            )}
          </fieldset>
        )}

        {/* ----- Kích cỡ + "Hướng dẫn chọn size" căn phải ----- */}
        {sizes.length > 0 && (
          <fieldset
            className="option-group option-group--with-guide"
            aria-describedby={errors.size ? 'size-error' : undefined}
          >
            {/* legend phải là con đầu tiên của fieldset; nút hướng dẫn được CSS đẩy lên góc phải */}
            <legend className="option-group__label">
              {t('productDetail.size')}
              {size && <span className="option-group__value">{size}</span>}
            </legend>
            <button type="button" className="option-group__guide" onClick={() => setSizeGuideOpen(true)}>
              <Icon name="ruler" size={16} />
              {t('productDetail.sizeGuide')}
            </button>
            <div className="option-group__choices">
              {sizes.map((value) => (
                <label key={value} className="choice">
                  <input
                    type="radio"
                    name="size"
                    className="choice__input"
                    checked={size === value}
                    onChange={() => selectSize(value)}
                    disabled={!inStock}
                  />
                  <span className="choice__box">{value}</span>
                </label>
              ))}
            </div>
            {errors.size && (
              <p id="size-error" className="product-detail__error" role="alert">
                <Icon name="alert" size={16} />
                {t('productDetail.sizeRequired')}
              </p>
            )}
          </fieldset>
        )}

        {/* ----- Số lượng ----- */}
        <div className="option-group">
          <span className="option-group__label" id="quantity-label">
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

        {/* ----- Quà tặng kèm đơn (chỉ khi sản phẩm có gift) ----- */}
        {gift && inStock && <GiftOffer gift={gift} value={giftChoice} onChange={setGiftChoice} />}

        {/* ----- Thêm vào giỏ | Mua ngay | Yêu thích ----- */}
        <div className="product-detail__actions">
          <Button variant="outline" size="md" disabled={!inStock} onClick={() => submit(false)}>
            <Icon name="bag" size={18} />
            {inStock ? t('product.addToCart') : t('product.soldOut')}
          </Button>
          <Button size="md" disabled={!inStock} onClick={() => submit(true)}>
            {t('productDetail.buyNow')}
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

        <hr className="product-detail__divider" />

        {/* ----- Mô tả + chính sách (xổ xuống) ----- */}
        <ProductInfoTabs product={product} />
      </div>

      <SizeGuideDialog open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />
    </article>
  );
}

export default ProductDetail;
