import { useState } from 'react';
import Button from '../../../../components/common/Button';
import Dialog from '../../../../components/common/Dialog';
import Input from '../../../../components/common/Input';
import Select from '../../../../components/common/Select';
import StatusBadge from '../../../../components/common/StatusBadge';
import { useLanguage } from '../../../../hooks/useLanguage';
import { variantLabel } from '../../../../services/admin/catalogOptions';
import { formatPrice } from '../../../../utils/format';
import { statusTone } from '../../../../utils/status';

const digits = (value) => String(value ?? '').replace(/\D/g, '');

/**
 * BẢNG SKU khi SỬA sản phẩm (mỗi thay đổi gọi 1 API riêng, kèm product.version):
 *   Giá / giá gốc   -> PUT .../variants/{id}/price
 *   Bật / tắt SKU   -> PUT .../variants/{id}/status
 *   Mã SKU, cân nặng -> PATCH .../variants/{id}
 *   Tồn kho         -> PUT /shops/{shopId}/products/variants/{id}/inventory (không cần version)
 *   Thêm SKU        -> POST .../variants (chọn từ các giá trị phân loại đã có)
 * - product: ProductResponse   - onAction(type, variant | null, payload) -> Promise   - busy
 */
function VariantTable({ product, onAction, busy }) {
  const { t, language } = useLanguage();
  const [dialog, setDialog] = useState(null); // { type: 'price'|'info'|'stock'|'add', variant }
  const [form, setForm] = useState({});
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value?.target ? value.target.value : value }));

  const open = (type, variant) => {
    setDialog({ type, variant });
    if (type === 'price') setForm({ priceMinor: String(variant.priceMinor), compareAtPriceMinor: variant.compareAtPriceMinor ? String(variant.compareAtPriceMinor) : '' });
    if (type === 'info') setForm({ sellerSku: variant.sellerSku, barcode: variant.barcode ?? '', weightGrams: String(variant.weightGrams) });
    if (type === 'stock') setForm({ quantityOnHand: String(variant.quantityOnHand), reorderPoint: String(variant.reorderPoint), note: '' });
    if (type === 'add') {
      const first = Object.fromEntries(product.options.map((o) => [o.type, o.values[0]?.code ?? '']));
      setForm({ ...first, sellerSku: '', priceMinor: String(product.variants[0]?.priceMinor ?? ''), compareAtPriceMinor: '', initialStock: '0', reorderPoint: '5', weightGrams: '300' });
    }
  };

  const close = () => setDialog(null);

  const submit = async () => {
    const { type, variant } = dialog;
    let payload;
    if (type === 'price') payload = { priceMinor: Number(form.priceMinor), compareAtPriceMinor: form.compareAtPriceMinor ? Number(form.compareAtPriceMinor) : null };
    if (type === 'info') payload = { sellerSku: form.sellerSku.trim(), barcode: form.barcode.trim() || null, weightGrams: Number(form.weightGrams) || 1 };
    if (type === 'stock') payload = { quantityOnHand: Number(form.quantityOnHand), reorderPoint: Number(form.reorderPoint), note: form.note.trim() || null };
    if (type === 'add') {
      payload = {
        sellerSku: form.sellerSku.trim(),
        barcode: null,
        selections: Object.fromEntries(product.options.map((o) => [o.type, form[o.type]])),
        priceMinor: Number(form.priceMinor),
        compareAtPriceMinor: form.compareAtPriceMinor ? Number(form.compareAtPriceMinor) : null,
        weightGrams: Number(form.weightGrams) || 300,
        initialStock: Number(form.initialStock) || 0,
        reorderPoint: Number(form.reorderPoint) || 0,
      };
    }
    const ok = await onAction(type, variant ?? null, payload);
    if (ok) close();
  };

  const title = dialog ? t(`admin.variantTable.dialogs.${dialog.type}`) : '';

  return (
    <>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.productForm.variant')}</th>
              <th>SKU</th>
              <th className="num">{t('admin.productForm.price')}</th>
              <th className="num">{t('admin.variantTable.available')}</th>
              <th>{t('admin.products.columns.status')}</th>
              <th className="actions">{t('admin.products.columns.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {product.variants.map((variant) => (
              <tr key={variant.id}>
                <td>{variantLabel(product, variant)}</td>
                <td>
                  <code className="sku">{variant.sellerSku}</code>
                </td>
                <td className="num">
                  {formatPrice(variant.priceMinor, language)}
                  {variant.compareAtPriceMinor && <s className="cell-sub">{formatPrice(variant.compareAtPriceMinor, language)}</s>}
                </td>
                <td className="num">
                  <span className={variant.availableQuantity <= 0 ? 'text-danger' : variant.availableQuantity <= variant.reorderPoint ? 'text-warning' : ''}>{variant.availableQuantity}</span>
                  <span className="cell-sub">{t('admin.variantTable.onHand', { onHand: variant.quantityOnHand, reserved: variant.quantityReserved })}</span>
                </td>
                <td>
                  <StatusBadge tone={statusTone(variant.status)}>{t(`admin.variantStatus.${variant.status}`)}</StatusBadge>
                </td>
                <td className="actions">
                  <button type="button" className="text-btn" disabled={busy} onClick={() => open('price', variant)}>
                    {t('admin.variantTable.editPrice')}
                  </button>
                  <button type="button" className="text-btn" disabled={busy} onClick={() => open('stock', variant)}>
                    {t('admin.variantTable.editStock')}
                  </button>
                  <button type="button" className="text-btn" disabled={busy} onClick={() => open('info', variant)}>
                    {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    className={`text-btn ${variant.status === 'ACTIVE' ? 'text-btn--danger' : ''}`}
                    disabled={busy}
                    onClick={() => onAction('status', variant, { status: variant.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
                  >
                    {variant.status === 'ACTIVE' ? t('admin.variantTable.disable') : t('admin.variantTable.enable')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="variant-table__foot">
        <Button variant="outline" size="sm" disabled={busy} onClick={() => open('add')}>
          + {t('admin.variantTable.addVariant')}
        </Button>
        <span className="cell-sub">{t('admin.variantTable.optionsLocked')}</span>
      </div>

      <Dialog
        open={dialog !== null}
        onClose={close}
        size="sm"
        title={title}
        description={dialog?.variant ? `${variantLabel(product, dialog.variant)} · ${dialog.variant.sellerSku}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? t('common.saving') : t('common.save')}
            </Button>
          </>
        }
      >
        <div className="admin-form">
          {dialog?.type === 'price' && (
            <>
              <Input label={t('admin.productForm.price')} inputMode="numeric" value={form.priceMinor} onChange={(e) => set('priceMinor')(digits(e.target.value))} />
              <Input label={t('admin.productForm.compareAt')} inputMode="numeric" value={form.compareAtPriceMinor} hint={t('admin.variantTable.compareHint')} onChange={(e) => set('compareAtPriceMinor')(digits(e.target.value))} />
            </>
          )}
          {dialog?.type === 'info' && (
            <>
              <Input label="SKU" value={form.sellerSku} maxLength={100} onChange={set('sellerSku')} />
              <Input label={t('admin.variantTable.barcode')} value={form.barcode} maxLength={100} onChange={set('barcode')} />
              <Input label={t('admin.productForm.weight')} inputMode="numeric" value={form.weightGrams} onChange={(e) => set('weightGrams')(digits(e.target.value))} />
            </>
          )}
          {dialog?.type === 'stock' && (
            <>
              <Input label={t('admin.inventory.onHand')} inputMode="numeric" value={form.quantityOnHand} hint={t('admin.inventory.reservedHint', { count: dialog.variant.quantityReserved })} onChange={(e) => set('quantityOnHand')(digits(e.target.value))} />
              <Input label={t('admin.productForm.reorder')} inputMode="numeric" value={form.reorderPoint} onChange={(e) => set('reorderPoint')(digits(e.target.value))} />
              <Input label={t('admin.inventory.note')} value={form.note} onChange={set('note')} />
            </>
          )}
          {dialog?.type === 'add' && (
            <>
              <div className="admin-form__row">
                {product.options.map((option) => (
                  <Select key={option.type} label={option.displayName} options={option.values.map((v) => ({ id: v.code, name: v.label }))} value={form[option.type]} onChange={set(option.type)} />
                ))}
              </div>
              <Input label="SKU" value={form.sellerSku} maxLength={100} onChange={set('sellerSku')} />
              <div className="admin-form__row">
                <Input label={t('admin.productForm.price')} inputMode="numeric" value={form.priceMinor} onChange={(e) => set('priceMinor')(digits(e.target.value))} />
                <Input label={t('admin.productForm.stock')} inputMode="numeric" value={form.initialStock} onChange={(e) => set('initialStock')(digits(e.target.value))} />
              </div>
            </>
          )}
        </div>
      </Dialog>
    </>
  );
}

export default VariantTable;
