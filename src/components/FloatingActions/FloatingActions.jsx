import { useEffect, useState } from 'react';
import Icon from '../common/Icon';
import ShopChatPanel from '../ShopChat/ShopChatPanel';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useShopChat } from '../../hooks/useShopChat';
import { getShopContact } from '../../services/shopChatService';
import './FloatingActions.css';

const SHOW_AFTER_PX = 400; // cuộn xuống quá 400px mới hiện nút lên đầu trang

// Icon 2 bong bóng chat chồng nhau (bong bóng sau chỉ viền, bong bóng trước tô màu + 3 chấm).
// width/height ghi thẳng vào thẻ -> icon luôn đúng cỡ, kể cả khi CSS chưa tải / chưa cập nhật.
function ChatBubblesIcon({ size = 31 }) {
  return (
    <svg className="fab__icon" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path
        d="M10.5 8V7a3 3 0 0 1 3-3h11.5a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-.5v3.2L21.3 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 13a3 3 0 0 1 3-3h13a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-7.5L7.5 28v-4H7a3 3 0 0 1-3-3z"
        fill="currentColor"
      />
      {/* 3 chấm cùng màu nền nút (trắng) */}
      <circle className="fab__icon-dot" cx="9.5" cy="17" r="1.5" fill="#fff" />
      <circle className="fab__icon-dot" cx="13.5" cy="17" r="1.5" fill="#fff" />
      <circle className="fab__icon-dot" cx="17.5" cy="17" r="1.5" fill="#fff" />
    </svg>
  );
}

/**
 * Các nút nổi cố định ở đáy màn hình (đặt 1 lần trong App.jsx -> có trên mọi trang):
 *   - Góc TRÁI:  nút ↑ "Lên đầu trang" — chỉ hiện khi đã cuộn xuống.
 *   - Góc PHẢI:  nút "Nhắn shop" — mở khung chat (cần đăng nhập).
 *                Đang ở trang chi tiết sản phẩm -> nhắn shop bán sản phẩm đó, kèm thẻ sản phẩm.
 * - showChat: false -> ẩn nút chat (trang quản trị, thanh toán), vẫn giữ nút lên đầu trang.
 */
function FloatingActions({ showChat = true }) {
  const { t } = useLanguage();
  const { user, openAuth } = useAuth();
  const { product, isOpen, openChat, closeChat } = useShopChat();
  const [showTop, setShowTop] = useState(false);
  const [shop, setShop] = useState(null);
  const loggedIn = Boolean(user);

  // Hiện / ẩn nút lên đầu trang theo vị trí cuộn
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Shop đang nhắn: shop của sản phẩm đang xem, hoặc TrendyLab
  useEffect(() => {
    let active = true;
    getShopContact(product, { loggedIn }).then((value) => {
      if (active) setShop(value);
    });
    return () => {
      active = false;
    };
  }, [product, loggedIn]);

  // Đăng xuất khi đang mở chat -> đóng khung
  useEffect(() => {
    if (!user) closeChat();
  }, [user, closeChat]);

  const scrollToTop = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  const handleChat = () => (user ? openChat() : openAuth('login'));

  return (
    <>
      <button
        type="button"
        className={`fab fab--top ${showTop ? 'is-visible' : ''}`}
        onClick={scrollToTop}
        aria-label={t('floating.backToTop')}
        tabIndex={showTop ? 0 : -1}
        aria-hidden={!showTop}
      >
        <Icon name="chevronUp" size={26} strokeWidth={2.4} />
      </button>

      {showChat && !isOpen && (
        // Chỉ có icon -> chữ "Nhắn shop" vẫn có cho trình đọc màn hình (aria-label) + hiện khi rê chuột (title)
        <button
          type="button"
          className="fab fab--chat"
          onClick={handleChat}
          aria-haspopup="dialog"
          aria-label={t('floating.chat')}
          title={t('floating.chat')}
        >
          <ChatBubblesIcon />
        </button>
      )}

      {showChat && isOpen && user && shop && (
        <ShopChatPanel key={shop.id} shop={shop} product={product} user={user} onClose={closeChat} />
      )}
    </>
  );
}

export default FloatingActions;
