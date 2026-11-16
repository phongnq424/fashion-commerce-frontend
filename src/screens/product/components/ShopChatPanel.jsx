import { useEffect, useId, useRef, useState } from 'react';
import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';
import { formatPrice } from '../../../utils/format';
import { MESSAGE_MAX, getConversation, sendMessage, simulateShopReply } from '../../../services/shopChatService';

const QUICK_QUESTIONS = ['size', 'stock', 'shipping', 'returns'];

/**
 * Khung chat nổi với shop (góc phải dưới; mobile: toàn màn hình).
 * - Đầu khung: thẻ sản phẩm đang xem -> tin đầu tiên gửi kèm sản phẩm để shop biết khách hỏi gì.
 * - Câu hỏi nhanh: bấm là gửi luôn.
 * - Enter để gửi, Shift + Enter để xuống dòng, Esc để đóng.
 * Backend chưa có API chat -> tin nhắn lưu trên trình duyệt, shop trả lời mẫu (services/shopChatService.js).
 */
function ShopChatPanel({ shop, product, user, onClose }) {
  const { t, language } = useLanguage();
  const titleId = useId();
  const userKey = user?.id ?? user?.email ?? 'user';
  const [messages, setMessages] = useState(() => getConversation(shop.id, userKey));
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    inputRef.current?.focus();
    return () => {
      mounted.current = false;
    };
  }, []);

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

  const send = async (value) => {
    const content = value.trim();
    if (!content || typing) return;
    setMessages(sendMessage(shop.id, userKey, { text: content, product }));
    setText('');
    setTyping(true);
    const next = await simulateShopReply(shop.id, userKey, content, language);
    if (!mounted.current) return;
    setMessages(next);
    setTyping(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send(text);
    }
  };

  const time = (iso) =>
    new Date(iso).toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="shop-chat" role="dialog" aria-modal="false" aria-labelledby={titleId}>
      <header className="shop-chat__head">
        <span className="shop-card__avatar shop-card__avatar--sm" aria-hidden="true">
          {shop.logoUrl ? <img src={shop.logoUrl} alt="" /> : <Icon name="store" size={18} />}
        </span>
        <div className="shop-chat__title-wrap">
          <h2 id={titleId} className="shop-chat__title">{shop.name}</h2>
          <p className="shop-chat__subtitle">{t('shopChat.responseTime')}</p>
        </div>
        <button type="button" className="shop-chat__close" onClick={onClose} aria-label={t('common.close')}>
          <Icon name="close" size={20} />
        </button>
      </header>

      {/* Sản phẩm đang hỏi */}
      <div className="shop-chat__product">
        {product.image && !imageFailed ? (
          <img src={product.image} alt="" onError={() => setImageFailed(true)} />
        ) : (
          <span className="shop-chat__product-ph">
            <Icon name="hanger" size={18} />
          </span>
        )}
        <div>
          <p className="shop-chat__product-label">{t('shopChat.askingAbout')}</p>
          <p className="shop-chat__product-name">{product.name}</p>
          {product.price > 0 && <p className="shop-chat__product-price">{formatPrice(product.price, language)}</p>}
        </div>
      </div>

      <div className="shop-chat__list" ref={listRef} aria-live="polite">
        {messages.length === 0 && (
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
              <span className="visually-hidden">{message.from === 'me' ? t('shopChat.you') : shop.name}, </span>
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
          <button key={id} type="button" className="shop-chat__chip" onClick={() => send(t(`shopChat.quick.${id}`))} disabled={typing}>
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
        />
        <button type="submit" className="shop-chat__send" disabled={!text.trim() || typing} aria-label={t('shopChat.send')}>
          <Icon name="send" size={18} />
        </button>
      </form>
      <p className="shop-chat__note">{t('shopChat.demoNote')}</p>
    </div>
  );
}

export default ShopChatPanel;
