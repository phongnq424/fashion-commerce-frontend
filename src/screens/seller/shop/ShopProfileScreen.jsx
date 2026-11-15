import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/common/Button';
import Dialog from '../../../components/common/Dialog';
import Icon from '../../../components/common/Icon';
import Input from '../../../components/common/Input';
import Textarea from '../../../components/common/Textarea';
import { useLanguage } from '../../../hooks/useLanguage';
import { useSeller } from '../../../hooks/useSeller';
import { deleteShop, getShop, updateShop } from '../../../services/seller/shopService';
import { ImageField } from '../onboarding/OnboardingSteps';
import RequireShop from '../components/RequireShop';
import SellerPage from '../components/SellerPage';

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
  const navigate = useNavigate();
  const { isOwner, refreshShops } = useSeller();
  const [shop, setShop] = useState(null);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [typed, setTyped] = useState('');

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
    if (!form.name.trim()) next.name = t('seller.errors.required');
    if (!SLUG.test(form.slug)) next.slug = t('seller.errors.slug');
    if (!EMAIL.test(form.contactEmail)) next.contactEmail = t('seller.errors.email');
    if (!PHONE.test(form.contactPhone.replace(/[\s.]/g, ''))) next.contactPhone = t('seller.errors.phone');
    if (!form.pickupLine1.trim()) next.pickupLine1 = t('seller.errors.required');
    if (!form.pickupProvince.trim()) next.pickupProvince = t('seller.errors.required');
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
      await refreshShops();
      onNotify?.('success', t('seller.profile.saved'));
    } catch (error) {
      console.error(error);
      onNotify?.('error', t(error?.code === 'SHOP_SLUG_TAKEN' ? 'seller.errors.slugTaken' : 'account.actionError'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await deleteShop(shopId);
      await refreshShops();
      onNotify?.('success', t('seller.profile.deleted'));
      navigate('/seller');
    } catch (error) {
      console.error(error);
      onNotify?.('error', t('account.actionError'));
    }
  };

  return (
    <form className="seller-detail" onSubmit={save} noValidate>
      <div className="seller-detail__main">
        {/* Xem trước đầu trang shop */}
        <section className="account-card seller-card shop-preview">
          <div className="shop-preview__banner">{form.bannerKey ? <img src={form.bannerKey} alt="" /> : null}</div>
          <div className="shop-preview__info">
            <span className="seller-avatar shop-preview__logo">{form.logoKey ? <img src={form.logoKey} alt="" /> : form.name.charAt(0).toUpperCase()}</span>
            <div>
              <p className="shop-card__name">{form.name || '—'}</p>
              <p className="cell-sub">trendylab.vn/shop/{form.slug}</p>
            </div>
          </div>
        </section>

        <section className="account-card">
          <h2 className="account-card__title seller-section-title">{t('seller.profile.basic')}</h2>
          <div className="seller-form">
            <div className="seller-form__row">
              <Input label={t('seller.fields.shopName')} value={form.name} maxLength={160} onChange={set('name')} error={errors.name} />
              <Input label={t('seller.profile.slug')} value={form.slug} maxLength={180} onChange={(e) => set('slug')(e.target.value.toLowerCase())} error={errors.slug} hint={t('seller.profile.slugHint')} />
            </div>
            <div className="seller-form__row">
              <ImageField label={t('seller.fields.avatar')} hint={t('seller.fields.imageHint')} value={form.logoKey} onChange={set('logoKey')} />
              <ImageField label={t('seller.fields.cover')} hint={t('seller.fields.imageHint')} value={form.bannerKey} onChange={set('bannerKey')} ratio="wide" />
            </div>
            <Textarea label={t('seller.fields.description')} value={form.description} maxLength={5000} rows={4} onChange={set('description')} />
          </div>
        </section>

        <section className="account-card">
          <h2 className="account-card__title seller-section-title">{t('seller.profile.contact')}</h2>
          <div className="seller-form">
            <div className="seller-form__row">
              <Input label={t('seller.fields.email')} type="email" value={form.contactEmail} onChange={set('contactEmail')} error={errors.contactEmail} />
              <Input label={t('seller.fields.phone')} inputMode="tel" value={form.contactPhone} onChange={set('contactPhone')} error={errors.contactPhone} />
            </div>
          </div>
        </section>

        <section className="account-card">
          <h2 className="account-card__title seller-section-title">{t('seller.profile.pickup')}</h2>
          <div className="seller-form">
            <div className="seller-form__row">
              <Input label={t('seller.fields.contactName')} value={form.pickupContactName} onChange={set('pickupContactName')} />
              <Input label={t('seller.fields.phone')} inputMode="tel" value={form.pickupContactPhone} onChange={set('pickupContactPhone')} />
            </div>
            <Input label={t('seller.fields.addressDetail')} value={form.pickupLine1} onChange={set('pickupLine1')} error={errors.pickupLine1} />
            <div className="seller-form__row seller-form__row--3">
              <Input label={t('seller.fields.ward')} value={form.pickupWard} onChange={set('pickupWard')} />
              <Input label={t('addresses.fields.district')} value={form.pickupDistrict} onChange={set('pickupDistrict')} />
              <Input label={t('seller.fields.province')} value={form.pickupProvince} onChange={set('pickupProvince')} error={errors.pickupProvince} />
            </div>
          </div>
        </section>
      </div>

      <aside className="seller-detail__side product-side">
        <section className="account-card">
          <div className="product-side__actions">
            <Button type="submit" fullWidth disabled={saving}>
              {saving ? t('common.saving') : t('seller.profile.save')}
            </Button>
            <Button variant="ghost" fullWidth onClick={() => setForm(fromShop(shop))}>
              {t('seller.productForm.reset')}
            </Button>
          </div>
        </section>
        {isOwner && (
          <section className="account-card danger-zone">
            <h2 className="account-card__title">
              <Icon name="alert" size={18} />
              {t('seller.profile.dangerTitle')}
            </h2>
            <p className="account-muted">{t('seller.profile.dangerText')}</p>
            <Button variant="outline" className="btn--danger-outline" fullWidth onClick={() => setConfirm(true)}>
              {t('seller.profile.delete')}
            </Button>
          </section>
        )}
      </aside>

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        size="sm"
        title={t('seller.profile.deleteTitle')}
        description={t('seller.profile.deleteText', { name: shop.name })}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              {t('common.cancel')}
            </Button>
            <Button className="btn--danger" disabled={typed !== shop.name} onClick={remove}>
              {t('seller.profile.delete')}
            </Button>
          </>
        }
      >
        <Input label={t('seller.profile.typeName')} value={typed} onChange={(e) => setTyped(e.target.value)} />
      </Dialog>
    </form>
  );
}

/**
 * /seller/profile — Hồ sơ shop (GET / PATCH /shops/{shopId}, DELETE khi là chủ shop).
 * Bố cục: xem trước đầu trang shop (banner + logo) • thông tin cơ bản • liên hệ • địa chỉ lấy hàng | cột phải: Lưu, Vùng nguy hiểm.
 */
function ShopProfileScreen({ onNotify }) {
  const { t } = useLanguage();
  const { shopId } = useSeller();
  return (
    <SellerPage title={t('seller.profile.title')} subtitle={t('seller.profile.subtitle')}>
      <RequireShop>
        <ProfileForm key={shopId} shopId={shopId} onNotify={onNotify} />
      </RequireShop>
    </SellerPage>
  );
}

export default ShopProfileScreen;
