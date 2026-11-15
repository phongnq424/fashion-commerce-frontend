import { useCallback, useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import Input from '../../../components/common/Input';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAdmin } from '../../../hooks/useAdmin';
import { getSettings, getShopShippingProviders, updateSettings } from '../../../services/admin/shopService';
import { formatPrice } from '../../../utils/format';
import RequireShop from '../components/RequireShop';
import AdminPage from '../components/AdminPage';

const digits = (value) => String(value ?? '').replace(/\D/g, '');

function SettingsForm({ shopId, onNotify }) {
  const { t, language } = useLanguage();
  const [form, setForm] = useState(null);
  const [providers, setProviders] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [settings, list] = await Promise.all([getSettings(shopId), getShopShippingProviders(shopId)]);
    setForm({ ...settings, handlingDays: String(settings.handlingDays), returnWindowDays: String(settings.returnWindowDays), defaultShippingFeeMinor: String(settings.defaultShippingFeeMinor) });
    setProviders(list);
  }, [shopId]);

  useEffect(() => {
    load().catch((error) => console.error(error));
  }, [load]);

  if (!form) return <div className="account-skeleton" />;

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateSettings(shopId, {
        handlingDays: Number(form.handlingDays),
        returnWindowDays: Number(form.returnWindowDays),
        defaultShippingFeeMinor: Number(form.defaultShippingFeeMinor),
        allowCod: form.allowCod,
        autoAcceptOrders: form.autoAcceptOrders,
      });
      onNotify?.('success', t('admin.settings.saved'));
    } catch (error) {
      console.error(error);
      onNotify?.('error', t(error?.code === 'SHOP_SETTINGS_INVALID' ? 'admin.settings.invalid' : 'account.actionError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="admin-grid-2" onSubmit={save} noValidate>
      <div className="admin-detail__main">
        <section className="account-card">
          <h2 className="account-card__title admin-section-title">
            <Icon name="truck" size={18} />
            {t('admin.settings.orderTitle')}
          </h2>
          <div className="admin-form">
            <div className="admin-form__row">
              <Input label={t('admin.settings.handlingDays')} inputMode="numeric" value={form.handlingDays} hint={t('admin.settings.handlingHint')} onChange={(e) => setForm({ ...form, handlingDays: digits(e.target.value) })} />
              <Input label={t('admin.settings.returnDays')} inputMode="numeric" value={form.returnWindowDays} hint={t('admin.settings.returnHint')} onChange={(e) => setForm({ ...form, returnWindowDays: digits(e.target.value) })} />
            </div>
            <Input
              label={t('admin.settings.shippingFee')}
              inputMode="numeric"
              value={form.defaultShippingFeeMinor}
              hint={t('admin.settings.shippingFeeHint', { value: formatPrice(Number(form.defaultShippingFeeMinor) || 0, language) })}
              onChange={(e) => setForm({ ...form, defaultShippingFeeMinor: digits(e.target.value) })}
            />
            <label className="switch">
              <span className="switch__text">
                <strong>{t('admin.settings.allowCod')}</strong>
                <span className="account-muted">{t('admin.settings.allowCodHint')}</span>
              </span>
              <input type="checkbox" role="switch" checked={form.allowCod} onChange={(e) => setForm({ ...form, allowCod: e.target.checked })} />
            </label>
            <label className="switch">
              <span className="switch__text">
                <strong>{t('admin.settings.autoAccept')}</strong>
                <span className="account-muted">{t('admin.settings.autoAcceptHint')}</span>
              </span>
              <input type="checkbox" role="switch" checked={form.autoAcceptOrders} onChange={(e) => setForm({ ...form, autoAcceptOrders: e.target.checked })} />
            </label>
            <div className="admin-form__actions">
              <Button type="submit" disabled={saving}>
                {saving ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </div>
        </section>
      </div>
      <section className="account-card">
        <h2 className="account-card__title admin-section-title">
          <Icon name="package" size={18} />
          {t('admin.settings.carriersTitle')}
        </h2>
        <ul className="carrier-list">
          {providers.map((provider) => (
            <li key={provider.code}>
              <Icon name="check" size={16} />
              <span>
                <strong>{provider.name}</strong>
                <span className="cell-sub">{provider.description}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="cell-sub">{t('admin.settings.carriersNote')}</p>
      </section>
    </form>
  );
}

/**
 * /admin/settings — Cài đặt bán hàng (GET / PUT /shops/{shopId}/settings):
 * số ngày chuẩn bị hàng, số ngày cho phép trả hàng, phí ship mặc định, bật COD, tự động xác nhận đơn.
 * Bên phải: đơn vị vận chuyển đang bật (cấu hình lúc đăng ký bán hàng).
 */
function ShopSettingsScreen({ onNotify }) {
  const { t } = useLanguage();
  const { shopId } = useAdmin();
  return (
    <AdminPage title={t('admin.settings.title')} subtitle={t('admin.settings.subtitle')}>
      <RequireShop>
        <SettingsForm key={shopId} shopId={shopId} onNotify={onNotify} />
      </RequireShop>
    </AdminPage>
  );
}

export default ShopSettingsScreen;
