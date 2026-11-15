import { useCallback, useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import Dialog from '../../../components/common/Dialog';
import Icon from '../../../components/common/Icon';
import Input from '../../../components/common/Input';
import StatusBadge from '../../../components/common/StatusBadge';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAdmin } from '../../../hooks/useAdmin';
import { ASSIGNABLE_ROLES, getMembers, inviteMember, removeMember, updateMemberRoles } from '../../../services/admin/staffService';
import { formatDateTime, statusTone } from '../../../utils/status';
import RequireShop from '../components/RequireShop';
import AdminPage from '../components/AdminPage';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ERROR_KEYS = {
  SHOP_MEMBER_EXISTS: 'admin.staff.errors.exists',
  SHOP_ROLE_INVALID: 'admin.staff.errors.roles',
  SHOP_OWNER_ROLE_LOCKED: 'admin.staff.errors.ownerLocked',
};

// Danh sách vai trò có mô tả (chọn nhiều)
function RolePicker({ value, onChange }) {
  const { t } = useLanguage();
  return (
    <fieldset className="check-cards">
      <legend className="field__label">{t('admin.staff.roles')}</legend>
      {ASSIGNABLE_ROLES.map((role) => (
        <label key={role.code} className="check-card">
          <input
            type="checkbox"
            checked={value.includes(role.code)}
            onChange={() => onChange(value.includes(role.code) ? value.filter((c) => c !== role.code) : [...value, role.code])}
          />
          <span className="check-card__text">
            <strong>{t(`admin.roles.${role.code}`)}</strong>
            <span className="account-muted">{t(`admin.roleHints.${role.code}`)}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function StaffTable({ shopId, onNotify }) {
  const { t, language } = useLanguage();
  const { admin } = useAdmin();
  const [members, setMembers] = useState([]);
  const [dialog, setDialog] = useState(null); // { type: invite|roles|remove, member }
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
      if (!EMAIL.test(email.trim())) return onNotify?.('warning', t('admin.errors.email'));
      if (await run(() => inviteMember(shopId, { email, roles }), 'admin.staff.toast.invited')) load();
    }
    if (type === 'roles' && (await run(() => updateMemberRoles(shopId, member.memberId, roles), 'admin.staff.toast.rolesUpdated'))) load();
    if (type === 'remove' && (await run(() => removeMember(shopId, member.memberId), 'admin.staff.toast.removed'))) load();
    return undefined;
  };

  const me = (member) => member.email.toLowerCase() === admin?.email?.toLowerCase();
  const needsRoles = dialog && ['invite', 'roles'].includes(dialog.type);

  return (
    <>
      <section className="account-card admin-card">
        <div className="admin-toolbar">
          <h2 className="account-card__title">{t('admin.staff.listTitle', { count: members.length })}</h2>
          <div className="admin-toolbar__count staff-actions">
            <Button size="sm" onClick={() => open('invite')}>
              + {t('admin.staff.invite')}
            </Button>
          </div>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.staff.columns.member')}</th>
                <th>{t('admin.staff.roles')}</th>
                <th>{t('admin.products.columns.status')}</th>
                <th>{t('admin.staff.columns.joined')}</th>
                <th className="actions">{t('admin.products.columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const owner = member.roles.includes('SHOP_OWNER');
                return (
                  <tr key={member.memberId}>
                    <td>
                      <div className="cell-product">
                        <span className="admin-avatar" style={{ width: 36, height: 36 }} aria-hidden="true">
                          {member.displayName.charAt(0).toUpperCase()}
                        </span>
                        <span>
                          <strong>{member.displayName}</strong>
                          {me(member) && <span className="cell-sub">{t('admin.staff.you')}</span>}
                          <span className="cell-sub">{member.email}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="role-chips">
                        {member.roles.map((role) => (
                          <span key={role} className={`role-chip ${role === 'SHOP_OWNER' ? 'role-chip--owner' : ''}`}>
                            {t(`admin.roles.${role}`)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <StatusBadge tone={statusTone(member.status)}>{t(`admin.memberStatus.${member.status}`)}</StatusBadge>
                    </td>
                    <td>{member.joinedAt ? formatDateTime(member.joinedAt, language) : t('admin.staff.invitedOn', { date: formatDateTime(member.createdAt, language) })}</td>
                    <td className="actions">
                      {!owner && !me(member) && (
                        <>
                          <button type="button" className="text-btn" onClick={() => open('roles', member)}>
                            {t('admin.staff.changeRoles')}
                          </button>
                          <button type="button" className="text-btn text-btn--danger" onClick={() => open('remove', member)}>
                            {member.status === 'INVITED' ? t('admin.staff.revoke') : t('admin.staff.remove')}
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
        <h2 className="account-card__title admin-section-title">
          <Icon name="shield" size={18} />
          {t('admin.staff.rolesGuide')}
        </h2>
        <dl className="info-list">
          {['SHOP_OWNER', ...ASSIGNABLE_ROLES.map((r) => r.code)].map((code) => (
            <div key={code} className="info-list__row">
              <dt>{t(`admin.roles.${code}`)}</dt>
              <dd>{t(`admin.roleHints.${code}`)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Dialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        size={needsRoles ? 'md' : 'sm'}
        title={dialog ? t(`admin.staff.dialogs.${dialog.type}`, { name: dialog.member?.displayName ?? '' }) : ''}
        description={dialog?.type === 'remove' ? t('admin.staff.removeText') : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              {t('common.cancel')}
            </Button>
            <Button className={dialog?.type === 'remove' ? 'btn--danger' : ''} disabled={busy || (needsRoles && roles.length === 0)} onClick={submit}>
              {busy ? t('common.saving') : t(`admin.staff.confirm.${dialog?.type ?? 'invite'}`)}
            </Button>
          </>
        }
      >
        {needsRoles && (
          <div className="admin-form">
            {dialog.type === 'invite' && <Input label={t('admin.fields.email')} type="email" value={email} placeholder="nhanvien@gmail.com" hint={t('admin.staff.inviteHint')} onChange={(e) => setEmail(e.target.value)} />}
            <RolePicker value={roles} onChange={setRoles} />
          </div>
        )}
      </Dialog>
    </>
  );
}

/**
 * /admin/staff — Nhân viên cửa hàng (GET /shops/{shopId}/members):
 * thêm nhân viên bằng email + chọn vai trò • đổi vai trò • xoá / thu hồi lời mời.
 */
function StaffScreen({ onNotify }) {
  const { t } = useLanguage();
  const { shopId } = useAdmin();
  return (
    <AdminPage title={t('admin.staff.title')} subtitle={t('admin.staff.subtitle')}>
      <RequireShop>
        <StaffTable key={shopId} shopId={shopId} onNotify={onNotify} />
      </RequireShop>
    </AdminPage>
  );
}

export default StaffScreen;
