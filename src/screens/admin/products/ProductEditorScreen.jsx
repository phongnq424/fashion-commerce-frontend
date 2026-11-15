import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import StatusBadge from '../../../components/common/StatusBadge';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAdmin } from '../../../hooks/useAdmin';
import { getCategoryOptions } from '../../../services/admin/catalogOptions';
import {
  addImage,
  addVariant,
  createProduct,
  deleteImage,
  getShopProduct,
  publishProduct,
  reorderImages,
  setPrimaryImage,
  unpublishProduct,
  updateInventory,
  updateProduct,
  updateVariant,
  updateVariantPrice,
  updateVariantStatus,
} from '../../../services/admin/productAdminService';
import { formatDateTime, statusTone } from '../../../utils/status';
import RequireShop from '../components/RequireShop';
import AdminPage from '../components/AdminPage';
import BasicInfoFields from './components/BasicInfoFields';
import ImageListEditor from './components/ImageListEditor';
import VariantBuilder from './components/VariantBuilder';
import VariantTable from './components/VariantTable';

const EMPTY = { name: '', sellerProductCode: '', categoryId: '', targetGender: 'UNISEX', description: '', material: '', fitType: '', careInstructions: '' };

const ERROR_KEYS = {
  PRODUCT_VERSION_CONFLICT: 'admin.products.errors.versionConflict',
  PRODUCT_NOT_PUBLISHABLE: 'admin.products.errors.notPublishable',
  PRODUCT_SKU_DUPLICATED: 'admin.products.errors.skuDuplicated',
  PRODUCT_VARIANT_DUPLICATED: 'admin.products.errors.variantDuplicated',
  PRODUCT_LAST_ACTIVE_VARIANT: 'admin.products.errors.lastVariant',
  PRODUCT_PRIMARY_IMAGE_REQUIRED: 'admin.products.errors.primaryRequired',
  PRODUCT_PRICE_INVALID: 'admin.products.errors.price',
  PRODUCT_COMPARE_PRICE_INVALID: 'admin.products.errors.comparePrice',
  INVENTORY_BELOW_RESERVED: 'admin.products.errors.belowReserved',
};

const basicFrom = (product) => ({
  name: product.name,
  sellerProductCode: product.sellerProductCode ?? '',
  categoryId: product.categoryId,
  targetGender: product.targetGender,
  description: product.description,
  material: product.material ?? '',
  fitType: product.fitType ?? '',
  careInstructions: product.careInstructions ?? '',
});

function validateBasic(basic, t) {
  const errors = {};
  if (!basic.name.trim()) errors.name = t('admin.errors.required');
  if (!basic.categoryId) errors.categoryId = t('admin.errors.required');
  if (!basic.description.trim()) errors.description = t('admin.errors.required');
  return errors;
}

// ---------- TẠO MỚI ----------
function CreateForm({ shopId, onNotify }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const categories = useMemo(() => getCategoryOptions(t), [t]);
  const [basic, setBasic] = useState(EMPTY);
  const [images, setImages] = useState([]); // [{ id, url, primary }]
  const [matrix, setMatrix] = useState({ options: [], variants: [] });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const submit = async (publish) => {
    const next = validateBasic(basic, t);
    if (images.length === 0) next.images = t('admin.productForm.needImage');
    if (matrix.variants.some((v) => !v.priceMinor)) next.variants = t('admin.productForm.needPrice');
    setErrors(next);
    if (Object.keys(next).length) {
      onNotify?.('warning', t('admin.productForm.fixErrors'));
      return;
    }
    setSaving(true);
    try {
      const created = await createProduct(shopId, {
        ...basic,
        sellerProductCode: basic.sellerProductCode.trim() || null,
        material: basic.material.trim() || null,
        fitType: basic.fitType.trim() || null,
        careInstructions: basic.careInstructions.trim() || null,
        brandId: null,
        sizeChart: null,
        options: matrix.options,
        variants: matrix.variants,
        images: images.map((img, i) => ({ storageKey: img.url, altText: basic.name, sortOrder: i, primary: img.primary, variantSellerSku: null })),
      });
      if (publish) await publishProduct(shopId, created.id, created.version);
      onNotify?.('success', t(publish ? 'admin.productForm.createdPublished' : 'admin.productForm.createdDraft'));
      navigate(`/admin/products/${created.id}`, { replace: true });
    } catch (error) {
      console.error(error);
      onNotify?.('error', t(ERROR_KEYS[error?.code] ?? 'account.actionError'));
    } finally {
      setSaving(false);
    }
  };

  const move = (id, dir) =>
    setImages((list) => {
      const index = list.findIndex((img) => img.id === id);
      const next = [...list];
      [next[index], next[index + dir]] = [next[index + dir], next[index]];
      return next;
    });

  return (
    <div className="admin-detail">
      <div className="admin-detail__main">
        <section className="account-card">
          <h2 className="account-card__title admin-section-title">{t('admin.productForm.basicTitle')}</h2>
          <BasicInfoFields value={basic} categories={categories} errors={errors} onChange={(key, value) => setBasic((b) => ({ ...b, [key]: value }))} />
        </section>
        <section className="account-card">
          <h2 className="account-card__title admin-section-title">{t('admin.productForm.imagesTitle')}</h2>
          <ImageListEditor
            images={images}
            error={errors.images}
            onAdd={(url) => setImages((list) => [...list, { id: `${Date.now()}-${list.length}`, url, primary: list.length === 0 }])}
            onRemove={(id) =>
              setImages((list) => {
                const next = list.filter((img) => img.id !== id);
                if (next.length && !next.some((img) => img.primary)) next[0] = { ...next[0], primary: true };
                return next;
              })
            }
            onPrimary={(id) => setImages((list) => list.map((img) => ({ ...img, primary: img.id === id })))}
            onMove={move}
          />
        </section>
        <section className="account-card">
          <h2 className="account-card__title admin-section-title">{t('admin.productForm.variantsTitle')}</h2>
          <VariantBuilder productCode={basic.sellerProductCode || basic.name} onChange={setMatrix} error={errors.variants} />
        </section>
      </div>
      <aside className="admin-detail__side product-side">
        <section className="account-card">
          <h2 className="account-card__title admin-section-title">{t('admin.productForm.publishTitle')}</h2>
          <p className="account-muted">{t('admin.productForm.publishHint')}</p>
          <div className="product-side__actions">
            <Button fullWidth disabled={saving} onClick={() => submit(true)}>
              {t('admin.productForm.saveAndPublish')}
            </Button>
            <Button variant="outline" fullWidth disabled={saving} onClick={() => submit(false)}>
              {t('admin.productForm.saveDraft')}
            </Button>
          </div>
        </section>
        <p className="admin-note">
          <Icon name="info" size={18} />
          <span>{t('admin.productForm.summary', { variants: matrix.variants.length, images: images.length })}</span>
        </p>
      </aside>
    </div>
  );
}

// ---------- SỬA ----------
function EditForm({ shopId, productId, onNotify }) {
  const { t, language } = useLanguage();
  const categories = useMemo(() => getCategoryOptions(t), [t]);
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState('loading');
  const [basic, setBasic] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getShopProduct(shopId, productId);
      setProduct(data);
      setBasic(basicFrom(data));
      setStatus('success');
    } catch (error) {
      setStatus(error?.status === 404 ? 'notFound' : 'error');
    }
  }, [shopId, productId]);

  useEffect(() => {
    load();
  }, [load]);

  // Gọi 1 API thay đổi -> nhận ProductResponse mới (version mới)
  const run = async (action, successKey) => {
    setBusy(true);
    try {
      const updated = await action();
      if (updated) setProduct(updated);
      if (successKey) onNotify?.('success', t(successKey));
      return true;
    } catch (error) {
      console.error(error);
      onNotify?.('error', t(ERROR_KEYS[error?.code] ?? 'account.actionError'));
      if (error?.code === 'PRODUCT_VERSION_CONFLICT') load();
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (status === 'loading') return <div className="account-skeleton" />;
  if (status !== 'success') {
    return (
      <div className="account-card">
        <EmptyState
          tone={status === 'error' ? 'error' : 'default'}
          icon="hanger"
          title={status === 'error' ? t('account.loadError') : t('admin.productForm.notFound')}
          action={<Button as={Link} to="/admin/products" variant="outline">{t('admin.productForm.backToList')}</Button>}
        />
      </div>
    );
  }

  const v = product.version;
  const saveBasic = () => {
    const next = validateBasic(basic, t);
    setErrors(next);
    if (Object.keys(next).length) return;
    run(() => updateProduct(shopId, productId, { expectedVersion: v, ...basic }), 'admin.productForm.saved');
  };

  const sorted = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);
  const moveImage = (id, dir) => {
    const index = sorted.findIndex((img) => img.id === id);
    const order = [...sorted];
    [order[index], order[index + dir]] = [order[index + dir], order[index]];
    run(() => reorderImages(shopId, productId, { expectedVersion: v, items: order.map((img, i) => ({ imageId: img.id, sortOrder: i })) }));
  };

  const variantAction = (type, variant, payload) => {
    if (type === 'price') return run(() => updateVariantPrice(shopId, productId, variant.id, { expectedVersion: v, ...payload }), 'admin.productForm.saved');
    if (type === 'status') return run(() => updateVariantStatus(shopId, productId, variant.id, { expectedVersion: v, ...payload }), 'admin.productForm.saved');
    if (type === 'info') return run(() => updateVariant(shopId, productId, variant.id, { expectedVersion: v, ...payload }), 'admin.productForm.saved');
    if (type === 'stock') return run(() => updateInventory(shopId, variant.id, payload), 'admin.inventory.saved');
    if (type === 'add') return run(() => addVariant(shopId, productId, { expectedVersion: v, ...payload }), 'admin.variantTable.added');
    return Promise.resolve(false);
  };

  const canPublish = ['DRAFT', 'ARCHIVED'].includes(product.status);

  return (
    <div className="admin-detail">
      <div className="admin-detail__main">
        {product.status === 'REMOVED' && (
          <p className="admin-note admin-note--danger">
            <Icon name="alert" size={18} />
            <span>{t('admin.productForm.removedNote')}</span>
          </p>
        )}
        <section className="account-card">
          <h2 className="account-card__title admin-section-title">{t('admin.productForm.basicTitle')}</h2>
          <BasicInfoFields value={basic} categories={categories} errors={errors} onChange={(key, value) => setBasic((b) => ({ ...b, [key]: value }))} />
          <div className="admin-form__actions product-save">
            <Button variant="ghost" disabled={busy} onClick={() => setBasic(basicFrom(product))}>
              {t('admin.productForm.reset')}
            </Button>
            <Button disabled={busy} onClick={saveBasic}>
              {t('admin.productForm.saveInfo')}
            </Button>
          </div>
        </section>
        <section className="account-card">
          <h2 className="account-card__title admin-section-title">{t('admin.productForm.imagesTitle')}</h2>
          <ImageListEditor
            images={sorted}
            busy={busy}
            onAdd={(url) => run(() => addImage(shopId, productId, { expectedVersion: v, storageKey: url, altText: product.name, sortOrder: sorted.length, primary: false }), 'admin.productForm.imageAdded')}
            onRemove={(id) => run(() => deleteImage(shopId, productId, id, v), 'admin.productForm.imageRemoved')}
            onPrimary={(id) => run(() => setPrimaryImage(shopId, productId, id, v), 'admin.productForm.saved')}
            onMove={moveImage}
          />
        </section>
        <section className="account-card admin-card">
          <div className="admin-toolbar">
            <h2 className="account-card__title">{t('admin.productForm.variantsTitle')}</h2>
            <span className="admin-toolbar__count">{t('admin.products.variants', { active: product.variants.filter((x) => x.status === 'ACTIVE').length, total: product.variants.length })}</span>
          </div>
          <VariantTable product={product} busy={busy} onAction={variantAction} />
        </section>
      </div>

      <aside className="admin-detail__side product-side">
        <section className="account-card">
          <h2 className="account-card__title admin-section-title">{t('admin.productForm.publishTitle')}</h2>
          <dl className="order-sum">
            <div>
              <dt>{t('admin.products.columns.status')}</dt>
              <dd>
                <StatusBadge tone={statusTone(product.status)}>{t(`admin.productStatus.${product.status}`)}</StatusBadge>
              </dd>
            </div>
            <div>
              <dt>{t('admin.productForm.version')}</dt>
              <dd>v{product.version}</dd>
            </div>
            {product.publishedAt && (
              <div>
                <dt>{t('admin.productForm.publishedAt')}</dt>
                <dd>{formatDateTime(product.publishedAt, language)}</dd>
              </div>
            )}
            <div>
              <dt>{t('admin.products.columns.updated')}</dt>
              <dd>{formatDateTime(product.updatedAt, language)}</dd>
            </div>
          </dl>
          <div className="product-side__actions">
            {canPublish && (
              <Button fullWidth disabled={busy} onClick={() => run(() => publishProduct(shopId, productId, v), 'admin.products.published')}>
                {t('admin.products.publish')}
              </Button>
            )}
            {product.status === 'ACTIVE' && (
              <Button variant="outline" fullWidth disabled={busy} onClick={() => run(() => unpublishProduct(shopId, productId, v), 'admin.products.unpublished')}>
                {t('admin.products.unpublish')}
              </Button>
            )}
          </div>
          {canPublish && <p className="cell-sub">{t('admin.productForm.publishRule')}</p>}
        </section>
        <p className="admin-note">
          <Icon name="info" size={18} />
          <span>{t('admin.productForm.versionNote')}</span>
        </p>
      </aside>
    </div>
  );
}

/**
 * /admin/products/new          — Thêm sản phẩm (POST /shops/{shopId}/products, tạo xong là Bản nháp; có nút "Lưu & đăng bán")
 * /admin/products/:productId   — Sửa sản phẩm (mỗi phần lưu riêng bằng API tương ứng, kèm version)
 * Bố cục: [thông tin cơ bản / hình ảnh / phân loại & SKU] | [cột phải: trạng thái + nút đăng bán]
 */
function ProductEditorScreen({ onNotify }) {
  const { t } = useLanguage();
  const { productId } = useParams();
  const { shopId } = useAdmin();
  const isNew = !productId;

  return (
    <AdminPage
      title={isNew ? t('admin.productForm.createTitle') : t('admin.productForm.editTitle')}
      subtitle={isNew ? t('admin.productForm.createSubtitle') : undefined}
      back={{ to: '/admin/products', label: t('admin.nav.products') }}
    >
      <RequireShop>
        {isNew ? <CreateForm key={shopId} shopId={shopId} onNotify={onNotify} /> : <EditForm key={`${shopId}-${productId}`} shopId={shopId} productId={productId} onNotify={onNotify} />}
      </RequireShop>
    </AdminPage>
  );
}

export default ProductEditorScreen;
