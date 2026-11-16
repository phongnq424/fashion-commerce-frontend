import { useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import AddressFormDialog from '../../account/addresses/components/AddressFormDialog';
import { useLanguage } from '../../../hooks/useLanguage';
import { createAddress, formatAddressLine, getAddresses } from '../../../services/addressService';

/**
 * Bước "Thông tin giao hàng": chọn 1 địa chỉ trong sổ địa chỉ (Backend bắt buộc addressId),
 * hoặc thêm địa chỉ mới ngay tại đây.
 * - selectedId / onSelect(addressId)
 * - onSubmit() -> Promise (xem trước đơn). Lỗi do trang cha hiện.
 */
function AddressStep({ selectedId, onSelect, onSubmit, busy, error }) {
  const { t } = useLanguage();
  const [addresses, setAddresses] = useState(null);
  const [adding, setAdding] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    getAddresses()
      .then((list) => {
        if (!active) return;
        setAddresses(list);
        if (!selectedId && list.length) onSelect(list[0].id);
      })
      .catch(() => active && setLoadError(true));
    return () => {
      active = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (form) => {
    const created = await createAddress(form);
    setAddresses((list) => [created, ...(list ?? []).map((a) => (created.defaultAddress ? { ...a, defaultAddress: false } : a))]);
    onSelect(created.id);
    setAdding(false);
  };

  return (
    <section className="checkout-section" aria-labelledby="shipping-title">
      <h2 id="shipping-title" className="checkout-section__title">
        {t('checkout.stepShipping')}
      </h2>

      {loadError && <p className="checkout-alert">{t('market.errors.NETWORK_ERROR')}</p>}
      {addresses === null && !loadError && <p>{t('market.common.loading')}</p>}
      {addresses?.length === 0 && <p>{t('market.checkout.noAddress')}</p>}

      {addresses?.length > 0 && (
        <fieldset className="payment-methods">
          <legend className="payment-methods__legend visually-hidden">{t('checkout.stepShipping')}</legend>
          {addresses.map((address) => (
            <label key={address.id} className={`payment-method ${selectedId === address.id ? 'payment-method--active' : ''}`}>
              <span className="payment-method__head">
                <input
                  type="radio"
                  className="payment-method__radio"
                  name="address"
                  checked={selectedId === address.id}
                  onChange={() => onSelect(address.id)}
                />
                <span className="payment-method__title">
                  {address.recipientName} · {address.recipientPhone}
                  {address.defaultAddress && ` (${t('market.checkout.default')})`}
                </span>
              </span>
              <span className="payment-method__desc">{formatAddressLine(address)}</span>
            </label>
          ))}
        </fieldset>
      )}

      <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
        <Icon name="plus" size={16} />
        {t('market.checkout.addAddress')}
      </Button>

      {error && (
        <p className="checkout-alert" role="alert">
          {t(`market.errors.${error}`, { defaultValue: t('market.errors.UNKNOWN') })}
        </p>
      )}

      <div className="checkout-actions">
        <Button className="checkout-actions__next" disabled={!selectedId || busy} onClick={onSubmit}>
          {busy ? t('market.common.loading') : t('market.checkout.toPayment')}
        </Button>
      </div>

      <AddressFormDialog open={adding} address={null} onClose={() => setAdding(false)} onSubmit={handleCreate} />
    </section>
  );
}

export default AddressStep;
