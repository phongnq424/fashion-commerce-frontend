import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/common/Button';
import Dialog from '../../../components/common/Dialog';
import Icon from '../../../components/common/Icon';
import Input from '../../../components/common/Input';
import StatusBadge from '../../../components/common/StatusBadge';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../hooks/useLanguage';
import { useSeller } from '../../../hooks/useSeller';
import { ASSIGNABLE_ROLES, getMembers, inviteMember, leaveShop, removeMember, updateMemberRoles } from '../../../services/seller/staffService';
import { formatDateTime, statusTone } from '../../../utils/status';
import RequireShop from '../components/RequireShop';
import SellerPage from '../components/SellerPage';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ERROR_KEYS = {
  SHOP_MEMBER_EXISTS: 'seller.staff.errors.exists',
  SHOP_ROLE_INVALID: 'seller.staff.errors.roles',
  SHOP_OWNER_ROLE_LOCKED: 'seller.staff.errors.ownerLocked',
  SHOP_OWNER_CANNOT_LEAVE: 'seller.staff.errors.ownerLeave',
};

// Danh sách vai trò có mô tả (chọn nhiều)
function RolePicker({ value, onChange }) {
  const { t } = useLanguage();
  return (
    <fieldset className="check-cards">
      <legend className="field__label">{t('seller.staff.roles')}</legend>
      {ASSIGNABLE_ROLES.map((role) => (
        <label key={role.code} className="check-card">
          <input
            type="checkbox"
            checked={value.includes(role.code)}
            onChange={() => onChange(value.includes(role.code) ? value.filter((c) => c !== role.code) : [...value, role.code])}
          />
          <span className="check-card__text">
            <strong>{t(`seller.roles.${role.code}`)}</strong>
            <span className="account-muted">{t(`seller.roleHints.${role.code}`)}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function StaffTable({ shopId, onNotify }) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOwner, refreshShops } = useSeller();
  const [members, setMembers] = useState([]);
  const [dialog, setDialog] = useState(null); // { type: invite|roles|remove|leave, member }
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setMembers((await getMembers(shopId)).items);
  }, [shopId]);

  useEffect(() => {
    load().catch((error) => console.error(error));
  }, [load]);

  const open = (type, member = null) => {
    setDialog({ type, member });
    setEmail('');
    setRoles(member ? member.roles : ['SHOP_ORDERS']);
  };

  const run = async (action, successKey) => {
    setBusy(true);
    try {
      await action();
      onNotify?.('success', t(successKey));
      setDialog(null);
      return true;
    } catch (error) {
      console.error(error);
      onNotify?.('error', t(ERROR_KEYS[error?.code] ?? 'account.actionError'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    const { type, member } = dialog;
    if (type === 'invite') {
      if (!EMAIL.test(email.trim())) return onNotify?.('warning', t('seller.errors.email'));
      if (await run(() => inviteMember(shopId, { email, roles }), 'seller.staff.toast.invited')) load();
    }
    if (type === 'roles' && (await run(() => updateMemberRoles(shopId, member.memberId, roles), 'seller.staff.toast.rolesUpdated'))) load();
    if (type === 'remove' && (await run(() => removeMember(shopId, member.memberId), 'seller.staff.toast.removed'))) load();
    if (type === 'leave' && (await run(() => leaveShop(shopId), 'seller.staff.toast.left'))) {
      await refreshShops();
      navigate('/seller');
    }
    return undefined;
  };

  const me = (member) => member.email.toLowerCase() === user?.email?.toLowerCase();
  const needsRoles = dialog && ['invite', 'roles'].includes(dialog.type);

  return (
    <>
      <section className="account-card seller-card">
        <div className="seller-toolbar">
          <h2 className="account-card__title">{t('seller.staff.listTitle', { count: members.length })}</h2>
          <div className="seller-toolbar__count staff-actions">
            {!isOwner && (
              <Button variant="outline" size="sm" className="btn--danger-outline" onClick={() => open('leave')}>
                {t('seller.staff.leave')}
              </Button>
            )}
            <Button size="sm" onClick={() => open('invite')}>
              + {t('seller.staff.invite')}
            </Button>
          </div>
        </div>
        <div className="seller-table-wrap">
          <table className="seller-table">
            <thead>
              <tr>
                <th>{t('seller.staff.columns.member')}</th>
                <th>{t('seller.staff.roles')}</th>
                <th>{t('seller.products.columns.status')}</th>
                <th>{t('seller.staff.columns.joined')}</th>
                <th className="actions">{t('seller.products.columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const owner = member.roles.includes('SHOP_OWNER');
                return (
                  <tr key={member.memberId}>
                    <td>
                      <div className="cell-product">
                        <span className="seller-avatar" style={{ width: 36, height: 36 }} aria-hidden="true">
                          {member.displayName.charAt(0).toUpperCase()}
                        </span>
                        <span>
                          <strong>{member.displayName}</strong>
                          {me(member) && <span className="cell-sub">{t('seller.staff.you')}</span>}
                          <span className="cell-sub">{member.email}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="role-chips">
                        {member.roles.map((role) => (
                          <span key={role} className={`role-chip ${role === 'SHOP_OWNER' ? 'role-chip--owner' : ''}`}>
                            {t(`seller.roles.${role}`)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <StatusBadge tone={statusTone(member.status)}>{t(`seller.memberStatus.${member.status}`)}</StatusBadge>
                    </td>
                    <td>{member.joinedAt ? formatDateTime(member.joinedAt, language) : t('seller.staff.invitedOn', { date: formatDateTime(member.createdAt, language) })}</td>
                    <td className="actions">
                      {!owner && !me(member) && (
                        <>
                          <button type="button" className="text-btn" onClick={() => open('roles', member)}>
                            {t('seller.staff.changeRoles')}
                          </button>
                          <button type="button" className="text-btn text-btn--danger" onClick={() => open('remove', member)}>
                            {member.status === 'INVITED' ? t('seller.staff.revoke') : t('seller.staff.remove')}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="account-card">
        <h2 className="account-card__title seller-section-title">
          <Icon name="shield" size={18} />
          {t('seller.staff.rolesGuide')}
        </h2>
        <dl className="info-list">
          {['SHOP_OWNER', ...ASSIGNABLE_ROLES.map((r) => r.code)].map((code) => (
            <div key={code} className="info-list__row">
              <dt>{t(`seller.roles.${code}`)}</dt>
              <dd>{t(`seller.roleHints.${code}`)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Dialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        size={needsRoles ? 'md' : 'sm'}
        title={dialog ? t(`seller.staff.dialogs.${dialog.type}`, { name: dialog.member?.displayName ?? '' }) : ''}
        description={dialog?.type === 'leave' ? t('seller.staff.leaveText') : dialog?.type === 'remove' ? t('seller.staff.removeText') : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              {t('common.cancel')}
            </Button>
            <Button className={['remove', 'leave'].includes(dialog?.type) ? 'btn--danger' : ''} disabled={busy || (needsRoles && roles.length === 0)} onClick={submit}>
              {busy ? t('common.saving') : t(`seller.staff.confirm.${dialog?.type ?? 'invite'}`)}
            </Button>
          </>
        }
      >
        {needsRoles && (
          <div className="seller-form">
            {dialog.type === 'invite' && <Input label={t('seller.fields.email')} type="email" value={email} placeholder="nhanvien@gmail.com" hint={t('seller.staff.inviteHint')} onChange={(e) => setEmail(e.target.value)} />}
            <RolePicker value={roles} onChange={setRoles} />
          </div>
        )}
      </Dialog>
    </>
  );
}

/**
 * /seller/staff — Nhân viên shop (GET /shops/{shopId}/members):
 * mời nhân viên bằng email + chọn vai trò • đổi vai trò • xoá / thu hồi lời mời • tự rời shop (nếu không phải chủ).
 */
function StaffScreen({ onNotify }) {
  const { t } = useLanguage();
  const { shopId } = useSeller();
  return (
    <SellerPage title={t('seller.staff.title')} subtitle={t('seller.staff.subtitle')}>
      <RequireShop>
        <StaffTable key={shopId} shopId={shopId} onNotify={onNotify} />
      </RequireShop>
    </SellerPage>
  );
}

export default StaffScreen;
