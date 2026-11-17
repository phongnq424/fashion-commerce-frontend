import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/common/Icon';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../hooks/useLanguage';
import { useShopChat } from '../../../hooks/useShopChat';
import { getPublicShopStats } from '../../../services/publicShopService';
import { formatCompact } from '../../../utils/format';
import './ProductShopInfo.css';

/**
 * Khối "Thông tin shop" ở trang chi tiết sản phẩm, nằm TRƯỚC mục "Đánh giá sản phẩm":
 *   [chữ cái]  Tên shop            |  Đánh giá    308,4k   |  Sản phẩm        105
 *              [Chat] [Xem shop]   |  Điểm TB     4.8 ★    |  Đang giảm giá   12
 * Chỉ hiện số liệu Backend có thể cung cấp (xem getPublicShopStats trong services/publicShopService.js).
 * Nút "Chat": mở khung chat với shop này, kèm sản phẩm đang xem (chưa đăng nhập -> mở popup đăng nhập).
 * Chưa có: logo shop, ngày tham gia, tỉ lệ / thời gian phản hồi, người theo dõi -> cần BE bổ sung API.
 * - shop: { id, name, productCount } lấy kèm khi tải sản phẩm (productService.getProductById)
 */
function ProductShopInfo({ shop, product }) {
  const { t, language } = useLanguage();
  const { user, openAuth } = useAuth();
  const { openChat } = useShopChat();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!shop?.id) return undefined;
    let active = true;
    getPublicShopStats(shop.id)
      .then((value) => active && setStats(value))
      .catch((error) => console.warn('[ShopInfo] Không tải được số liệu shop', error));
    return () => {
      active = false;
    };
  }, [shop?.id]);

  if (!shop) return null;
  const initial = (shop.name || '?').trim().charAt(0).toUpperCase();
  const value = (number) => (stats ? formatCompact(number, language) : '–');

  const items = [
    { id: 'reviews', label: t('market.shopInfo.reviews'), value: value(stats?.reviewCount ?? 0) },
    { id: 'products', label: t('market.shopInfo.products'), value: value(stats?.productCount ?? shop.productCount ?? 0) },
    {
      id: 'rating',
      label: t('market.shopInfo.rating'),
      value: stats ? (stats.reviewCount ? `${stats.averageRating.toFixed(1)} ★` : t('market.shopInfo.noRating')) : '–',
    },
    { id: 'sale', label: t('market.shopInfo.onSale'), value: value(stats?.saleCount ?? 0) },
  ];

  return (
    <section className="pd-shop" aria-label={t('market.shop.cardLabel')}>
      <div className="pd-shop__profile">
        <Link to={`/shop/${shop.id}`} className="pd-shop__avatar" aria-hidden="true" tabIndex={-1}>
          {initial}
        </Link>
        <div className="pd-shop__identity">
          <p className="pd-shop__name">{shop.name}</p>
          <p className="pd-shop__sub">{t('market.shopInfo.subtitle')}</p>
          <div className="pd-shop__actions">
            <button
              type="button"
              className="pd-shop__btn pd-shop__btn--chat"
              onClick={() => (user ? openChat({ shop, product }) : openAuth('login'))}
            >
              <Icon name="chat" size={18} />
              {t('market.chat.button')}
            </button>
            <Link to={`/shop/${shop.id}`} className="pd-shop__btn">
              <Icon name="store" size={18} />
              {t('market.shop.view')}
            </Link>
          </div>
        </div>
      </div>

      <dl className="pd-shop__stats">
        {items.map((item) => (
          <div key={item.id} className="pd-shop__stat">
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default ProductShopInfo;
