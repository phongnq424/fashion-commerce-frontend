import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumb from '../../components/common/Breadcrumb';
import Button from '../../components/common/Button';
import Icon from '../../components/common/Icon';
import CartItemImage from '../../components/CartItemImage/CartItemImage';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { useLanguage } from '../../hooks/useLanguage';
import { formatPrice } from '../../utils/format';
import CartOptionEditor from './components/CartOptionEditor';
import './CartScreen.css';

/**
 * Trang giỏ hàng: /cart (khai báo trong App.jsx).
 * - Tick chọn sản phẩm muốn mua (tổng tiền chỉ tính sản phẩm được chọn)
 * - Tăng / giảm số lượng, xoá từng sản phẩm hoặc xoá các sản phẩm đã chọn
 * - Nút bút: đổi màu / size của sản phẩm ngay trong giỏ (components/CartOptionEditor.jsx)
 * - Khung tóm tắt bên phải + nút "Thanh toán"
 * Dữ liệu lấy từ CartContext (Backend /cart khi đã đăng nhập, localStorage khi chưa).
 */
function CartScreen({ onCheckout, onCartError, onNotify }) {
  const { t, language } = useLanguage();
  const { user, openAuth } = useAuth();
  const {
    items,
    status,
    selectedItems,
    selectedQuantity,
    selectedSubtotal,
    updateQuantity,
    changeItemOptions,
    toggleSelected,
    setAllSelected,
    removeItem,
    removeItems,
    reload,
  } = useCart();
  const [editingKey, setEditingKey] = useState(null); // dòng đang mở popup đổi màu / size
  const closeEditor = useCallback(() => setEditingKey(null), []);

  const purchasable = items.filter((item) => item.purchasable);
  const allSelected = purchasable.length > 0 && purchasable.every((item) => item.selected);
  const selectedSavings = selectedItems.reduce(
    (sum, item) => sum + Math.max(0, (item.originalPrice ?? item.unitPrice) - item.unitPrice) * item.quantity,
    0,
  );

  // Mọi thao tác với Backend có thể lỗi (hết hàng, mất mạng...) -> báo bằng thông báo
  const run = (work) => async (...args) => {
    try {
      await work(...args);
    } catch (error) {
      onCartError?.(error);
    }
  };
  const changeQuantity = run(updateQuantity);
  const toggle = run(toggleSelected);
  const toggleAll = run(setAllSelected);
  const remove = run(removeItem);
  const removeSelected = run(() => removeItems(items.filter((item) => item.selected)));

  // Lưu màu / size mới. Lỗi -> báo rồi ném lại để popup biết mà không đóng
  const saveOptions = (item) => async (product, choice) => {
    try {
      await changeItemOptions(item, product, choice);
      const color = product.colors?.find((entry) => entry.id === choice.colorId)?.name;
      const variant = [color, choice.size].filter(Boolean).join(' / ');
      onNotify?.('success', t('cart.editSaved', { variant }));
    } catch (error) {
      onCartError?.(error);
      throw error;
    }
  };

  const breadcrumb = [{ label: t('breadcrumb.home'), to: '/' }, { label: t('cart.title') }];

  return (
    <>
      <Breadcrumb items={breadcrumb} />

      <section className="cart-page container" aria-labelledby="cart-title">
        <header className="cart-page__header">
          <h1 id="cart-title" className="cart-page__title">
            {t('cart.title')}
          </h1>
          {items.length > 0 && <p className="cart-page__count">{t('cart.count', { count: items.length })}</p>}
        </header>

        {!user && items.length > 0 && (
          <p className="cart-page__hint">
            <Icon name="info" size={18} />
            <span>{t('cart.guestHint')}</span>
            <button type="button" className="cart-page__hint-link" onClick={() => openAuth('login')}>
              {t('cart.loginNow')}
            </button>
          </p>
        )}

        {status === 'error' && (
          <div className="cart-page__error" role="alert">
            <Icon name="alert" size={20} />
            <span>{t('cart.loadError')}</span>
            <Button variant="secondary" size="sm" onClick={reload}>
              <Icon name="refresh" size={16} />
              {t('common.retry')}
            </Button>
          </div>
        )}

        {status === 'loading' && items.length === 0 ? (
          <p className="cart-page__loading">{t('common.loading')}</p>
        ) : items.length === 0 ? (
          <div className="cart-page__empty">
            <Icon name="bag" size={56} />
            <h2>{t('cart.empty')}</h2>
            <p>{t('cart.emptyHint')}</p>
            <Button as={Link} to="/">
              {t('cart.continueShopping')}
            </Button>
          </div>
        ) : (
          <div className="cart-page__layout">
            <div className="cart-page__main">
              {/* Hàng tiêu đề cột (ẩn trên mobile) */}
              <div className="cart-table__head">
                <label className="cart-check">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(event) => toggleAll(event.target.checked)}
                    disabled={purchasable.length === 0}
                  />
                  <span>{t('cart.selectAll', { count: purchasable.length })}</span>
                </label>
                <span className="cart-table__col-price">{t('cart.unitPrice')}</span>
                <span className="cart-table__col-qty">{t('cart.quantity')}</span>
                <span className="cart-table__col-total">{t('cart.lineTotal')}</span>
                <span className="cart-table__col-actions" />
              </div>

              <ul className="cart-table__list">
                {items.map((item) => (
                  <li
                    key={item.key}
                    className={`cart-row ${item.pending ? 'is-pending' : ''} ${item.purchasable ? '' : 'is-unavailable'}`}
                  >
                    <label className="cart-check cart-row__check">
                      <input
                        type="checkbox"
                        checked={item.selected && item.purchasable}
                        onChange={(event) => toggle(item, event.target.checked)}
                        disabled={!item.purchasable || item.pending}
                      />
                      <span className="visually-hidden">{t('cart.selectItem', { name: item.name })}</span>
                    </label>

                    <Link to={`/product/${item.productId}`} className="cart-row__thumb" tabIndex={-1}>
                      <CartItemImage src={item.image} />
                    </Link>

                    <div className="cart-row__info">
                      <Link to={`/product/${item.productId}`} className="cart-row__name">
                        {item.name}
                      </Link>
                      {item.variantText && (
                        <p className="cart-row__variant">
                          {t('cart.variant')}: {item.variantText}
                        </p>
                      )}
                      {!item.purchasable && (
                        <p className="cart-row__warn">
                          <Icon name="alert" size={14} />
                          {t(`cart.availability.${item.availability}`)}
                        </p>
                      )}
                    </div>

                    <p className="cart-row__price">
                      <span className="cart-row__label">{t('cart.unitPrice')}: </span>
                      <span>{formatPrice(item.unitPrice, language)}</span>
                      {item.originalPrice > item.unitPrice && (
                        <s className="cart-row__original">{formatPrice(item.originalPrice, language)}</s>
                      )}
                    </p>

                    <div className="cart-row__qty">
                      <div className="cart-qty" role="group" aria-label={t('cart.quantityOf', { name: item.name })}>
                        <button
                          type="button"
                          className="cart-qty__btn"
                          onClick={() => changeQuantity(item, item.quantity - 1)}
                          disabled={item.pending || item.quantity <= 1}
                          aria-label={t('productDetail.decrease')}
                        >
                          −
                        </button>
                        <output className="cart-qty__value" aria-live="polite">
                          {item.quantity}
                        </output>
                        <button
                          type="button"
                          className="cart-qty__btn"
                          onClick={() => changeQuantity(item, item.quantity + 1)}
                          disabled={item.pending || item.quantity >= item.maxQuantity}
                          aria-label={t('productDetail.increase')}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <p className="cart-row__total">
                      <span className="cart-row__label">{t('cart.lineTotal')}: </span>
                      {formatPrice(item.lineTotal, language)}
                    </p>

                    <div className="cart-row__actions">
                      {/* Nút bút: chỉ hiện với sản phẩm có màu / size để đổi */}
                      {item.variantText && (
                        <button
                          type="button"
                          className={`cart-row__icon-btn ${editingKey === item.key ? 'is-active' : ''}`}
                          onClick={() => setEditingKey((key) => (key === item.key ? null : item.key))}
                          disabled={item.pending}
                          aria-label={t('cart.edit', { name: item.name })}
                          aria-expanded={editingKey === item.key}
                          title={t('cart.editShort')}
                        >
                          <Icon name="edit" size={18} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="cart-row__icon-btn cart-row__icon-btn--danger"
                        onClick={() => remove(item)}
                        disabled={item.pending}
                        aria-label={t('cart.remove', { name: item.name })}
                        title={t('cart.removeShort')}
                      >
                        <Icon name="close" size={18} />
                      </button>
                    </div>

                    {editingKey === item.key && (
                      <CartOptionEditor item={item} onSave={saveOptions(item)} onClose={closeEditor} />
                    )}
                  </li>
                ))}
              </ul>

              <div className="cart-table__foot">
                <Button variant="ghost" size="sm" as={Link} to="/">
                  <Icon name="chevronLeft" size={16} />
                  {t('cart.continueShopping')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeSelected}
                  disabled={!items.some((item) => item.selected)}
                >
                  {t('cart.removeSelected')}
                </Button>
              </div>
            </div>

            {/* ---------- Tóm tắt đơn hàng ---------- */}
            <aside className="cart-summary" aria-labelledby="cart-summary-title">
              <h2 id="cart-summary-title" className="cart-summary__title">
                {t('cart.summary')}
              </h2>
              <dl className="cart-summary__rows">
                <div>
                  <dt>{t('cart.subtotal', { count: selectedQuantity })}</dt>
                  <dd>{formatPrice(selectedSubtotal, language)}</dd>
                </div>
                {selectedSavings > 0 && (
                  <div className="cart-summary__save">
                    <dt>{t('cart.savings')}</dt>
                    <dd>−{formatPrice(selectedSavings, language)}</dd>
                  </div>
                )}
                <div>
                  <dt>{t('cart.shipping')}</dt>
                  <dd className="cart-summary__muted">{t('cart.shippingLater')}</dd>
                </div>
                <div className="cart-summary__grand">
                  <dt>{t('cart.total')}</dt>
                  <dd>{formatPrice(selectedSubtotal, language)}</dd>
                </div>
              </dl>
              <Button fullWidth onClick={onCheckout} disabled={selectedItems.length === 0}>
                {t('cart.checkoutCount', { count: selectedQuantity })}
              </Button>
              <p className="cart-summary__note">
                <Icon name="shield" size={16} />
                {t('cart.secureNote')}
              </p>
            </aside>
          </div>
        )}
      </section>
    </>
  );
}

export default CartScreen;
