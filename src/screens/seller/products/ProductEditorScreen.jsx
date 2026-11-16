import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import StatusBadge from '../../../components/common/StatusBadge';
import { useLanguage } from '../../../hooks/useLanguage';
import { useSeller } from '../../../hooks/useSeller';
import { useCategoryOptions } from '../../../services/seller/catalogOptions';
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
} from '../../../services/seller/sellerProductService';
import { formatDateTime, statusTone } from '../../../utils/status';
import RequireShop from '../components/RequireShop';
import SellerPage from '../components/SellerPage';
import BasicInfoFields from './components/BasicInfoFields';
import ImageListEditor from './components/ImageListEditor';
import VariantBuilder from './components/VariantBuilder';
import VariantTable from './components/VariantTable';

const EMPTY = { name: '', sellerProductCode: '', categoryId: '', targetGender: 'UNISEX', description: '', material: '', fitType: '', careInstructions: '' };

const ERROR_KEYS = {
  PRODUCT_VERSION_CONFLICT: 'seller.products.errors.versionConflict',
  PRODUCT_NOT_PUBLISHABLE: 'seller.products.errors.notPublishable',
  PRODUCT_SKU_DUPLICATED: 'seller.products.errors.skuDuplicated',
  PRODUCT_VARIANT_DUPLICATED: 'seller.products.errors.variantDuplicated',
  PRODUCT_LAST_ACTIVE_VARIANT: 'seller.products.errors.lastVariant',
  PRODUCT_PRIMARY_IMAGE_REQUIRED: 'seller.products.errors.primaryRequired',
  PRODUCT_PRICE_INVALID: 'seller.products.errors.price',
  PRODUCT_COMPARE_PRICE_INVALID: 'seller.products.errors.comparePrice',
  INVENTORY_BELOW_RESERVED: 'seller.products.errors.belowReserved',
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
  if (!basic.name.trim()) errors.name = t('seller.errors.required');
  if (!basic.categoryId) errors.categoryId = t('seller.errors.required');
  if (!basic.description.trim()) errors.description = t('seller.errors.required');
  return errors;
}

// ---------- TẠO MỚI ----------
function CreateForm({ shopId, onNotify }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const categories = useCategoryOptions();
  const [basic, setBasic] = useState(EMPTY);
  const [images, setImages] = useState([]); // [{ id, url, primary }]
  const [matrix, setMatrix] = useState({ options: [], variants: [] });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const submit = async (publish) => {
    const next = validateBasic(basic, t);
    if (images.length === 0) next.images = t('seller.productForm.needImage');
    if (matrix.variants.some((v) => !v.priceMinor)) next.variants = t('seller.productForm.needPrice');
    setErrors(next);
    if (Object.keys(next).length) {
      onNotify?.('warning', t('seller.productForm.fixErrors'));
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
      onNotify?.('success', t(publish ? 'seller.productForm.createdPublished' : 'seller.productForm.createdDraft'));
      navigate(`/seller/products/${created.id}`, { replace: true });
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
    <div className="seller-detail">
      <div className="seller-detail__main">
        <section className="account-card">
          <h2 className="account-card__title seller-section-title">{t('seller.productForm.basicTitle')}</h2>
          <BasicInfoFields value={basic} categories={categories} errors={errors} onChange={(key, value) => setBasic((b) => ({ ...b, [key]: value }))} />
        </section>
        <section className="account-card">
          <h2 className="account-card__title seller-section-title">{t('seller.productForm.imagesTitle')}</h2>
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
          <h2 className="account-card__title seller-section-title">{t('seller.productForm.variantsTitle')}</h2>
          <VariantBuilder productCode={basic.sellerProductCode || basic.name} onChange={setMatrix} error={errors.variants} />
        </section>
      </div>
      <aside className="seller-detail__side product-side">
        <section className="account-card">
          <h2 className="account-card__title seller-section-title">{t('seller.productForm.publishTitle')}</h2>
          <p className="account-muted">{t('seller.productForm.publishHint')}</p>
          <div className="product-side__actions">
            <Button fullWidth disabled={saving} onClick={() => submit(true)}>
              {t('seller.productForm.saveAndPublish')}
            </Button>
            <Button variant="outline" fullWidth disabled={saving} onClick={() => submit(false)}>
              {t('seller.productForm.saveDraft')}
            </Button>
          </div>
        </section>
        <p className="seller-note">
          <Icon name="info" size={18} />
          <span>{t('seller.productForm.summary', { variants: matrix.variants.length, images: images.length })}</span>
        </p>
      </aside>
    </div>
  );
}

// ---------- SỬA ----------
function EditForm({ shopId, productId, onNotify }) {
  const { t, language } = useLanguage();
  const categories = useCategoryOptions();
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
          title={status === 'error' ? t('account.loadError') : t('seller.productForm.notFound')}
          action={<Button as={Link} to="/seller/products" variant="outline">{t('seller.productForm.backToList')}</Button>}
        />
      </div>
    );
  }

  const v = product.version;
  const saveBasic = () => {
    const next = validateBasic(basic, t);
    setErrors(next);
    if (Object.keys(next).length) return;
    run(() => updateProduct(shopId, productId, { expectedVersion: v, ...basic }), 'seller.productForm.saved');
  };

  const sorted = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);
  const moveImage = (id, dir) => {
    const index = sorted.findIndex((img) => img.id === id);
    const order = [...sorted];
    [order[index], order[index + dir]] = [order[index + dir], order[index]];
    run(() => reorderImages(shopId, productId, { expectedVersion: v, items: order.map((img, i) => ({ imageId: img.id, sortOrder: i })) }));
  };

  const variantAction = (type, variant, payload) => {
    if (type === 'price') return run(() => updateVariantPrice(shopId, productId, variant.id, { expectedVersion: v, ...payload }), 'seller.productForm.saved');
    if (type === 'status') return run(() => updateVariantStatus(shopId, productId, variant.id, { expectedVersion: v, ...payload }), 'seller.productForm.saved');
    if (type === 'info') return run(() => updateVariant(shopId, productId, variant.id, { expectedVersion: v, ...payload }), 'seller.productForm.saved');
    if (type === 'stock') return run(() => updateInventory(shopId, variant.id, payload), 'seller.inventory.saved');
    if (type === 'add') return run(() => addVariant(shopId, productId, { expectedVersion: v, ...payload }), 'seller.variantTable.added');
    return Promise.resolve(false);
  };

  const canPublish = ['DRAFT', 'ARCHIVED'].includes(product.status);

  return (
    <div className="seller-detail">
      <div className="seller-detail__main">
        {product.status === 'REMOVED' && (
          <p className="seller-note seller-note--danger">
            <Icon name="alert" size={18} />
            <span>{t('seller.productForm.removedNote')}</span>
          </p>
        )}
        <section className="account-card">
          <h2 className="account-card__title seller-section-title">{t('seller.productForm.basicTitle')}</h2>
          <BasicInfoFields value={basic} categories={categories} errors={errors} onChange={(key, value) => setBasic((b) => ({ ...b, [key]: value }))} />
          <div className="seller-form__actions product-save">
            <Button variant="ghost" disabled={busy} onClick={() => setBasic(basicFrom(product))}>
              {t('seller.productForm.reset')}
            </Button>
            <Button disabled={busy} onClick={saveBasic}>
              {t('seller.productForm.saveInfo')}
            </Button>
          </div>
        </section>
        <section className="account-card">
          <h2 className="account-card__title seller-section-title">{t('seller.productForm.imagesTitle')}</h2>
          <ImageListEditor
            images={sorted}
            busy={busy}
            onAdd={(url) => run(() => addImage(shopId, productId, { expectedVersion: v, storageKey: url, altText: product.name, sortOrder: sorted.length, primary: false }), 'seller.productForm.imageAdded')}
            onRemove={(id) => run(() => deleteImage(shopId, productId, id, v), 'seller.productForm.imageRemoved')}
            onPrimary={(id) => run(() => setPrimaryImage(shopId, productId, id, v), 'seller.productForm.saved')}
            onMove={moveImage}
          />
        </section>
        <section className="account-card seller-card">
          <div className="seller-toolbar">
            <h2 className="account-card__title">{t('seller.productForm.variantsTitle')}</h2>
            <span className="seller-toolbar__count">{t('seller.products.variants', { active: product.variants.filter((x) => x.status === 'ACTIVE').length, total: product.variants.length })}</span>
          </div>
          <VariantTable product={product} busy={busy} onAction={variantAction} />
        </section>
      </div>

      <aside className="seller-detail__side product-side">
        <section className="account-card">
          <h2 className="account-card__title seller-section-title">{t('seller.productForm.publishTitle')}</h2>
          <dl className="order-sum">
            <div>
              <dt>{t('seller.products.columns.status')}</dt>
              <dd>
                <StatusBadge tone={statusTone(product.status)}>{t(`seller.productStatus.${product.status}`)}</StatusBadge>
              </dd>
            </div>
            <div>
              <dt>{t('seller.productForm.version')}</dt>
              <dd>v{product.version}</dd>
            </div>
            {product.publishedAt && (
              <div>
                <dt>{t('seller.productForm.publishedAt')}</dt>
                <dd>{formatDateTime(product.publishedAt, language)}</dd>
              </div>
            )}
            <div>
              <dt>{t('seller.products.columns.updated')}</dt>
              <dd>{formatDateTime(product.updatedAt, language)}</dd>
            </div>
          </dl>
          <div className="product-side__actions">
            {canPublish && (
              <Button fullWidth disabled={busy} onClick={() => run(() => publishProduct(shopId, productId, v), 'seller.products.published')}>
                {t('seller.products.publish')}
              </Button>
            )}
            {product.status === 'ACTIVE' && (
              <Button variant="outline" fullWidth disabled={busy} onClick={() => run(() => unpublishProduct(shopId, productId, v), 'seller.products.unpublished')}>
                {t('seller.products.unpublish')}
              </Button>
            )}
          </div>
          {canPublish && <p className="cell-sub">{t('seller.productForm.publishRule')}</p>}
        </section>
        <p className="seller-note">
          <Icon name="info" size={18} />
          <span>{t('seller.productForm.versionNote')}</span>
        </p>
      </aside>
    </div>
  );
}

/**
 * /seller/products/new          — Thêm sản phẩm (POST /shops/{shopId}/products, tạo xong là Bản nháp; có nút "Lưu & đăng bán")
 * /seller/products/:productId   — Sửa sản phẩm (mỗi phần lưu riêng bằng API tương ứng, kèm version)
 * Bố cục: [thông tin cơ bản / hình ảnh / phân loại & SKU] | [cột phải: trạng thái + nút đăng bán]
 */
function ProductEditorScreen({ onNotify }) {
  const { t } = useLanguage();
  const { productId } = useParams();
  const { shopId } = useSeller();
  const isNew = !productId;

  return (
    <SellerPage
      title={isNew ? t('seller.productForm.createTitle') : t('seller.productForm.editTitle')}
      subtitle={isNew ? t('seller.productForm.createSubtitle') : undefined}
      back={{ to: '/seller/products', label: t('seller.nav.products') }}
    >
      <RequireShop>
        {isNew ? <CreateForm key={shopId} shopId={shopId} onNotify={onNotify} /> : <EditForm key={`${shopId}-${productId}`} shopId={shopId} productId={productId} onNotify={onNotify} />}
      </RequireShop>
    </SellerPage>
  );
}

export default ProductEditorScreen;
