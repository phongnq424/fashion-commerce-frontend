import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import StatusBadge from '../../../components/common/StatusBadge';
import { useLanguage } from '../../../hooks/useLanguage';
import { useSeller } from '../../../hooks/useSeller';
import {
  acceptInvitation,
  acceptOwnershipTransfer,
  declineInvitation,
  getIncomingTransfers,
  getMyInvitations,
  rejectOwnershipTransfer,
} from '../../../services/seller/staffService';
import { formatDateTime, statusTone } from '../../../utils/status';
import SellerPage from '../components/SellerPage';

/**
 * /seller/invitations — Lời mời gửi TỚI tôi (không cần có shop):
 *   • Lời mời làm nhân viên shop (GET /shop-invitations) -> Chấp nhận / Từ chối
 *   • Yêu cầu nhận quyền sở hữu shop (GET /shop-ownership-transfers) -> Chấp nhận / Từ chối
 * Chấp nhận xong, shop đó xuất hiện trong bộ chọn shop.
 */
function InvitationsScreen({ onNotify }) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { refreshShops, selectShop } = useSeller();
  const [invitations, setInvitations] = useState(null);
  const [transfers, setTransfers] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    const [inv, tr] = await Promise.all([getMyInvitations(), getIncomingTransfers()]);
    setInvitations(inv);
    setTransfers(tr);
  }, []);

  useEffect(() => {
    load().catch((error) => console.error(error));
  }, [load]);

  const run = async (id, action, key, goShopId) => {
    setBusy(id);
    try {
      await action();
      onNotify?.('success', t(key));
      await Promise.all([load(), refreshShops()]);
      if (goShopId) {
        selectShop(goShopId);
        navigate('/seller');
      }
    } catch (error) {
      console.error(error);
      onNotify?.('error', t('account.actionError'));
    } finally {
      setBusy(null);
    }
  };

  if (!invitations || !transfers) return <div className="account-skeleton" />;
  const pendingTransfers = transfers.filter((tr) => tr.status === 'PENDING');
  const pastTransfers = transfers.filter((tr) => tr.status !== 'PENDING');

  return (
    <SellerPage title={t('seller.invitations.title')} subtitle={t('seller.invitations.subtitle')}>
      <section className="account-card">
        <h2 className="account-card__title seller-section-title">
          <Icon name="mail" size={18} />
          {t('seller.invitations.staffTitle', { count: invitations.length })}
        </h2>
        {invitations.length === 0 ? (
          <EmptyState icon="mail" title={t('seller.invitations.noStaff')} />
        ) : (
          <ul className="invite-list">
            {invitations.map((inv) => (
              <li key={inv.memberId} className="invite-item">
                <span className="seller-avatar" style={{ width: 44, height: 44 }} aria-hidden="true">
                  {inv.shopName.charAt(0)}
                </span>
                <div className="invite-item__text">
                  <p>
                    <strong>{inv.shopName}</strong> {t('seller.invitations.invitesYou')}
                  </p>
                  <div className="role-chips">
                    {inv.roles.map((role) => (
                      <span key={role} className="role-chip">
                        {t(`seller.roles.${role}`)}
                      </span>
                    ))}
                  </div>
                  <span className="cell-sub">{formatDateTime(inv.createdAt, language)}</span>
                </div>
                <div className="invite-item__actions">
                  <Button variant="outline" size="sm" disabled={busy === inv.memberId} onClick={() => run(inv.memberId, () => declineInvitation(inv.memberId), 'seller.invitations.declined')}>
                    {t('seller.invitations.decline')}
                  </Button>
                  <Button size="sm" disabled={busy === inv.memberId} onClick={() => run(inv.memberId, () => acceptInvitation(inv.memberId), 'seller.invitations.accepted', inv.shopId)}>
                    {t('seller.invitations.accept')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="account-card">
        <h2 className="account-card__title seller-section-title">
          <Icon name="shield" size={18} />
          {t('seller.invitations.transferTitle', { count: pendingTransfers.length })}
        </h2>
        {pendingTransfers.length === 0 ? (
          <EmptyState icon="shield" title={t('seller.invitations.noTransfer')} />
        ) : (
          <ul className="invite-list">
            {pendingTransfers.map((tr) => (
              <li key={tr.id} className="invite-item">
                <span className="seller-avatar" style={{ width: 44, height: 44 }} aria-hidden="true">
                  {tr.shopName.charAt(0)}
                </span>
                <div className="invite-item__text">
                  <p>{t('seller.invitations.transferText', { name: tr.fromOwnerName ?? '—', shop: tr.shopName })}</p>
                  <span className="cell-sub">
                    {tr.keepPreviousOwnerAsManager ? t('seller.invitations.keepsManager') : t('seller.invitations.leaves')} ·{' '}
                    {t('seller.invitations.expires', { date: formatDateTime(tr.expiresAt, language) })}
                  </span>
                </div>
                <div className="invite-item__actions">
                  <Button variant="outline" size="sm" disabled={busy === tr.id} onClick={() => run(tr.id, () => rejectOwnershipTransfer(tr.id), 'seller.invitations.rejected')}>
                    {t('seller.invitations.decline')}
                  </Button>
                  <Button size="sm" disabled={busy === tr.id} onClick={() => run(tr.id, () => acceptOwnershipTransfer(tr.id), 'seller.invitations.transferAccepted', tr.shopId)}>
                    {t('seller.invitations.acceptOwnership')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {pastTransfers.length > 0 && (
          <ul className="invite-history">
            {pastTransfers.map((tr) => (
              <li key={tr.id}>
                {tr.shopName} · <StatusBadge tone={statusTone(tr.status)}>{t(`seller.transferStatus.${tr.status}`)}</StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </SellerPage>
  );
}

export default InvitationsScreen;
