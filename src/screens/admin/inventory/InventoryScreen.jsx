import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button';
import Dialog from '../../../components/common/Dialog';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import Input from '../../../components/common/Input';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAdmin } from '../../../hooks/useAdmin';
import { variantLabel } from '../../../services/admin/catalogOptions';
import { getShopProduct, getShopProducts, updateInventory } from '../../../services/admin/productAdminService';
import RequireShop from '../components/RequireShop';
import AdminPage from '../components/AdminPage';

const FILTERS = ['all', 'low', 'out'];
const digits = (value) => String(value ?? '').replace(/\D/g, '');
const stockLevel = (row) => (row.availableQuantity <= 0 ? 'out' : row.availableQuantity <= row.reorderPoint ? 'low' : 'ok');

function InventoryTable({ shopId, onNotify }) {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const filter = FILTERS.includes(params.get('filter')) ? params.get('filter') : 'all';
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ quantityOnHand: '', reorderPoint: '', note: '' });
  const [saving, setSaving] = useState(false);

  // Gộp mọi SKU của mọi sản phẩm (trừ sản phẩm đã gỡ) thành 1 bảng
  const load = useCallback(async () => {
    try {
      const summaries = (await getShopProducts(shopId)).items.filter((p) => p.status !== 'REMOVED');
      const products = await Promise.all(summaries.map((p) => getShopProduct(shopId, p.id)));
      setRows(
        products.flatMap((product) =>
          product.variants.map((variant) => ({
            ...variant,
            productId: product.id,
            productName: product.name,
            productStatus: product.status,
            imageUrl: product.images.find((img) => img.primary)?.url,
            label: variantLabel(product, variant),
          })),
        ),
      );
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }, [shopId]);

  useEffect(() => {
    setStatus('loading');
    load();
  }, [load]);

  const q = query.trim().toLowerCase();
  const shown = rows.filter(
    (row) => (filter === 'all' || stockLevel(row) === filter) && (!q || row.productName.toLowerCase().includes(q) || row.sellerSku.toLowerCase().includes(q)),
  );

  const open = (row) => {
    setEditing(row);
    setForm({ quantityOnHand: String(row.quantityOnHand), reorderPoint: String(row.reorderPoint), note: '' });
  };

  const save = async () => {
    const quantityOnHand = Number(form.quantityOnHand);
    if (quantityOnHand < editing.quantityReserved) {
      onNotify?.('error', t('admin.products.errors.belowReserved'));
      return;
    }
    setSaving(true);
    try {
      await updateInventory(shopId, editing.id, { quantityOnHand, reorderPoint: Number(form.reorderPoint), note: form.note.trim() || null });
      onNotify?.('success', t('admin.inventory.saved'));
      setEditing(null);
      await load();
    } catch (error) {
      console.error(error);
      onNotify?.('error', t(error?.code === 'INVENTORY_BELOW_RESERVED' ? 'admin.products.errors.belowReserved' : 'account.actionError'));
    } finally {
      setSaving(false);
    }
  };

  const counts = { all: rows.length, low: rows.filter((r) => stockLevel(r) === 'low').length, out: rows.filter((r) => stockLevel(r) === 'out').length };

  return (
    <>
      <div className="account-tabs" role="tablist" aria-label={t('admin.inventory.title')}>
        {FILTERS.map((id) => (
          <button key={id} type="button" role="tab" className="account-tabs__tab" aria-selected={id === filter} onClick={() => setParams(id === 'all' ? {} : { filter: id }, { replace: true })}>
            {t(`admin.inventory.filters.${id}`)}
            {status === 'success' && <span className="account-tabs__count">({counts[id]})</span>}
          </button>
        ))}
      </div>
      <section className="account-card admin-card">
        <div className="admin-toolbar">
          <label className="admin-search">
            <Icon name="search" size={18} />
            <input type="search" value={query} placeholder={t('admin.inventory.search')} aria-label={t('admin.inventory.search')} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <span className="admin-toolbar__count">{t('admin.inventory.count', { count: shown.length })}</span>
        </div>
        {status === 'loading' && <div className="account-skeleton" />}
        {status === 'error' && <EmptyState tone="error" icon="alert" title={t('account.loadError')} action={<Button variant="secondary" onClick={load}>{t('common.retry')}</Button>} />}
        {status === 'success' && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.products.columns.product')}</th>
                  <th>SKU</th>
                  <th className="num">{t('admin.inventory.onHand')}</th>
                  <th className="num">{t('admin.inventory.reserved')}</th>
                  <th className="num">{t('admin.variantTable.available')}</th>
                  <th className="num">{t('admin.productForm.reorder')}</th>
                  <th>{t('admin.inventory.level')}</th>
                  <th className="actions">{t('admin.products.columns.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => {
                  const level = stockLevel(row);
                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="cell-product">
                          <span className="cell-product__img">{row.imageUrl ? <img src={row.imageUrl} alt="" loading="lazy" /> : <Icon name="image" />}</span>
                          <span>
                            <Link to={`/admin/products/${row.productId}`} className="cell-product__name">
                              {row.productName}
                            </Link>
                            <span className="cell-sub">{row.label}</span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <code className="sku">{row.sellerSku}</code>
                      </td>
                      <td className="num">{row.quantityOnHand}</td>
                      <td className="num">{row.quantityReserved}</td>
                      <td className="num">
                        <strong className={level === 'out' ? 'text-danger' : level === 'low' ? 'text-warning' : ''}>{row.availableQuantity}</strong>
                      </td>
                      <td className="num">{row.reorderPoint}</td>
                      <td>
                        <span className={`stock-level stock-level--${level}`}>{t(`admin.inventory.levels.${level}`)}</span>
                      </td>
                      <td className="actions">
                        <button type="button" className="text-btn" onClick={() => open(row)}>
                          {t('admin.variantTable.editStock')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={8} className="admin-table__empty">
                      {t('admin.inventory.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        size="sm"
        title={t('admin.variantTable.dialogs.stock')}
        description={editing ? `${editing.productName} · ${editing.label}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="admin-form">
            <Input label={t('admin.inventory.onHand')} inputMode="numeric" value={form.quantityOnHand} hint={t('admin.inventory.reservedHint', { count: editing.quantityReserved })} onChange={(e) => setForm({ ...form, quantityOnHand: digits(e.target.value) })} />
            <Input label={t('admin.productForm.reorder')} inputMode="numeric" value={form.reorderPoint} hint={t('admin.inventory.reorderHint')} onChange={(e) => setForm({ ...form, reorderPoint: digits(e.target.value) })} />
            <Input label={t('admin.inventory.note')} value={form.note} placeholder={t('admin.inventory.notePlaceholder')} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        )}
      </Dialog>
    </>
  );
}

/**
 * /admin/inventory — Tồn kho theo từng SKU (đọc từ sản phẩm; cập nhật bằng
 * PUT /shops/{shopId}/products/variants/{variantId}/inventory).
 * Tab: Tất cả / Sắp hết (≤ mức cảnh báo) / Hết hàng. "Có thể bán" = trong kho − đang giữ cho đơn.
 */
function InventoryScreen({ onNotify }) {
  const { t } = useLanguage();
  const { shopId } = useAdmin();
  return (
    <AdminPage title={t('admin.inventory.title')} subtitle={t('admin.inventory.subtitle')}>
      <RequireShop>
        <InventoryTable key={shopId} shopId={shopId} onNotify={onNotify} />
      </RequireShop>
    </AdminPage>
  );
}

export default InventoryScreen;
