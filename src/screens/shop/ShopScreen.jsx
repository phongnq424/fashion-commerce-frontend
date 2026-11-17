import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Breadcrumb from '../../components/common/Breadcrumb';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import ShopCard from '../../components/ShopCard/ShopCard';
import NotFoundScreen from '../notFound/NotFoundScreen';
import { useLanguage } from '../../hooks/useLanguage';
import { getPublicShop } from '../../services/publicShopService';
import '../collection/CollectionScreen.css';
import './ShopScreen.css';

// Sắp xếp trong trang shop (làm trên trình duyệt vì danh sách đã tải đủ)
const SORTS = {
  newest: (a, b) => String(b.publishedAt ?? '').localeCompare(String(a.publishedAt ?? '')),
  priceAsc: (a, b) => a.price - b.price,
  priceDesc: (a, b) => b.price - a.price,
};

/**
 * Trang gian hàng: /shop/:shopId — mọi sản phẩm đang bán của 1 shop, lọc theo danh mục, sắp xếp.
 * Dữ liệu: services/publicShopService.js (suy ra từ GET /products vì Backend chưa có API shop công khai).
 * Shop bị khoá / đóng -> Backend không trả sản phẩm -> hiện "Không tìm thấy".
 */
function ShopScreen({ onAddToCart }) {
  const { t } = useLanguage();
  const { shopId } = useParams();
  const [shop, setShop] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | success | error | notFound
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('newest');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await getPublicShop(shopId);
      setShop(data);
      setStatus(data ? 'success' : 'notFound');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }, [shopId]);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => {
    const ids = new Set((shop?.products ?? []).map((p) => p.categoryRouteId).filter(Boolean));
    return ['tops', 'bottoms', 'dresses'].filter((id) => ids.has(id));
  }, [shop]);

  const products = useMemo(() => {
    const list = (shop?.products ?? []).filter((p) => category === 'all' || p.categoryRouteId === category);
    return [...list].sort(SORTS[sort]);
  }, [shop, category, sort]);

  if (status === 'notFound') return <NotFoundScreen />;

  return (
    <>
      <Breadcrumb items={[{ label: t('breadcrumb.home'), to: '/' }, { label: shop?.name ?? t('common.loading') }]} />

      <section className="category-page container shop-page" aria-labelledby="shop-title">
        <h1 id="shop-title" className="visually-hidden">
          {shop?.name ?? t('common.loading')}
        </h1>
        {shop && <ShopCard shop={shop} showLink={false} as="div" />}

        {status === 'success' && (
          <div className="shop-page__toolbar">
            <div className="category-page__filters" role="group" aria-label={t('market.shop.filterLabel')}>
              {['all', ...categories].map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`category-chip ${category === id ? 'is-active' : ''}`}
                  aria-pressed={category === id}
                  onClick={() => setCategory(id)}
                >
                  {id === 'all' ? t('market.shop.allProducts') : t(`nav.${id}`)}
                </button>
              ))}
            </div>
            <label className="shop-page__sort">
              <span>{t('market.shop.sortLabel')}</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                {Object.keys(SORTS).map((id) => (
                  <option key={id} value={id}>
                    {t(`market.shop.sort.${id}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <ProductGrid
          products={products}
          status={status === 'notFound' ? 'success' : status}
          columns={5}
          skeletonCount={10}
          errorMessage={t('market.shop.error')}
          emptyMessage={t('market.shop.empty')}
          onRetry={load}
          onAddToCart={onAddToCart}
        />
      </section>
    </>
  );
}

export default ShopScreen;
