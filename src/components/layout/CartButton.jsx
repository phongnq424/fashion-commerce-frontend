import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Button from '../common/Button';
import Icon from '../common/Icon';
import CartItemImage from '../CartItemImage/CartItemImage';
import { useCart } from '../../hooks/useCart';
import { useLanguage } from '../../hooks/useLanguage';
import { formatPrice } from '../../utils/format';
import './CartButton.css';

const CLOSE_DELAY_MS = 180; // rê chuột từ icon xuống popup không bị đóng giữa chừng
const AUTO_OPEN_MS = 2600; // vừa thêm vào giỏ -> popup tự mở một lúc

/**
 * Icon giỏ hàng trên header.
 * - Bấm icon            -> sang trang giỏ hàng (/cart)
 * - Rê chuột / Tab vào  -> popup giỏ hàng nhỏ: danh sách sản phẩm, nút ✕ xoá từng sản phẩm,
 *                          tổng tiền cả giỏ, nút "Thanh toán" và "Xem giỏ hàng"
 * - Màn hình cảm ứng (không có hover): chỉ bấm để sang trang giỏ hàng
 */
function CartButton({ onCheckout, onError }) {
  const { t, language } = useLanguage();
  const { pathname } = useLocation();
  const { items, totalQuantity, totalPrice, removeItem, lastAddedAt } = useCart();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);
  const onCartPage = pathname === '/cart';

  const show = () => {
    clearTimeout(closeTimer.current);
    if (!onCartPage) setOpen(true);
  };
  const hide = (delay = CLOSE_DELAY_MS) => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), delay);
  };

  // Vừa thêm sản phẩm -> mở popup để khách thấy ngay, rồi tự đóng
  useEffect(() => {
    if (!lastAddedAt || onCartPage) return undefined;
    setOpen(true);
    closeTimer.current = setTimeout(() => setOpen(false), AUTO_OPEN_MS);
    return () => clearTimeout(closeTimer.current);
  }, [lastAddedAt, onCartPage]);

  // Đổi trang -> đóng popup
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') setOpen(false);
  };

  // Rời khỏi cả khối (icon + popup) bằng bàn phím -> đóng
  const handleBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) hide(0);
  };

  const remove = async (item) => {
    try {
      await removeItem(item);
    } catch (error) {
      onError?.(error);
    }
  };

  return (
    <div
      className="cart-menu"
      onMouseEnter={show}
      onMouseLeave={() => hide()}
      onFocus={show}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      <Link
        to="/cart"
        className="icon-btn"
        aria-label={t('header.cart', { count: totalQuantity })}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Icon name="bag" />
        {totalQuantity > 0 && (
          <span className="site-header__badge" aria-hidden="true">
            {totalQuantity > 99 ? '99+' : totalQuantity}
          </span>
        )}
      </Link>

      {open && (
        <div className="cart-menu__panel" role="region" aria-label={t('cart.miniTitle')}>
          <p className="cart-menu__title">
            {t('cart.miniTitle')} <span className="cart-menu__count">({totalQuantity})</span>
          </p>

          {items.length === 0 ? (
            <div className="cart-menu__empty">
              <Icon name="bag" size={36} />
              <p>{t('cart.empty')}</p>
            </div>
          ) : (
            <>
              <ul className="cart-menu__list">
                {items.map((item) => (
                  <li key={item.key} className={`cart-menu__item ${item.pending ? 'is-pending' : ''}`}>
                    <Link to={`/product/${item.productId}`} className="cart-menu__thumb">
                      <CartItemImage src={item.image} />
                    </Link>
                    <div className="cart-menu__info">
                      <Link to={`/product/${item.productId}`} className="cart-menu__name" title={item.name}>
                        {item.name}
                      </Link>
                      {item.variantText && <p className="cart-menu__variant">{item.variantText}</p>}
                      <p className="cart-menu__price">
                        <span className="cart-menu__qty">{item.quantity} ×</span>{' '}
                        {formatPrice(item.unitPrice, language)}
                      </p>
                      {!item.purchasable && <p className="cart-menu__warn">{t(`cart.availability.${item.availability}`)}</p>}
                    </div>
                    <button
                      type="button"
                      className="cart-menu__remove"
                      onClick={() => remove(item)}
                      disabled={item.pending}
                      aria-label={t('cart.remove', { name: item.name })}
                      title={t('cart.removeShort')}
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="cart-menu__total">
                <span>{t('cart.total')}</span>
                <strong>{formatPrice(totalPrice, language)}</strong>
              </div>

              <div className="cart-menu__actions">
                <Button size="sm" fullWidth onClick={onCheckout}>
                  {t('cart.checkout')}
                </Button>
                <Button as={Link} to="/cart" variant="outline" size="sm" fullWidth>
                  {t('cart.viewCart')}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default CartButton;
