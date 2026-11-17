import { useCallback, useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import Dialog from '../../../components/common/Dialog';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import Select from '../../../components/common/FieldSelect';
import StatusBadge from '../../../components/common/StatusBadge';
import { useLanguage } from '../../../hooks/useLanguage';
import { useSeller } from '../../../hooks/useSeller';
import { cancelOwnershipTransfer, createOwnershipTransfer, getMembers, getShopTransfers } from '../../../services/seller/staffService';
import { formatDateTime, statusTone } from '../../../utils/status';
import RequireShop from '../components/RequireShop';
import SellerPage from '../components/SellerPage';

const ERROR_KEYS = {
  OWNERSHIP_TRANSFER_PENDING: 'seller.ownership.errors.pending',
  OWNERSHIP_TARGET_INVALID: 'seller.ownership.errors.target',
  SHOP_OWNER_REQUIRED: 'seller.ownership.errors.ownerOnly',
};

function Ownership({ shopId, onNotify }) {
  const { t, language } = useLanguage();
  const { isOwner } = useSeller();
  const [members, setMembers] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [target, setTarget] = useState('');
  const [keep, setKeep] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [m, tr] = await Promise.all([getMembers(shopId), getShopTransfers(shopId)]);
    setMembers(m.items);
    setTransfers(tr);
  }, [shopId]);

  useEffect(() => {
    load().catch((error) => console.error(error));
  }, [load]);

  const owner = members.find((m) => m.roles.includes('SHOP_OWNER'));
  const candidates = members.filter((m) => m.status === 'ACTIVE' && !m.roles.includes('SHOP_OWNER'));
  const pending = transfers.find((tr) => tr.status === 'PENDING');
  const nameOf = (userId) => members.find((m) => m.userId === userId)?.displayName ?? '—';

  const run = async (action, key) => {
    setBusy(true);
    try {
      await action();
      onNotify?.('success', t(key));
      setConfirm(false);
      await load();
    } catch (error) {
      console.error(error);
      onNotify?.('error', t(ERROR_KEYS[error?.code] ?? 'account.actionError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="seller-grid-2">
        <section className="account-card">
          <h2 className="account-card__title seller-section-title">
            <Icon name="shield" size={18} />
            {t('seller.ownership.formTitle')}
          </h2>
          {!isOwner ? (
            <p className="seller-note seller-note--warning">
              <Icon name="alert" size={18} />
              <span>{t('seller.ownership.errors.ownerOnly')}</span>
            </p>
          ) : pending ? (
            <p className="seller-note">
              <Icon name="clock" size={18} />
              <span>{t('seller.ownership.pendingNote', { name: pending.toUserName ?? nameOf(pending.toUserId), date: formatDateTime(pending.expiresAt, language) })}</span>
            </p>
          ) : candidates.length === 0 ? (
            <EmptyState icon="user" title={t('seller.ownership.noCandidates')} text={t('seller.ownership.noCandidatesText')} />
          ) : (
            <div className="seller-form">
              <p className="seller-note seller-note--warning">
                <Icon name="alert" size={18} />
                <span>{t('seller.ownership.warning')}</span>
              </p>
              <Select
                label={t('seller.ownership.newOwner')}
                placeholder={t('addresses.choose')}
                options={candidates.map((m) => ({ id: m.userId, name: `${m.displayName} — ${m.email}` }))}
                value={target}
                onChange={setTarget}
              />
              <label className="switch">
                <span className="switch__text">
                  <strong>{t('seller.ownership.keepManager')}</strong>
                  <span className="account-muted">{t('seller.ownership.keepManagerHint')}</span>
                </span>
                <input type="checkbox" role="switch" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
              </label>
              <div className="seller-form__actions">
                <Button disabled={!target} onClick={() => setConfirm(true)}>
                  {t('seller.ownership.send')}
                </Button>
              </div>
            </div>
          )}
        </section>

        <section className="account-card">
          <h2 className="account-card__title seller-section-title">
            <Icon name="user" size={18} />
            {t('seller.ownership.currentOwner')}
          </h2>
          {owner && (
            <div className="cell-product">
              <span className="seller-avatar" style={{ width: 44, height: 44 }} aria-hidden="true">
                {owner.displayName.charAt(0).toUpperCase()}
              </span>
              <span>
                <strong>{owner.displayName}</strong>
                <span className="cell-sub">{owner.email}</span>
              </span>
            </div>
          )}
          <p className="cell-sub ownership-rules">{t('seller.ownership.rules')}</p>
        </section>
      </div>

      <section className="account-card seller-card">
        <div className="seller-toolbar">
          <h2 className="account-card__title">{t('seller.ownership.history')}</h2>
        </div>
        <div className="seller-table-wrap">
          <table className="seller-table">
            <thead>
              <tr>
                <th>{t('seller.ownership.columns.to')}</th>
                <th>{t('seller.ownership.columns.keep')}</th>
                <th>{t('seller.products.columns.status')}</th>
                <th>{t('seller.ownership.columns.created')}</th>
                <th>{t('seller.ownership.columns.expires')}</th>
                <th className="actions">{t('seller.products.columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((tr) => (
                <tr key={tr.id}>
                  <td>{tr.toUserName ?? nameOf(tr.toUserId)}</td>
                  <td>{tr.keepPreviousOwnerAsManager ? t('seller.ownership.yes') : t('seller.ownership.no')}</td>
                  <td>
                    <StatusBadge tone={statusTone(tr.status)}>{t(`seller.transferStatus.${tr.status}`)}</StatusBadge>
                  </td>
                  <td>{formatDateTime(tr.createdAt, language)}</td>
                  <td>{formatDateTime(tr.expiresAt, language)}</td>
                  <td className="actions">
                    {tr.status === 'PENDING' && isOwner && (
                      <button type="button" className="text-btn text-btn--danger" disabled={busy} onClick={() => run(() => cancelOwnershipTransfer(tr.id), 'seller.ownership.cancelled')}>
                        {t('seller.ownership.cancel')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {transfers.length === 0 && (
                <tr>
                  <td colSpan={6} className="seller-table__empty">
                    {t('seller.ownership.noHistory')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        size="sm"
        title={t('seller.ownership.confirmTitle')}
        description={t('seller.ownership.confirmText', { name: nameOf(target) })}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              {t('common.cancel')}
            </Button>
            <Button className="btn--danger" disabled={busy} onClick={() => run(() => createOwnershipTransfer(shopId, { newOwnerUserId: target, keepPreviousOwnerAsManager: keep }), 'seller.ownership.sent')}>
              {t('seller.ownership.send')}
            </Button>
          </>
        }
      >
        <p className="account-muted">{keep ? t('seller.ownership.afterKeep') : t('seller.ownership.afterLeave')}</p>
      </Dialog>
    </>
  );
}

/**
 * /seller/ownership — Chuyển quyền sở hữu shop (chỉ chủ shop):
 * chọn 1 nhân viên đang hoạt động • giữ mình làm Quản lý hay rời shop • gửi yêu cầu (hết hạn sau 7 ngày) •
 * lịch sử chuyển nhượng + hủy yêu cầu đang chờ. Người nhận chấp nhận ở trang Lời mời.
 */
function OwnershipScreen({ onNotify }) {
  const { t } = useLanguage();
  const { shopId } = useSeller();
  return (
    <SellerPage title={t('seller.ownership.title')} subtitle={t('seller.ownership.subtitle')}>
      <RequireShop>
        <Ownership key={shopId} shopId={shopId} onNotify={onNotify} />
      </RequireShop>
    </SellerPage>
  );
}

export default OwnershipScreen;
