import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button';
import Dialog from '../../../components/common/Dialog';
import Input from '../../../components/common/Input';
import StatusBadge from '../../../components/common/StatusBadge';
import { useLanguage } from '../../../hooks/useLanguage';
import { getShops, moderateShop, SHOP_STATUSES, updateShopFinanceSettings } from '../../../services/admin/platformService';
import { formatDateTime, statusTone } from '../../../utils/status';
import AdminPage from '../components/AdminPage';
import { ListState, Pager, ReasonDialog, StatusTabs, useErrorText } from '../components/AdminParts';
import { useAdminList } from '../components/useAdminList';

// Hành động hợp lệ theo trạng thái shop
const ACTIONS_BY_STATUS = { ACTIVE: ['SUSPEND', 'CLOSE'], SUSPENDED: ['REACTIVATE', 'CLOSE'], DRAFT: ['CLOSE'] };

// Backend chưa có API cho admin ĐỌC cấu hình phí của shop (chỉ có PUT cần expectedVersion).
// -> nhớ version của lần sửa gần nhất trên trình duyệt; chưa sửa lần nào thì dùng 0.
const versionKey = (shopId) => `fc-admin-fee-version:${shopId}`;
const readVersion = (shopId) => {
  try {
    return Number(localStorage.getItem(versionKey(shopId)) ?? 0);
  } catch {
    return 0;
  }
};

function FeeDialog({ shop, onClose, onNotify }) {
  const { t } = useLanguage();
  const errorText = useErrorText();
  const [form, setForm] = useState({ percent: '5', minimumPayoutMinor: '100000' });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const result = await updateShopFinanceSettings(shop.id, {
        platformFeeRateBp: Math.round(Number(form.percent) * 100),
        minimumPayoutMinor: Number(form.minimumPayoutMinor),
        expectedVersion: readVersion(shop.id),
      });
      try {
        localStorage.setItem(versionKey(shop.id), String(result.version));
      } catch {
        /* bỏ qua */
      }
      onNotify?.('success', t('market.admin.shops.feeSaved'));
      onClose();
    } catch (error) {
      onNotify?.('error', String(error?.code ?? '').includes('VERSION') ? t('market.admin.shops.feeVersionConflict') : errorText(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={Boolean(shop)}
      onClose={onClose}
      size="sm"
      title={t('market.admin.shops.feeTitle', { name: shop?.name })}
      description={t('market.admin.shops.feeHint')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button disabled={busy || !(Number(form.percent) >= 0 && Number(form.percent) <= 50) || !(Number(form.minimumPayoutMinor) > 0)} onClick={save}>{t('common.save')}</Button>
        </>
      }
    >
      <Input label={t('market.admin.shops.feePercent')} type="number" min="0" max="50" step="0.1" value={form.percent} onChange={(e) => setForm((f) => ({ ...f, percent: e.target.value }))} />
      <Input label={t('market.admin.shops.minPayout')} type="number" min="1" value={form.minimumPayoutMinor} onChange={(e) => setForm((f) => ({ ...f, minimumPayoutMinor: e.target.value }))} />
    </Dialog>
  );
}

/** /admin/shops — Danh sách shop trên sàn, tạm khoá / mở lại / đóng shop, chỉnh phí sàn. */
function ShopModerationScreen({ onNotify }) {
  const { t, language } = useLanguage();
  const errorText = useErrorText();
  const [params, setParams] = useSearchParams();
  const status = SHOP_STATUSES.includes(params.get('status')) ? params.get('status') : '';
  const list = useAdminList(getShops, { status });
  const [action, setAction] = useState(null); // { shop, action }
  const [feeShop, setFeeShop] = useState(null);

  const confirm = async ({ reason }) => {
    try {
      await moderateShop(action.shop.id, { action: action.action, reason });
      onNotify?.('success', t('market.admin.shops.done'));
      setAction(null);
      list.reload();
    } catch (error) {
      onNotify?.('error', errorText(error));
    }
  };

  return (
    <AdminPage title={t('market.admin.shops.title')} subtitle={t('market.admin.shops.subtitle')}>
      <StatusTabs value={status} options={SHOP_STATUSES} onChange={(v) => setParams(v ? { status: v } : {}, { replace: true })} labelPrefix="seller.shopStatus" allLabel={t('orders.tabs.all')} />
      <section className="account-card admin-card">
        <ListState status={list.status} onRetry={list.reload} />
        {list.status === 'success' && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('market.admin.sellerReviews.shop')}</th>
                  <th>{t('seller.orders.columns.status')}</th>
                  <th>{t('market.admin.shops.activatedAt')}</th>
                  <th className="actions">{t('seller.products.columns.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((shop) => (
                  <tr key={shop.id}>
                    <td><strong>{shop.name}</strong><span className="cell-sub">/{shop.slug}</span></td>
                    <td><StatusBadge tone={statusTone(shop.status)}>{t(`seller.shopStatus.${shop.status}`, { defaultValue: shop.status })}</StatusBadge></td>
                    <td>{formatDateTime(shop.activatedAt, language)}{shop.suspendedAt && <span className="cell-sub">{t('market.admin.shops.suspendedAt')}: {formatDateTime(shop.suspendedAt, language)}</span>}</td>
                    <td className="actions">
                      {(ACTIONS_BY_STATUS[shop.status] ?? []).map((a) => (
                        <button key={a} type="button" className="text-btn" onClick={() => setAction({ shop, action: a })}>{t(`market.admin.shops.actions.${a}`)}</button>
                      ))}{' '}
                      {shop.status === 'ACTIVE' && <button type="button" className="text-btn" onClick={() => setFeeShop(shop)}>{t('market.admin.shops.fee')}</button>}
                    </td>
                  </tr>
                ))}
                {list.items.length === 0 && <tr><td colSpan={4} className="admin-table__empty">{t('market.admin.empty')}</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={list.page} hasMore={list.hasMore} onChange={list.setPage} />
      </section>

      <ReasonDialog
        open={action !== null}
        title={action ? t(`market.admin.shops.actions.${action.action}`) + ` — ${action.shop.name}` : ''}
        confirmLabel={action ? t(`market.admin.shops.actions.${action.action}`) : ''}
        danger={action?.action !== 'REACTIVATE'}
        onClose={() => setAction(null)}
        onConfirm={confirm}
      />
      {feeShop && <FeeDialog shop={feeShop} onClose={() => setFeeShop(null)} onNotify={onNotify} />}
    </AdminPage>
  );
}

export default ShopModerationScreen;
