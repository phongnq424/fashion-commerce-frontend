import { useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import Dialog from '../../../components/common/Dialog';
import Icon from '../../../components/common/Icon';
import StatusBadge from '../../../components/common/StatusBadge';
import { useLanguage } from '../../../hooks/useLanguage';
import { assignRole, getRoles, getUser, getUsers, removeRole, setUserActive, USER_STATUSES } from '../../../services/admin/platformService';
import { formatDateTime, statusTone } from '../../../utils/status';
import AdminPage from '../components/AdminPage';
import { ListState, Pager, ReasonDialog, StatusTabs, useErrorText } from '../components/AdminParts';
import { useAdminList } from '../components/useAdminList';

// Chi tiết 1 tài khoản: trạng thái + gán / gỡ vai trò cấp sàn
function UserDialog({ userId, onClose, onChanged, onNotify }) {
  const { t, language } = useLanguage();
  const errorText = useErrorText();
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [statusAction, setStatusAction] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setUser(null);
    Promise.all([getUser(userId), getRoles().catch(() => [])])
      .then(([u, r]) => {
        setUser(u);
        setRoles(r.filter((role) => role.active));
      })
      .catch((error) => onNotify?.('error', errorText(error)));
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleRole = async (role) => {
    setBusy(true);
    try {
      const updated = user.roles.includes(role.code) ? await removeRole(user.id, role.id) : await assignRole(user.id, role.id);
      setUser(updated);
      onChanged();
    } catch (error) {
      onNotify?.('error', errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async ({ reason }) => {
    try {
      const updated = await setUserActive(user, user.status !== 'ACTIVE', reason);
      setUser(updated);
      setStatusAction(false);
      onChanged();
      onNotify?.('success', t('market.admin.users.statusChanged'));
    } catch (error) {
      onNotify?.('error', errorText(error));
    }
  };

  return (
    <Dialog open={Boolean(userId)} onClose={onClose} size="lg" title={user?.displayName ?? user?.email ?? t('market.admin.users.title')}>
      {!user ? (
        <div className="account-skeleton" />
      ) : (
        <>
          <dl className="checkout-review">
            <div className="checkout-review__row"><dt>Email</dt><dd>{user.email}{user.emailVerifiedAt && ' ✓'}</dd></div>
            <div className="checkout-review__row"><dt>{t('seller.fields.phone')}</dt><dd>{user.phone ?? '—'}</dd></div>
            <div className="checkout-review__row"><dt>{t('seller.orders.columns.status')}</dt><dd><StatusBadge tone={statusTone(user.status)}>{t(`market.userStatus.${user.status}`, { defaultValue: user.status })}</StatusBadge>{user.statusReason && <span className="cell-sub">{user.statusReason}</span>}</dd></div>
            <div className="checkout-review__row"><dt>{t('market.admin.users.lastLogin')}</dt><dd>{formatDateTime(user.lastLoginAt, language)}</dd></div>
            <div className="checkout-review__row"><dt>{t('market.admin.users.createdAt')}</dt><dd>{formatDateTime(user.createdAt, language)}</dd></div>
          </dl>
          <Button variant="outline" size="sm" className={user.status === 'ACTIVE' ? 'btn--danger-outline' : undefined} onClick={() => setStatusAction(true)}>
            {t(user.status === 'ACTIVE' ? 'market.admin.users.suspend' : 'market.admin.users.activate')}
          </Button>
          <h3 className="account-card__title admin-section-title"><Icon name="shield" size={16} />{t('market.admin.users.platformRoles')}</h3>
          <div className="voucher__chips">
            {roles.map((role) => (
              <label key={role.id} className="check-row">
                <input type="checkbox" disabled={busy} checked={user.roles.includes(role.code)} onChange={() => toggleRole(role)} />
                {role.name} <code className="sku">{role.code}</code>
              </label>
            ))}
          </div>
        </>
      )}
      <ReasonDialog
        open={statusAction}
        title={user ? t(user.status === 'ACTIVE' ? 'market.admin.users.suspend' : 'market.admin.users.activate') : ''}
        confirmLabel={user ? t(user.status === 'ACTIVE' ? 'market.admin.users.suspend' : 'market.admin.users.activate') : ''}
        danger={user?.status === 'ACTIVE'}
        onClose={() => setStatusAction(false)}
        onConfirm={changeStatus}
      />
    </Dialog>
  );
}

/** /admin/users — Tài khoản trên sàn: tìm, khoá / mở khoá, gán vai trò quản trị. */
function UserListScreen({ onNotify }) {
  const { t, language } = useLanguage();
  const [status, setStatus] = useState('');
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const list = useAdminList(getUsers, { status, query });
  const [openId, setOpenId] = useState(null);

  return (
    <AdminPage title={t('market.admin.users.title')} subtitle={t('market.admin.users.subtitle')}>
      <StatusTabs value={status} options={USER_STATUSES} onChange={setStatus} labelPrefix="market.userStatus" allLabel={t('orders.tabs.all')} />
      <section className="account-card admin-card">
        <form className="admin-toolbar" onSubmit={(e) => { e.preventDefault(); setQuery(input.trim()); }}>
          <label className="admin-search">
            <Icon name="search" size={18} />
            <input type="search" value={input} placeholder={t('market.admin.users.search')} aria-label={t('market.admin.users.search')} onChange={(e) => setInput(e.target.value)} />
          </label>
        </form>
        <ListState status={list.status} onRetry={list.reload} />
        {list.status === 'success' && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('market.admin.users.account')}</th>
                  <th>{t('market.admin.users.platformRoles')}</th>
                  <th>{t('seller.orders.columns.status')}</th>
                  <th>{t('market.admin.users.lastLogin')}</th>
                  <th className="actions" />
                </tr>
              </thead>
              <tbody>
                {list.items.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.displayName}</strong><span className="cell-sub">{u.email}{u.phone && ` · ${u.phone}`}</span></td>
                    <td>{u.roles.join(', ') || '—'}</td>
                    <td><StatusBadge tone={statusTone(u.status)}>{t(`market.userStatus.${u.status}`, { defaultValue: u.status })}</StatusBadge></td>
                    <td>{formatDateTime(u.lastLoginAt, language)}</td>
                    <td className="actions"><button type="button" className="text-btn" onClick={() => setOpenId(u.id)}>{t('market.admin.view')}</button></td>
                  </tr>
                ))}
                {list.items.length === 0 && <tr><td colSpan={5} className="admin-table__empty">{t('market.admin.empty')}</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={list.page} hasMore={list.hasMore} onChange={list.setPage} />
      </section>
      <UserDialog userId={openId} onClose={() => setOpenId(null)} onChanged={list.reload} onNotify={onNotify} />
    </AdminPage>
  );
}

export default UserListScreen;
