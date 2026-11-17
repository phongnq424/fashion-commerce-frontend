import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { useLanguage } from '../../hooks/useLanguage';
import './ShopCard.css';

/**
 * Thẻ thông tin shop ở đầu trang gian hàng (/shop/:shopId):
 *   [chữ cái đầu] Tên shop · N sản phẩm      [Xem shop]
 * - shop: { id, name, productCount } (services/publicShopService.js)
 * - showLink: false -> ẩn nút "Xem shop" (dùng ở chính trang shop)
 * Logo / mô tả / đánh giá shop chưa có vì Backend chưa có API shop công khai.
 */
function ShopCard({ shop, showLink = true, as: Tag = 'section' }) {
  const { t } = useLanguage();
  if (!shop) return null;
  const initial = (shop.name || '?').trim().charAt(0).toUpperCase();

  return (
    <Tag className="shop-strip" aria-label={t('market.shop.cardLabel')}>
      <span className="shop-strip__avatar" aria-hidden="true">
        {initial}
      </span>
      <div className="shop-strip__meta">
        <p className="shop-strip__name">{shop.name}</p>
        <p className="shop-strip__sub">
          <Icon name="bag" size={14} />
          {t('market.shop.productCount', { count: shop.productCount ?? 0 })}
        </p>
      </div>
      {showLink && (
        <Link to={`/shop/${shop.id}`} className="shop-strip__btn">
          <Icon name="store" size={16} />
          {t('market.shop.view')}
        </Link>
      )}
    </Tag>
  );
}

export default ShopCard;
