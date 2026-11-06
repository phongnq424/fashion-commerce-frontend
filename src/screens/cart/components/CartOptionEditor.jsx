import { useEffect, useRef, useState } from 'react';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';
import { getProductById } from '../../../services/productService';
import { formatPrice } from '../../../utils/format';
import { findVariant, isColorAvailable, isSizeAvailable } from '../../../utils/productVariants';

// Ảnh nhỏ của màu; không có ảnh hoặc ảnh lỗi -> chấm màu
function ColorMark({ color }) {
  const [failed, setFailed] = useState(false);
  if (color.image && !failed) {
    return <img src={color.image} alt="" className="cart-chip__thumb" onError={() => setFailed(true)} />;
  }
  return (
    <span
      className="cart-chip__swatch"
      style={color.hex ? { background: color.hex } : undefined}
      aria-hidden="true"
    />
  );
}

/**
 * Popup đổi màu / size của 1 dòng trong giỏ hàng (mở bằng nút bút).
 * Props:
 * - item: dòng giỏ hàng đang sửa
 * - onSave(product, { size, colorId }): lưu lựa chọn mới (CartProvider.changeItemOptions)
 * - onClose(): đóng popup
 */
function CartOptionEditor({ item, onSave, onClose }) {
  const { t, language } = useLanguage();
  const [product, setProduct] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [size, setSize] = useState('');
  const [colorId, setColorId] = useState('');
  const [saving, setSaving] = useState(false);
  const panelRef = useRef(null);

  // Tải thông tin sản phẩm để biết có những màu / size nào, cái nào còn hàng
  useEffect(() => {
    let cancelled = false;
    getProductById(item.productId)
      .then((detail) => {
        if (cancelled) return;
        if (!detail) {
          setLoadError(true);
          return;
        }
        setProduct(detail);
        const colors = detail.colors ?? [];
        const currentColor = colors.find((color) => color.name === item.color || color.code === item.color);
        setColorId(currentColor?.id ?? (colors.length === 1 ? colors[0].id : ''));
        setSize((detail.sizes ?? []).includes(item.size) ? item.size : '');
      })
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [item.productId, item.color, item.size]);

  // Bấm ra ngoài hoặc nhấn Esc -> đóng
  useEffect(() => {
    const handlePointer = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) onClose();
    };
    const handleKey = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const sizes = product?.sizes ?? [];
  const colors = product?.colors ?? [];
  const hasVariants = (product?.variants?.length ?? 0) > 0;
  const variant = product && hasVariants ? findVariant(product, { size, colorId }) : null;
  const complete = product && (!sizes.length || size) && (!colors.length || colorId);
  const sellable = complete && (!hasVariants || (variant && variant.availableQuantity > 0));
  const color = colors.find((entry) => entry.id === colorId);
  const changed = complete && (size !== (item.size ?? '') || (color?.name ?? null) !== (item.color ?? null));

  const chooseColor = (id) => {
    setColorId(id);
    // Size đang chọn hết hàng ở màu mới -> bỏ chọn
    if (size && product && !isSizeAvailable(product, size, id)) setSize('');
  };

  const save = async () => {
    if (!changed) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await onSave(product, { size, colorId });
      onClose();
    } catch {
      // Lỗi đã được báo bằng thông báo (onSave) -> giữ popup mở để khách chọn lại
    } finally {
      setSaving(false);
    }
  };

  const price = variant?.priceMinor ?? product?.price;

  return (
    <div
      ref={panelRef}
      className="cart-edit"
      role="dialog"
      aria-label={t('cart.editAria', { name: item.name })}
      tabIndex={-1}
    >
      <div className="cart-edit__head">
        <p className="cart-edit__title">{t('cart.editTitle')}</p>
        <button type="button" className="cart-edit__close" onClick={onClose} aria-label={t('common.close')}>
          <Icon name="close" size={16} />
        </button>
      </div>

      {loadError ? (
        <p className="cart-edit__error" role="alert">
          <Icon name="alert" size={16} />
          {t('cart.editLoadError')}
        </p>
      ) : !product ? (
        <p className="cart-edit__loading">{t('common.loading')}</p>
      ) : (
        <>
          {colors.length > 0 && (
            <fieldset className="cart-edit__group">
              <legend>
                {t('productDetail.color')}: <strong>{color?.name ?? '—'}</strong>
              </legend>
              <div className="cart-edit__chips">
                {colors.map((entry) => {
                  const available = isColorAvailable(product, entry.id);
                  return (
                    <label key={entry.id} className={`cart-chip ${available ? '' : 'is-unavailable'}`}>
                      <input
                        type="radio"
                        name={`edit-color-${item.key}`}
                        checked={colorId === entry.id}
                        onChange={() => chooseColor(entry.id)}
                        disabled={!available}
                      />
                      <span className="cart-chip__box">
                        <ColorMark color={entry} />
                        {entry.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {sizes.length > 0 && (
            <fieldset className="cart-edit__group">
              <legend>
                {t('productDetail.size')}: <strong>{size || '—'}</strong>
              </legend>
              <div className="cart-edit__chips">
                {sizes.map((value) => {
                  const available = isSizeAvailable(product, value, colorId);
                  return (
                    <label key={value} className={`cart-chip ${available ? '' : 'is-unavailable'}`}>
                      <input
                        type="radio"
                        name={`edit-size-${item.key}`}
                        checked={size === value}
                        onChange={() => setSize(value)}
                        disabled={!available}
                      />
                      <span className="cart-chip__box">{value}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {complete && (
            <p className="cart-edit__meta">
              {price != null && <strong>{formatPrice(price, language)}</strong>}
              {variant && <span>{t('productDetail.variantStock', { count: variant.availableQuantity })}</span>}
              {complete && !sellable && <span className="cart-edit__warn">{t('cart.availability.OUT_OF_STOCK')}</span>}
            </p>
          )}

          <div className="cart-edit__actions">
            <Button variant="outline" size="sm" onClick={onClose}>
              {t('cart.editCancel')}
            </Button>
            <Button size="sm" onClick={save} disabled={!sellable || saving}>
              {saving ? t('common.loading') : t('cart.editConfirm')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default CartOptionEditor;
