import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import StatusBadge from '../../../components/common/StatusBadge';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAdmin } from '../../../hooks/useAdmin';
import { categoryLabel, getCategoryOptions } from '../../../services/admin/catalogOptions';
import { getShopProducts, publishProduct, unpublishProduct } from '../../../services/admin/productAdminService';
import { formatPrice } from '../../../utils/format';
import { formatDateTime, statusTone } from '../../../utils/status';
import RequireShop from '../components/RequireShop';
import AdminPage from '../components/AdminPage';

// Tab trạng thái -> các status thuộc tab
const TABS = [
  { id: 'all', statuses: null },
  { id: 'ACTIVE', statuses: ['ACTIVE'] },
  { id: 'DRAFT', statuses: ['DRAFT'] },
  { id: 'ARCHIVED', statuses: ['ARCHIVED', 'HIDDEN'] },
  { id: 'REMOVED', statuses: ['REMOVED'] },
];

const ERROR_KEYS = {
  PRODUCT_NOT_PUBLISHABLE: 'admin.products.errors.notPublishable',
  PRODUCT_VERSION_CONFLICT: 'admin.products.errors.versionConflict',
};

function ProductTable({ shopId, onNotify }) {
  const { t, language } = useLanguage();
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((item) => item.id === params.get('status')) ?? TABS[0];
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [busyId, setBusyId] = useState(null);
  const categories = useMemo(() => getCategoryOptions(t), [t]);

  const load = useCallback(async () => {
    try {
      setItems((await getShopProducts(shopId)).items);
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
  const shown = items.filter(
    (p) =>
      (!tab.statuses || tab.statuses.includes(p.status)) &&
      (!category || p.categoryId === category) &&
      (!q || p.name.toLowerCase().includes(q) || (p.sellerProductCode ?? '').toLowerCase().includes(q)),
  );

  const toggle = async (product) => {
    setBusyId(product.id);
    try {
      if (product.status === 'ACTIVE') await unpublishProduct(shopId, product.id, product.version);
      else await publishProduct(shopId, product.id, product.version);
      onNotify?.('success', t(product.status === 'ACTIVE' ? 'admin.products.unpublished' : 'admin.products.published'));
      await load();
    } catch (error) {
      console.error(error);
      onNotify?.('error', t(ERROR_KEYS[error?.code] ?? 'account.actionError'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="account-tabs" role="tablist" aria-label={t('admin.products.tabsLabel')}>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            className="account-tabs__tab"
            aria-selected={item.id === tab.id}
            onClick={() => setParams(item.id === 'all' ? {} : { status: item.id }, { replace: true })}
          >
            {t(`admin.products.tabs.${item.id}`)}
            {status === 'success' && (
              <span className="account-tabs__count">({item.statuses ? items.filter((p) => item.statuses.includes(p.status)).length : items.length})</span>
            )}
          </button>
        ))}
      </div>

      <section className="account-card admin-card">
        <div className="admin-toolbar">
          <label className="admin-search">
            <Icon name="search" size={18} />
            <input type="search" value={query} placeholder={t('admin.products.search')} aria-label={t('admin.products.search')} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <select className="admin-select" value={category} aria-label={t('admin.products.category')} onChange={(e) => setCategory(e.target.value)}>
            <option value="">{t('admin.products.allCategories')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="admin-toolbar__count">{t('admin.products.count', { count: shown.length })}</span>
        </div>

        {status === 'loading' && <div className="account-skeleton" />}
        {status === 'error' && <EmptyState tone="error" icon="alert" title={t('account.loadError')} action={<Button variant="secondary" onClick={load}>{t('common.retry')}</Button>} />}
        {status === 'success' && items.length === 0 && (
          <EmptyState icon="hanger" title={t('admin.products.emptyTitle')} text={t('admin.products.emptyText')} action={<Button as={Link} to="/admin/products/new">{t('admin.nav.newProduct')}</Button>} />
        )}
        {status === 'success' && items.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.products.columns.product')}</th>
                  <th>{t('admin.products.columns.category')}</th>
                  <th className="num">{t('admin.products.columns.price')}</th>
                  <th className="num">{t('admin.products.columns.stock')}</th>
                  <th>{t('admin.products.columns.status')}</th>
                  <th>{t('admin.products.columns.updated')}</th>
                  <th className="actions">{t('admin.products.columns.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => {
                  const avail = p.quantityOnHand - p.quantityReserved;
                  const price =
                    p.minPriceMinor === p.maxPriceMinor
                      ? formatPrice(p.minPriceMinor, language)
                      : `${formatPrice(p.minPriceMinor, language)} – ${formatPrice(p.maxPriceMinor, language)}`;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="cell-product">
                          <span className="cell-product__img">{p.primaryImageUrl ? <img src={p.primaryImageUrl} alt="" loading="lazy" /> : <Icon name="image" />}</span>
                          <span>
                            <Link to={`/admin/products/${p.id}`} className="cell-product__name">
                              {p.name}
                            </Link>
                            <span className="cell-sub">
                              {p.sellerProductCode ?? '—'} · {t('admin.products.variants', { active: p.activeVariantCount, total: p.variantCount })}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td>{categoryLabel(p.categoryId, t)}</td>
                      <td className="num">{price}</td>
                      <td className="num">
                        <span className={avail <= 0 ? 'text-danger' : avail <= 5 ? 'text-warning' : ''}>{avail}</span>
                        <span className="cell-sub">{t('admin.products.reserved', { count: p.quantityReserved })}</span>
                      </td>
                      <td>
                        <StatusBadge tone={statusTone(p.status)}>{t(`admin.productStatus.${p.status}`)}</StatusBadge>
                      </td>
                      <td>{formatDateTime(p.updatedAt, language)}</td>
                      <td className="actions">
                        <Link to={`/admin/products/${p.id}`} className="text-btn">
                          {t('common.edit')}
                        </Link>
                        {['ACTIVE', 'DRAFT', 'ARCHIVED'].includes(p.status) && (
                          <button type="button" className="text-btn" disabled={busyId === p.id} onClick={() => toggle(p)}>
                            {p.status === 'ACTIVE' ? t('admin.products.unpublish') : t('admin.products.publish')}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={7} className="admin-table__empty">
                      {t('admin.products.noMatch')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

/**
 * /admin/products — Sản phẩm của shop (GET /shops/{shopId}/products).
 * Tab trạng thái (Tất cả / Đang bán / Bản nháp / Đã ẩn / Vi phạm) • tìm theo tên, mã • lọc danh mục •
 * bảng: ảnh + tên, danh mục, giá, tồn kho, trạng thái, nút Sửa / Đăng bán / Ngừng bán.
 */
function ProductListScreen({ onNotify }) {
  const { t } = useLanguage();
  const { shopId } = useAdmin();
  return (
    <AdminPage
      title={t('admin.products.title')}
      subtitle={t('admin.products.subtitle')}
      actions={
        shopId && (
          <Button as={Link} to="/admin/products/new">
            <Icon name="plus" size={18} />
            {t('admin.nav.newProduct')}
          </Button>
        )
      }
    >
      <RequireShop>{(id) => <ProductTable key={id} shopId={id} onNotify={onNotify} />}</RequireShop>
    </AdminPage>
  );
}

export default ProductListScreen;
