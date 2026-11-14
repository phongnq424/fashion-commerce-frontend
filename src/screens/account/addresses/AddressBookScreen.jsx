import { useCallback, useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import Dialog from '../../../components/common/Dialog';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import StatusBadge from '../../../components/common/StatusBadge';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../hooks/useLanguage';
import {
  createAddress,
  deleteAddresses,
  formatAddressLine,
  getAddresses,
  setDefaultAddress,
  updateAddress,
} from '../../../services/addressService';
import AccountLayout from '../components/AccountLayout';
import AddressFormDialog from './components/AddressFormDialog';

/**
 * /account/addresses — Sổ địa chỉ (bố cục kiểu các sàn TMĐT: mỗi địa chỉ 1 dòng).
 *   Đầu trang (phải):  [Xoá đã chọn (n)] [+ Thêm địa chỉ mới]
 *   Hàng đầu danh sách: (◯) Chọn tất cả
 *   Mỗi dòng: (◯) | Tên | SĐT, địa chỉ  ............  Sửa  Xoá
 *             - Địa chỉ mặc định: chỉ có nhãn "Mặc định" (dưới địa chỉ), KHÔNG có nút đặt mặc định
 *             - Địa chỉ khác: có nút [Đặt làm mặc định] (bên phải, dưới Sửa / Xoá)
 * Chọn từng vòng tròn hoặc "Chọn tất cả" rồi bấm "Xoá đã chọn" -> xoá nhiều địa chỉ 1 lần (có hỏi lại).
 * - onNotify(type, message)
 */
function AddressBookScreen({ onNotify }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [status, setStatus] = useState('loading');
  const [editing, setEditing] = useState(null); // null = đóng | 'new' | AddressResponse
  const [selected, setSelected] = useState(() => new Set()); // id các địa chỉ đang tick
  const [confirmIds, setConfirmIds] = useState(null); // id sắp xoá (chờ xác nhận)
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await getAddresses();
      setAddresses(list);
      // Bỏ tick những địa chỉ không còn
      setSelected((current) => new Set([...current].filter((id) => list.some((item) => item.id === id))));
    } catch (error) {
      console.error(error);
      setAddresses([]);
    } finally {
      setStatus('success');
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const fail = (error) => {
    console.error(error);
    onNotify?.('error', t('account.actionError'));
  };

  // ----- Chọn -----
  const allSelected = addresses.length > 0 && selected.size === addresses.length;
  const someSelected = selected.size > 0 && !allSelected;
  const toggleOne = (id) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(addresses.map((item) => item.id)));

  // ----- Thêm / sửa -----
  const handleSubmit = async (form) => {
    try {
      if (editing === 'new') await createAddress(form);
      else await updateAddress(editing.id, form);
      onNotify?.('success', t(editing === 'new' ? 'addresses.added' : 'addresses.updated'));
      setEditing(null);
      await load();
    } catch (error) {
      fail(error);
    }
  };

  // ----- Xoá (1 hoặc nhiều) -----
  const handleDelete = async () => {
    const ids = confirmIds;
    setConfirmIds(null);
    setBusy(true);
    try {
      await deleteAddresses(ids);
      onNotify?.('success', ids.length > 1 ? t('addresses.deletedMany', { count: ids.length }) : t('addresses.deleted'));
      setSelected((current) => new Set([...current].filter((id) => !ids.includes(id))));
      await load();
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  const handleSetDefault = async (address) => {
    setBusy(true);
    try {
      await setDefaultAddress(address);
      onNotify?.('success', t('addresses.defaultSet'));
      await load();
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  const confirmTargets = (confirmIds ?? []).map((id) => addresses.find((item) => item.id === id)).filter(Boolean);
  const deletingDefault = confirmTargets.some((item) => item.defaultAddress) && confirmTargets.length < addresses.length;

  return (
    <AccountLayout
      title={t('addresses.title')}
      subtitle={t('addresses.subtitle')}
      breadcrumb={[{ label: t('account.nav.addresses') }]}
      actions={
        addresses.length > 0 && (
          <>
            <Button
              variant="outline"
              className="address-bulk-delete"
              disabled={selected.size === 0 || busy}
              onClick={() => setConfirmIds([...selected])}
            >
              <Icon name="trash" size={18} />
              {selected.size > 0 ? t('addresses.deleteSelected', { count: selected.size }) : t('common.delete')}
            </Button>
            <Button onClick={() => setEditing('new')}>
              <Icon name="plus" size={18} />
              {t('addresses.add')}
            </Button>
          </>
        )
      }
    >
      {status === 'loading' && <div className="account-skeleton" />}

      {status === 'success' && addresses.length === 0 && (
        <div className="account-card">
          <EmptyState
            icon="mapPin"
            title={t('addresses.emptyTitle')}
            text={t('addresses.empty')}
            action={
              <Button onClick={() => setEditing('new')}>
                <Icon name="plus" size={18} />
                {t('addresses.add')}
              </Button>
            }
          />
        </div>
      )}

      {status === 'success' && addresses.length > 0 && (
        <div className="account-card address-list">
          {/* Hàng "Chọn tất cả" */}
          <div className="address-list__head">
            <label className="round-check">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(node) => {
                  if (node) node.indeterminate = someSelected;
                }}
                onChange={toggleAll}
              />
              <span>{t('addresses.selectAll')}</span>
            </label>
            <span className="account-muted" aria-live="polite">
              {selected.size > 0
                ? t('addresses.selectedCount', { count: selected.size, total: addresses.length })
                : t('addresses.total', { count: addresses.length })}
            </span>
          </div>

          <ul className="address-rows">
            {addresses.map((address) => {
              const checked = selected.has(address.id);
              return (
                <li key={address.id} className={`address-row ${checked ? 'address-row--selected' : ''}`}>
                  <label className="round-check address-row__check">
                    <input type="checkbox" checked={checked} onChange={() => toggleOne(address.id)} />
                    <span className="visually-hidden">
                      {t('addresses.selectOne', { name: address.recipientName })}
                    </span>
                  </label>

                  {/* Nội dung: căn trái */}
                  <div className="address-row__info">
                    <p className="address-row__name">
                      {address.recipientName}
                      <span className="address-row__phone">{address.recipientPhone}</span>
                    </p>
                    <p className="address-row__line">{formatAddressLine(address)}</p>
                    {address.defaultAddress && (
                      <StatusBadge tone="info" className="address-row__badge">
                        {t('addresses.defaultBadge')}
                      </StatusBadge>
                    )}
                  </div>

                  {/* Thao tác: căn phải */}
                  <div className="address-row__actions">
                    <div className="address-row__links">
                      <button type="button" className="text-btn" onClick={() => setEditing(address)}>
                        {t('common.edit')}
                      </button>
                      <span className="address-row__divider" aria-hidden="true">
                        |
                      </span>
                      <button
                        type="button"
                        className="text-btn text-btn--danger"
                        disabled={busy}
                        onClick={() => setConfirmIds([address.id])}
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                    {/* Chỉ địa chỉ CHƯA mặc định mới có nút này; địa chỉ mặc định chỉ mang nhãn "Mặc định" */}
                    {!address.defaultAddress && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="address-row__default-btn"
                        disabled={busy}
                        onClick={() => handleSetDefault(address)}
                      >
                        {t('addresses.setDefault')}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <AddressFormDialog
        open={editing !== null}
        address={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSubmit={handleSubmit}
      />

      <Dialog
        open={confirmIds !== null}
        onClose={() => setConfirmIds(null)}
        size="sm"
        title={
          confirmTargets.length > 1
            ? t('addresses.deleteManyTitle', { count: confirmTargets.length })
            : t('addresses.deleteTitle')
        }
        description={confirmTargets.length === 1 ? formatAddressLine(confirmTargets[0]) : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmIds(null)}>
              {t('common.cancel')}
            </Button>
            <Button className="btn--danger" onClick={handleDelete}>
              {t('common.delete')}
            </Button>
          </>
        }
      >
        {confirmTargets.length > 1 && (
          <ul className="address-confirm-list">
            {confirmTargets.map((item) => (
              <li key={item.id}>
                <strong>{item.recipientName}</strong> — {formatAddressLine(item)}
              </li>
            ))}
          </ul>
        )}
        <p className="account-muted">{t('addresses.deleteText')}</p>
        {deletingDefault && <p className="address-confirm-note">{t('addresses.deleteDefaultNote')}</p>}
      </Dialog>
    </AccountLayout>
  );
}

export default AddressBookScreen;
