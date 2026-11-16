import { useCallback, useEffect, useState } from 'react';
import StatusBadge from '../../../components/common/StatusBadge';
import { useLanguage } from '../../../hooks/useLanguage';
import { getRoles, setRoleActive } from '../../../services/admin/platformService';
import AdminPage from '../components/AdminPage';
import { ListState, ReasonDialog, useErrorText } from '../components/AdminParts';

/** /admin/roles — Vai trò cấp sàn và quyền của từng vai trò (GET /admin/roles), bật / tắt vai trò không phải hệ thống. */
function RoleListScreen({ onNotify }) {
  const { t } = useLanguage();
  const errorText = useErrorText();
  const [roles, setRoles] = useState([]);
  const [status, setStatus] = useState('loading');
  const [target, setTarget] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setRoles(await getRoles());
      setStatus('success');
    } catch (error) {
      setStatus(error?.status === 403 ? 'forbidden' : 'error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const confirm = async ({ reason }) => {
    try {
      await setRoleActive(target, !target.active, reason);
      setTarget(null);
      load();
    } catch (error) {
      onNotify?.('error', errorText(error));
    }
  };

  return (
    <AdminPage title={t('market.admin.roles.title')} subtitle={t('market.admin.roles.subtitle')}>
      <section className="account-card admin-card">
        <ListState status={status} onRetry={load} />
        {status === 'success' && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('market.admin.roles.role')}</th>
                  <th>{t('market.admin.roles.permissions')}</th>
                  <th>{t('seller.orders.columns.status')}</th>
                  <th className="actions" />
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id}>
                    <td><strong>{role.name}</strong><span className="cell-sub"><code className="sku">{role.code}</code>{role.system && ` · ${t('market.admin.roles.system')}`}</span></td>
                    <td><span className="cell-sub">{role.permissions.join(', ') || '—'}</span></td>
                    <td><StatusBadge tone={role.active ? 'success' : 'muted'}>{t(role.active ? 'market.vouchers.active' : 'market.vouchers.inactive')}</StatusBadge></td>
                    <td className="actions">
                      {!role.system && (
                        <button type="button" className="text-btn" onClick={() => setTarget(role)}>{t(role.active ? 'market.vouchers.deactivate' : 'market.vouchers.activate')}</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <ReasonDialog
        open={target !== null}
        title={target?.name ?? ''}
        confirmLabel={target ? t(target.active ? 'market.vouchers.deactivate' : 'market.vouchers.activate') : ''}
        danger={target?.active}
        onClose={() => setTarget(null)}
        onConfirm={confirm}
      />
    </AdminPage>
  );
}

export default RoleListScreen;
