import { useCallback, useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import Dialog from '../../../components/common/Dialog';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/FieldSelect';
import StatusBadge from '../../../components/common/StatusBadge';
import { useLanguage } from '../../../hooks/useLanguage';
import { useSeller } from '../../../hooks/useSeller';
import {
  createVoucher,
  getVouchers,
  setVoucherActive,
  updateVoucher,
  VOUCHER_APPLIES_TO,
  VOUCHER_DISCOUNT_TYPES,
} from '../../../services/seller/voucherService';
import { formatPrice } from '../../../utils/format';
import { formatDateTime } from '../../../utils/status';
import RequireShop from '../components/RequireShop';
import SellerPage from '../components/SellerPage';

// ISO -> giá trị cho <input type="datetime-local">
const toLocalInput = (iso) => {
  const date = iso ? new Date(iso) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const emptyForm = () => ({
  code: '',
  name: '',
  description: '',
  appliesTo: 'ORDER',
  discountType: 'PERCENT',
  percent: '10',
  amountMinor: '',
  maxDiscountMinor: '',
  minSpendMinor: '0',
  usageLimit: '100',
  perUserLimit: '1',
  startsAt: toLocalInput(),
  endsAt: toLocalInput(new Date(Date.now() + 30 * 86400000).toISOString()),
  active: true,
});

const fromVoucher = (v) => ({
  code: v.code,
  name: v.name,
  description: v.description ?? '',
  appliesTo: v.appliesTo,
  discountType: v.discountType,
  percent: v.discountRateBp ? String(v.discountRateBp / 100) : '',
  amountMinor: v.discountAmountMinor ? String(v.discountAmountMinor) : '',
  maxDiscountMinor: v.maxDiscountMinor ? String(v.maxDiscountMinor) : '',
  minSpendMinor: String(v.minSpendMinor ?? 0),
  usageLimit: String(v.usageLimit),
  perUserLimit: String(v.perUserLimit),
  startsAt: toLocalInput(v.startsAt),
  endsAt: toLocalInput(v.endsAt),
  active: v.active,
});

function validate(form, isNew) {
  const errors = {};
  if (isNew && !/^[A-Za-z0-9_-]{1,60}$/.test(form.code.trim())) errors.code = 'market.vouchers.errors.code';
  if (!form.name.trim()) errors.name = 'market.vouchers.errors.required';
  if (form.discountType === 'PERCENT' && !(Number(form.percent) > 0 && Number(form.percent) <= 100)) errors.percent = 'market.vouchers.errors.percent';
  if (form.discountType === 'FIXED' && !(Number(form.amountMinor) > 0)) errors.amountMinor = 'market.vouchers.errors.positive';
  if (!(Number(form.usageLimit) > 0)) errors.usageLimit = 'market.vouchers.errors.positive';
  if (!(Number(form.perUserLimit) > 0)) errors.perUserLimit = 'market.vouchers.errors.positive';
  if (!(new Date(form.endsAt) > new Date(form.startsAt))) errors.endsAt = 'market.vouchers.errors.window';
  return errors;
}

function VoucherDialog({ open, voucher, onClose, onSubmit }) {
  const { t } = useLanguage();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isNew = !voucher;

  useEffect(() => {
    if (open) {
      setForm(voucher ? fromVoucher(voucher) : emptyForm());
      setErrors({});
    }
  }, [open, voucher]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const submit = async () => {
    const next = validate(form, isNew);
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await onSubmit(form);
    } finally {
      setSaving(false);
    }
  };
  const err = (key) => (errors[key] ? t(errors[key]) : undefined);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={isNew ? t('market.vouchers.create') : t('market.vouchers.edit', { code: voucher.code })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={submit} disabled={saving}>{saving ? t('common.loading') : t('common.save')}</Button>
        </>
      }
    >
      <div className="seller-form">
        <div className="seller-form__row">
          <Input label={t('market.vouchers.fields.code')} value={form.code} disabled={!isNew} maxLength={60} onChange={(e) => set('code')(e.target.value.toUpperCase())} error={err('code')} />
          <Input label={t('market.vouchers.fields.name')} value={form.name} maxLength={160} onChange={(e) => set('name')(e.target.value)} error={err('name')} />
        </div>
        <Input label={t('market.vouchers.fields.description')} value={form.description} maxLength={500} onChange={(e) => set('description')(e.target.value)} />
        <div className="seller-form__row">
          <Select label={t('market.vouchers.fields.appliesTo')} value={form.appliesTo} onChange={set('appliesTo')} options={VOUCHER_APPLIES_TO.map((id) => ({ id, name: t(`market.vouchers.appliesTo.${id}`) }))} />
          <Select label={t('market.vouchers.fields.discountType')} value={form.discountType} onChange={set('discountType')} options={VOUCHER_DISCOUNT_TYPES.map((id) => ({ id, name: t(`market.vouchers.discountType.${id}`) }))} />
        </div>
        <div className="seller-form__row">
          {form.discountType === 'PERCENT' ? (
            <Input label={t('market.vouchers.fields.percent')} type="number" min="1" max="100" step="0.5" value={form.percent} onChange={(e) => set('percent')(e.target.value)} error={err('percent')} />
          ) : (
            <Input label={t('market.vouchers.fields.amount')} type="number" min="1" value={form.amountMinor} onChange={(e) => set('amountMinor')(e.target.value)} error={err('amountMinor')} />
          )}
          <Input label={t('market.vouchers.fields.maxDiscount')} type="number" min="0" value={form.maxDiscountMinor} onChange={(e) => set('maxDiscountMinor')(e.target.value)} />
          <Input label={t('market.vouchers.fields.minSpend')} type="number" min="0" value={form.minSpendMinor} onChange={(e) => set('minSpendMinor')(e.target.value)} />
        </div>
        <div className="seller-form__row">
          <Input label={t('market.vouchers.fields.usageLimit')} type="number" min="1" value={form.usageLimit} onChange={(e) => set('usageLimit')(e.target.value)} error={err('usageLimit')} />
          <Input label={t('market.vouchers.fields.perUserLimit')} type="number" min="1" value={form.perUserLimit} onChange={(e) => set('perUserLimit')(e.target.value)} error={err('perUserLimit')} />
        </div>
        <div className="seller-form__row">
          <Input label={t('market.vouchers.fields.startsAt')} type="datetime-local" value={form.startsAt} onChange={(e) => set('startsAt')(e.target.value)} />
          <Input label={t('market.vouchers.fields.endsAt')} type="datetime-local" value={form.endsAt} onChange={(e) => set('endsAt')(e.target.value)} error={err('endsAt')} />
        </div>
        {isNew && (
          <label className="check-row">
            <input type="checkbox" checked={form.active} onChange={(e) => set('active')(e.target.checked)} />
            {t('market.vouchers.fields.activeNow')}
          </label>
        )}
      </div>
    </Dialog>
  );
}

function VoucherTable({ shopId, onNotify }) {
  const { t, language } = useLanguage();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [editing, setEditing] = useState(null); // null | 'new' | VoucherResponse
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setItems((await getVouchers(shopId)).items ?? []);
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }, [shopId]);

  useEffect(() => {
    load();
  }, [load]);

  const errorText = (error) => t(`market.errors.${error?.code}`, { defaultValue: t('account.actionError') });

  const handleSubmit = async (form) => {
    try {
      if (editing === 'new') await createVoucher(shopId, form);
      else await updateVoucher(shopId, editing, form);
      onNotify?.('success', t('market.vouchers.saved'));
      setEditing(null);
      await load();
    } catch (error) {
      console.error(error);
      onNotify?.('error', errorText(error));
    }
  };

  const toggle = async (voucher) => {
    setBusyId(voucher.id);
    try {
      await setVoucherActive(shopId, voucher, !voucher.active);
      await load();
    } catch (error) {
      onNotify?.('error', errorText(error));
    } finally {
      setBusyId(null);
    }
  };

  const discountText = (v) =>
    v.discountType === 'PERCENT'
      ? `${(v.discountRateBp ?? 0) / 100}%${v.maxDiscountMinor ? ` (≤ ${formatPrice(v.maxDiscountMinor, language)})` : ''}`
      : formatPrice(v.discountAmountMinor ?? 0, language);

  return (
    <>
      <section className="account-card seller-card">
        <div className="seller-toolbar">
          <span className="seller-toolbar__count">{t('market.vouchers.count', { count: items.length })}</span>
          <Button size="sm" onClick={() => setEditing('new')}>
            <Icon name="plus" size={16} />
            {t('market.vouchers.create')}
          </Button>
        </div>
        {status === 'loading' && <div className="account-skeleton" />}
        {status === 'error' && <EmptyState tone="error" icon="alert" title={t('account.loadError')} action={<Button variant="secondary" onClick={load}>{t('common.retry')}</Button>} />}
        {status === 'success' && (
          <div className="seller-table-wrap">
            <table className="seller-table">
              <thead>
                <tr>
                  <th>{t('market.vouchers.fields.code')}</th>
                  <th>{t('market.vouchers.fields.appliesTo')}</th>
                  <th>{t('market.vouchers.columns.discount')}</th>
                  <th className="num">{t('market.vouchers.fields.minSpend')}</th>
                  <th className="num">{t('market.vouchers.columns.used')}</th>
                  <th>{t('market.vouchers.columns.window')}</th>
                  <th>{t('seller.orders.columns.status')}</th>
                  <th className="actions">{t('seller.products.columns.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <strong>{v.code}</strong>
                      <span className="cell-sub">{v.name}</span>
                    </td>
                    <td>{t(`market.vouchers.appliesTo.${v.appliesTo}`)}</td>
                    <td>{discountText(v)}</td>
                    <td className="num">{formatPrice(v.minSpendMinor, language)}</td>
                    <td className="num">
                      {v.usedCount}/{v.usageLimit}
                    </td>
                    <td>
                      {formatDateTime(v.startsAt, language)}
                      <span className="cell-sub">→ {formatDateTime(v.endsAt, language)}</span>
                    </td>
                    <td>
                      <StatusBadge tone={v.active ? 'success' : 'muted'}>{t(v.active ? 'market.vouchers.active' : 'market.vouchers.inactive')}</StatusBadge>
                    </td>
                    <td className="actions">
                      <button type="button" className="text-btn" onClick={() => setEditing(v)}>{t('common.edit')}</button>{' '}
                      <button type="button" className="text-btn" disabled={busyId === v.id} onClick={() => toggle(v)}>
                        {t(v.active ? 'market.vouchers.deactivate' : 'market.vouchers.activate')}
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="seller-table__empty">{t('market.vouchers.empty')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <VoucherDialog open={editing !== null} voucher={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSubmit={handleSubmit} />
    </>
  );
}

/** /seller/vouchers — Mã giảm giá của shop (áp dụng cho đơn hàng hoặc phí vận chuyển khi khách thanh toán). */
function VoucherScreen({ onNotify }) {
  const { t } = useLanguage();
  const { shopId } = useSeller();
  return (
    <SellerPage title={t('market.vouchers.title')} subtitle={t('market.vouchers.subtitle')}>
      <RequireShop>
        <VoucherTable key={shopId} shopId={shopId} onNotify={onNotify} />
      </RequireShop>
    </SellerPage>
  );
}

export default VoucherScreen;
