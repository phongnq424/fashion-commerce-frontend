import { useEffect, useState } from 'react';
import Icon from '../../../components/common/Icon';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../hooks/useLanguage';
import { getShopContact } from '../../../services/shopChatService';
import ShopChatPanel from './ShopChatPanel';
import './ShopChat.css';

/**
 * Thẻ "Chăm sóc khách hàng" trong trang chi tiết sản phẩm (cột phải, ngay dưới nút Mua).
 *   [logo] Tên shop · Thường trả lời trong vài giờ
 *   [💬 Chat với shop]
 * - Chỉ chat trên web: mở khung chat nổi góc phải (cần đăng nhập). Tin nhắn đang giả lập (services/shopChatService.js).
 * - Tên + logo shop lấy từ Backend (GET /shops/{shopId}); chưa đăng nhập hoặc sản phẩm mẫu -> TrendyLab.
 */
function ShopContactCard({ product }) {
  const { t } = useLanguage();
  const { user, openAuth } = useAuth();
  const [contact, setContact] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const loggedIn = Boolean(user);

  useEffect(() => {
    let active = true;
    getShopContact(product, { loggedIn }).then((value) => {
      if (active) setContact(value);
    });
    return () => {
      active = false;
    };
  }, [product, loggedIn]);

  const openChat = () => (user ? setChatOpen(true) : openAuth('login'));
  const name = contact?.name ?? product.shopName ?? 'TrendyLab';

  return (
    <section className="shop-card" aria-label={t('shopChat.cardLabel')}>
      <div className="shop-card__head">
        <span className="shop-card__avatar" aria-hidden="true">
          {contact?.logoUrl ? <img src={contact.logoUrl} alt="" /> : <Icon name="store" size={22} />}
        </span>
        <div className="shop-card__meta">
          <p className="shop-card__name">
            {name}
            {contact?.official && <span className="shop-card__badge">{t('shopChat.official')}</span>}
          </p>
          <p className="shop-card__hint">
            <span className="shop-card__dot" aria-hidden="true" />
            {t('shopChat.responseTime')}
          </p>
        </div>
      </div>

      <div className="shop-card__actions">
        <button
          type="button"
          className="shop-card__btn shop-card__btn--primary"
          onClick={openChat}
          aria-haspopup="dialog"
          aria-expanded={chatOpen}
        >
          <Icon name="chat" size={18} />
          {t('shopChat.open')}
        </button>
      </div>

      {chatOpen && contact && (
        <ShopChatPanel
          shop={{ ...contact, name }}
          product={product}
          user={user}
          onClose={() => setChatOpen(false)}
        />
      )}
    </section>
  );
}

export default ShopContactCard;
