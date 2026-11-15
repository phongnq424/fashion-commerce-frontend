import { useCallback, useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Textarea from '../../../components/common/Textarea';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAdmin } from '../../../hooks/useAdmin';
import { getShop, updateShop } from '../../../services/admin/shopService';
import ImageField from '../components/ImageField';
import RequireShop from '../components/RequireShop';
import AdminPage from '../components/AdminPage';

const PHONE = /^\+?[0-9]{8,15}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const fromShop = (shop) => ({
  name: shop.name,
  slug: shop.slug,
  description: shop.description ?? '',
  logoKey: shop.logoKey ?? '',
  bannerKey: shop.bannerKey ?? '',
  contactEmail: shop.contactEmail,
  contactPhone: shop.contactPhone,
  pickupContactName: shop.pickupAddress?.contactName ?? '',
  pickupContactPhone: shop.pickupAddress?.contactPhone ?? '',
  pickupLine1: shop.pickupAddress?.addressLine1 ?? '',
  pickupWard: shop.pickupAddress?.ward ?? '',
  pickupDistrict: shop.pickupAddress?.district ?? '',
  pickupProvince: shop.pickupAddress?.province ?? '',
});

function ProfileForm({ shopId, onNotify }) {
  const { t } = useLanguage();
  const { refreshStore } = useAdmin();
  const [shop, setShop] = useState(null);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await getShop(shopId);
    setShop(data);
    setForm(fromShop(data));
  }, [shopId]);

  useEffect(() => {
    load().catch((error) => console.error(error));
  }, [load]);

  if (!form) return <div className="account-skeleton" />;
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value?.target ? value.target.value : value }));

  const save = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = t('admin.errors.required');
    if (!SLUG.test(form.slug)) next.slug = t('admin.errors.slug');
    if (!EMAIL.test(form.contactEmail)) next.contactEmail = t('admin.errors.email');
    if (!PHONE.test(form.contactPhone.replace(/[\s.]/g, ''))) next.contactPhone = t('admin.errors.phone');
    if (!form.pickupLine1.trim()) next.pickupLine1 = t('admin.errors.required');
    if (!form.pickupProvince.trim()) next.pickupProvince = t('admin.errors.required');
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const updated = await updateShop(shopId, {
        name: form.name.trim(),
        slug: form.slug,
        description: form.description.trim() || null,
        logoKey: form.logoKey.trim() || null,
        bannerKey: form.bannerKey.trim() || null,
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.replace(/[\s.]/g, ''),
        pickupAddress: {
          contactName: form.pickupContactName.trim() || form.name.trim(),
          contactPhone: (form.pickupContactPhone || form.contactPhone).replace(/[\s.]/g, ''),
          addressLine1: form.pickupLine1.trim(),
          addressLine2: null,
          ward: form.pickupWard.trim() || null,
          district: form.pickupDistrict.trim() || null,
          province: form.pickupProvince.trim(),
          provinceCode: null,
          postalCode: null,
          countryCode: 'VN',
        },
      });
      setShop(updated);
      await refreshStore();
      onNotify?.('success', t('admin.profile.saved'));
    } catch (error) {
      console.error(error);
      onNotify?.('error', t(error?.code === 'SHOP_SLUG_TAKEN' ? 'admin.errors.slugTaken' : 'account.actionError'));
    } finally {
      setSaving(false);
    }
  };


  return (
    <form className="admin-detail" onSubmit={save} noValidate>
      <div className="admin-detail__main">
        {/* Xem trước đầu trang shop */}
        <section className="account-card admin-card shop-preview">
          <div className="shop-preview__banner">{form.bannerKey ? <img src={form.bannerKey} alt="" /> : null}</div>
          <div className="shop-preview__info">
            <span className="admin-avatar shop-preview__logo">{form.logoKey ? <img src={form.logoKey} alt="" /> : form.name.charAt(0).toUpperCase()}</span>
            <div>
              <p className="shop-card__name">{form.name || '—'}</p>
              <p className="cell-sub">trendylab.vn/{form.slug}</p>
            </div>
          </div>
        </section>

        <section className="account-card">
          <h2 className="account-card__title admin-section-title">{t('admin.profile.basic')}</h2>
          <div className="admin-form">
            <div className="admin-form__row">
              <Input label={t('admin.fields.shopName')} value={form.name} maxLength={160} onChange={set('name')} error={errors.name} />
              <Input label={t('admin.profile.slug')} value={form.slug} maxLength={180} onChange={(e) => set('slug')(e.target.value.toLowerCase())} error={errors.slug} hint={t('admin.profile.slugHint')} />
            </div>
            <div className="admin-form__row">
              <ImageField label={t('admin.fields.avatar')} hint={t('admin.fields.imageHint')} value={form.logoKey} onChange={set('logoKey')} />
              <ImageField label={t('admin.fields.cover')} hint={t('admin.fields.imageHint')} value={form.bannerKey} onChange={set('bannerKey')} ratio="wide" />
            </div>
            <Textarea label={t('admin.fields.description')} value={form.description} maxLength={5000} rows={4} onChange={set('description')} />
          </div>
        </section>

        <section className="account-card">
          <h2 className="account-card__title admin-section-title">{t('admin.profile.contact')}</h2>
          <div className="admin-form">
            <div className="admin-form__row">
              <Input label={t('admin.fields.email')} type="email" value={form.contactEmail} onChange={set('contactEmail')} error={errors.contactEmail} />
              <Input label={t('admin.fields.phone')} inputMode="tel" value={form.contactPhone} onChange={set('contactPhone')} error={errors.contactPhone} />
            </div>
          </div>
        </section>

        <section className="account-card">
          <h2 className="account-card__title admin-section-title">{t('admin.profile.pickup')}</h2>
          <div className="admin-form">
            <div className="admin-form__row">
              <Input label={t('admin.fields.contactName')} value={form.pickupContactName} onChange={set('pickupContactName')} />
              <Input label={t('admin.fields.phone')} inputMode="tel" value={form.pickupContactPhone} onChange={set('pickupContactPhone')} />
            </div>
            <Input label={t('admin.fields.addressDetail')} value={form.pickupLine1} onChange={set('pickupLine1')} error={errors.pickupLine1} />
            <div className="admin-form__row admin-form__row--3">
              <Input label={t('admin.fields.ward')} value={form.pickupWard} onChange={set('pickupWard')} />
              <Input label={t('addresses.fields.district')} value={form.pickupDistrict} onChange={set('pickupDistrict')} />
              <Input label={t('admin.fields.province')} value={form.pickupProvince} onChange={set('pickupProvince')} error={errors.pickupProvince} />
            </div>
          </div>
        </section>
      </div>

      <aside className="admin-detail__side product-side">
        <section className="account-card">
          <div className="product-side__actions">
            <Button type="submit" fullWidth disabled={saving}>
              {saving ? t('common.saving') : t('admin.profile.save')}
            </Button>
            <Button variant="ghost" fullWidth onClick={() => setForm(fromShop(shop))}>
              {t('admin.productForm.reset')}
            </Button>
          </div>
        </section>
      </aside>

    </form>
  );
}

/**
 * /admin/profile — Thông tin cửa hàng TrendyLab (GET / PATCH /shops/{shopId}).
 * Bố cục: xem trước (banner + logo) • thông tin cơ bản • liên hệ • địa chỉ kho lấy hàng | cột phải: Lưu.
 */
function ShopProfileScreen({ onNotify }) {
  const { t } = useLanguage();
  const { shopId } = useAdmin();
  return (
    <AdminPage title={t('admin.profile.title')} subtitle={t('admin.profile.subtitle')}>
      <RequireShop>
        <ProfileForm key={shopId} shopId={shopId} onNotify={onNotify} />
      </RequireShop>
    </AdminPage>
  );
}

export default ShopProfileScreen;
