import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { useLanguage } from '../../hooks/useLanguage';
import { formatPrice } from '../../utils/format';
import { getPublicShops } from '../../services/publicShopService';
import { MESSAGE_MAX, getConversation, listConversations, sendMessage, simulateShopReply } from '../../services/shopChatService';
import './ShopChat.css';

const QUICK_QUESTIONS = ['size', 'stock', 'shipping', 'returns'];

const initialOf = (name) => (name || '?').trim().charAt(0).toUpperCase();

/**
 * Khung chat với shop (nổi ở góc phải dưới; mobile: toàn màn hình).
 *   ┌──────────────────────┬───────────────────────────────────┐
 *   │ THÔNG TIN SHOP       │ Tên shop                       ✕  │
 *   │ [M] Mây Basic        │ (Bạn đang hỏi về: sản phẩm ...)   │
 *   │ 6 sản phẩm · Xem shop│  tin nhắn ...                     │
 *   │──────────────────────│                                   │
 *   │ Tin nhắn             │ [câu hỏi nhanh]                   │
 *   │  shop A  ...         │ [ô nhập tin nhắn]          [Gửi]  │
 *   │  shop B  ...         │                                   │
 *   └──────────────────────┴───────────────────────────────────┘
 * - initialShop: shop mở sẵn (từ trang chi tiết sản phẩm / nút "Chat"); null -> shop chat gần nhất hoặc shop đầu danh sách.
 * - product: sản phẩm đang hỏi (chỉ đính kèm khi đang chat đúng shop bán sản phẩm đó).
 * - Enter để gửi, Shift + Enter xuống dòng, Esc để đóng.
 * Backend chưa có API chat -> tin nhắn lưu trên trình duyệt, shop trả lời mẫu (services/shopChatService.js).
 */
function ShopChatPanel({ user, initialShop, product, onClose }) {
  const { t, language } = useLanguage();
  const titleId = useId();
  const userKey = user?.id ?? user?.email ?? 'user';

  const [shops, setShops] = useState(() => (initialShop ? [initialShop] : []));
  const [conversations, setConversations] = useState(() => listConversations(userKey));
  const [shopId, setShopId] = useState(initialShop?.id ?? null);
  const [messages, setMessages] = useState(() => (initialShop ? getConversation(initialShop.id, userKey) : []));
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [mobileView, setMobileView] = useState(initialShop ? 'chat' : 'list'); // chỉ dùng trên màn hình nhỏ
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const mounted = useRef(true);
  const shopIdRef = useRef(shopId); // shop đang mở (để biết tin trả lời về có thuộc khung đang xem không)

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Danh sách shop trên sàn (bên trái). Chưa chọn shop -> chọn shop chat gần nhất, hoặc shop đầu tiên.
  useEffect(() => {
    let active = true;
    getPublicShops()
      .then((list) => {
        if (!active) return;
        const merged = initialShop && !list.some((s) => s.id === initialShop.id) ? [initialShop, ...list] : list;
        setShops(merged);
        setShopId((current) => {
          if (current) return current;
          const recent = Object.entries(listConversations(userKey)).sort((a, b) => b[1].sentAt.localeCompare(a[1].sentAt))[0]?.[0];
          return merged.find((s) => s.id === recent)?.id ?? merged[0]?.id ?? null;
        });
      })
      .catch((error) => console.warn('[ShopChat] Không tải được danh sách shop', error));
    return () => {
      active = false;
    };
  }, [initialShop, userKey]);

  // Đổi shop -> tải lịch sử chat của shop đó
  useEffect(() => {
    shopIdRef.current = shopId;
    if (shopId) setMessages(getConversation(shopId, userKey));
    setTyping(false);
    inputRef.current?.focus();
  }, [shopId, userKey]);

  // Esc để đóng
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Tin mới -> cuộn xuống cuối
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, typing]);

  const shop = shops.find((s) => s.id === shopId) ?? null;
  // Chỉ đính kèm sản phẩm khi đang chat đúng shop bán sản phẩm đó
  const askingProduct = product && shop && product.shopId === shop.id ? product : null;

  // Shop đã chat (mới nhất trước) rồi tới các shop còn lại
  const orderedShops = useMemo(
    () =>
      [...shops].sort((a, b) => {
        const la = conversations[a.id]?.sentAt ?? '';
        const lb = conversations[b.id]?.sentAt ?? '';
        return lb.localeCompare(la);
      }),
    [shops, conversations],
  );

  const selectShop = useCallback((id) => {
    setShopId(id);
    setMobileView('chat');
  }, []);

  const send = async (value) => {
    const content = value.trim();
    if (!content || typing || !shop) return;
    const currentShop = shop.id;
    setMessages(sendMessage(currentShop, userKey, { text: content, product: askingProduct }));
    setConversations(listConversations(userKey));
    setText('');
    setTyping(true);
    const next = await simulateShopReply(currentShop, userKey, content, language);
    if (!mounted.current) return;
    setConversations(listConversations(userKey));
    if (shopIdRef.current === currentShop) {
      setMessages(next);
      setTyping(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send(text);
    }
  };

  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const time = (iso) => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const shortTime = (iso) => {
    const date = new Date(iso);
    return date.toDateString() === new Date().toDateString() ? time(iso) : date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className={`shop-chat shop-chat--${mobileView}`} role="dialog" aria-modal="false" aria-labelledby={titleId}>
      {/* ---------- CỘT TRÁI: thông tin shop + danh sách cuộc trò chuyện ---------- */}
      <aside className="shop-chat__side" aria-label={t('market.chat.shopsLabel')}>
        <div className="shop-chat__side-head">
          <p className="shop-chat__brand">
            <Icon name="chat" size={18} />
            {t('market.chat.title')}
          </p>
          <button type="button" className="shop-chat__close shop-chat__close--side" onClick={onClose} aria-label={t('common.close')}>
            <Icon name="close" size={20} />
          </button>
        </div>

        {shop && (
          <section className="shop-chat__info" aria-label={t('market.shop.cardLabel')}>
            <span className="shop-chat__avatar shop-chat__avatar--lg" aria-hidden="true">
              {initialOf(shop.name)}
            </span>
            <p className="shop-chat__info-name">{shop.name}</p>
            <p className="shop-chat__info-sub">
              <Icon name="bag" size={13} />
              {t('market.shop.productCount', { count: shop.productCount ?? 0 })}
            </p>
            <Link to={`/shop/${shop.id}`} className="shop-chat__info-link" onClick={onClose}>
              <Icon name="store" size={15} />
              {t('market.shop.view')}
            </Link>
          </section>
        )}

        <p className="shop-chat__side-title">{t('market.chat.conversations')}</p>
        <ul className="shop-chat__shops">
          {orderedShops.map((item) => {
            const last = conversations[item.id];
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`shop-chat__shop ${item.id === shopId ? 'is-active' : ''}`}
                  aria-current={item.id === shopId ? 'true' : undefined}
                  onClick={() => selectShop(item.id)}
                >
                  <span className="shop-chat__avatar" aria-hidden="true">
                    {initialOf(item.name)}
                  </span>
                  <span className="shop-chat__shop-text">
                    <span className="shop-chat__shop-name">{item.name}</span>
                    <span className="shop-chat__shop-last">
                      {last ? `${last.from === 'me' ? `${t('shopChat.you')}: ` : ''}${last.text}` : t('market.chat.startHint')}
                    </span>
                  </span>
                  {last && <span className="shop-chat__shop-time">{shortTime(last.sentAt)}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* ---------- CỘT PHẢI: nội dung chat ---------- */}
      <section className="shop-chat__main">
        <header className="shop-chat__head">
          <button type="button" className="shop-chat__back" onClick={() => setMobileView('list')} aria-label={t('market.chat.back')}>
            <Icon name="chevronLeft" size={20} />
          </button>
          <div className="shop-chat__title-wrap">
            <h2 id={titleId} className="shop-chat__title">
              {shop?.name ?? t('market.chat.title')}
            </h2>
            <p className="shop-chat__subtitle">{t('shopChat.responseTime')}</p>
          </div>
          <button type="button" className="shop-chat__close" onClick={onClose} aria-label={t('common.close')}>
            <Icon name="close" size={20} />
          </button>
        </header>

        {askingProduct && (
          <div className="shop-chat__product">
            {askingProduct.image || askingProduct.images?.[0] ? (
              <img src={askingProduct.image ?? askingProduct.images[0]} alt="" />
            ) : (
              <span className="shop-chat__product-ph">
                <Icon name="hanger" size={18} />
              </span>
            )}
            <div>
              <p className="shop-chat__product-label">{t('shopChat.askingAbout')}</p>
              <p className="shop-chat__product-name">{askingProduct.name}</p>
              {askingProduct.price > 0 && <p className="shop-chat__product-price">{formatPrice(askingProduct.price, language)}</p>}
            </div>
          </div>
        )}

        <div className="shop-chat__list" ref={listRef} aria-live="polite">
          {shop && messages.length === 0 && (
            <div className="shop-chat__welcome">
              <Icon name="headset" size={28} />
              <p>{t('shopChat.welcome', { name: shop.name })}</p>
            </div>
          )}
          {messages.map((message) => (
            <div key={message.id} className={`shop-chat__msg shop-chat__msg--${message.from}`}>
              {message.product && (
                <div className="shop-chat__attach">
                  <Icon name="tag" size={14} />
                  <span>{message.product.name}</span>
                </div>
              )}
              <p className="shop-chat__bubble">{message.text}</p>
              <span className="shop-chat__time">
                <span className="visually-hidden">{message.from === 'me' ? t('shopChat.you') : shop?.name}, </span>
                {time(message.sentAt)}
              </span>
            </div>
          ))}
          {typing && (
            <div className="shop-chat__msg shop-chat__msg--shop">
              <p className="shop-chat__bubble shop-chat__typing" aria-label={t('shopChat.typing')}>
                <span />
                <span />
                <span />
              </p>
            </div>
          )}
        </div>

        <div className="shop-chat__quick" role="group" aria-label={t('shopChat.quickLabel')}>
          {QUICK_QUESTIONS.map((id) => (
            <button key={id} type="button" className="shop-chat__chip" onClick={() => send(t(`shopChat.quick.${id}`))} disabled={typing || !shop}>
              {t(`shopChat.quick.${id}`)}
            </button>
          ))}
        </div>

        <form
          className="shop-chat__form"
          onSubmit={(event) => {
            event.preventDefault();
            send(text);
          }}
        >
          <label htmlFor={`${titleId}-input`} className="visually-hidden">
            {t('shopChat.placeholder')}
          </label>
          <textarea
            id={`${titleId}-input`}
            ref={inputRef}
            className="shop-chat__input"
            rows={1}
            maxLength={MESSAGE_MAX}
            placeholder={t('shopChat.placeholder')}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!shop}
          />
          <button type="submit" className="shop-chat__send" disabled={!text.trim() || typing || !shop} aria-label={t('shopChat.send')}>
            <Icon name="send" size={18} />
          </button>
        </form>
        <p className="shop-chat__note">{t('market.chat.demoNote')}</p>
      </section>
    </div>
  );
}

export default ShopChatPanel;
