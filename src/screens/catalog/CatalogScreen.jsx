import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import Breadcrumb from '../../components/common/Breadcrumb';
import Button from '../../components/common/Button';
import Icon from '../../components/common/Icon';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import NotFoundScreen from '../notFound/NotFoundScreen';
import { findCategory } from '../../constants/navigation';
import { useLanguage } from '../../hooks/useLanguage';
import { filterProducts, getCatalogProducts, sortProducts } from '../../services/catalogService';
import CatalogBanner from './components/CatalogBanner';
import CatalogFilters from './components/CatalogFilters';
import SortMenu from './components/SortMenu';
import { COLLECTIONS, OFFERS, PAGE_SIZE, PRICE_RANGES, SORT_OPTIONS } from './data/catalogConfig';
import './CatalogScreen.css';

// Đổi qua lại giữa các danh mục không phải tải lại dữ liệu (giữ 60 giây)
const CACHE_MS = 60_000;
let cached = null; // { at, promise, value }
function loadCatalog(force = false) {
  if (force || !cached || Date.now() - cached.at > CACHE_MS) {
    const entry = { at: Date.now(), promise: getCatalogProducts(), value: null };
    entry.promise.then(
      (value) => {
        entry.value = value;
      },
      () => {
        if (cached === entry) cached = null;
      },
    );
    cached = entry;
  }
  return cached.promise;
}
// Dữ liệu đã tải xong (còn hạn) -> dùng ngay, không hiện khung "đang tải" khi đổi danh mục
const freshValue = () => (cached?.value && Date.now() - cached.at <= CACHE_MS ? cached.value : null);

const readList = (value, allowed) => (value ?? '').split(',').filter((item) => allowed.includes(item));

/**
 * Trang "Danh mục sản phẩm". Dùng chung cho:
 *   /products                 -> tất cả sản phẩm (nút "Xem thêm sản phẩm" của Flash Sale)
 *   /category/tops            -> menu "Áo" trên header
 *   /category/tops/tshirts    -> menu con "Áo thun"
 * Banner đầu trang CỐ ĐỊNH (data/catalogConfig.js). Lọc / sắp xếp chỉ đổi phần sản phẩm bên dưới.
 * Bộ lọc nằm trên đường dẫn (?price=100-200&offer=sale&sort=priceAsc) -> gửi link cho người khác vẫn giữ lọc.
 */
function CatalogScreen({ onAddToCart }) {
  const { t } = useLanguage();
  const { categoryId, subId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const found = categoryId ? findCategory(categoryId, subId) : null;

  const [products, setProducts] = useState(() => freshValue()?.products ?? []);
  const [status, setStatus] = useState(() => (freshValue() ? 'success' : 'loading'));
  const [apiFailed, setApiFailed] = useState(() => freshValue()?.apiFailed ?? false);
  const [filtersOpen, setFiltersOpen] = useState(false); // ngăn bộ lọc trên mobile
  const [visible, setVisible] = useState(PAGE_SIZE);
  const location = useLocation();
  const headRef = useRef(null);

  const priceIds = readList(searchParams.get('price'), PRICE_RANGES.map((range) => range.id));
  const offers = readList(searchParams.get('offer'), OFFERS); // chỉ đến từ link, không có ô tick
  const collectionIds = readList(searchParams.get('collection'), COLLECTIONS.map((item) => item.id));
  const sortParam = searchParams.get('sort');
  const sort = SORT_OPTIONS.includes(sortParam) ? sortParam : 'default';

  const load = useCallback(async (force = false) => {
    if (!force && freshValue()) return; // đã có dữ liệu mới -> khỏi tải lại
    setStatus('loading');
    try {
      const result = await loadCatalog(force);
      setProducts(result.products);
      setApiFailed(result.apiFailed);
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Bấm danh mục ở cột trái -> cuộn về hàng tiêu đề (banner vẫn nằm yên phía trên), chỉ khi đang cuộn quá tiêu đề
  useEffect(() => {
    if (!location.state?.catalogNav || !headRef.current) return;
    const top = headRef.current.getBoundingClientRect().top;
    const headerHeight = document.querySelector('.site-header')?.offsetHeight ?? 0; // header dính trên cùng
    // Tiêu đề bị cuộn mất hoặc nằm khuất dưới header -> kéo về ngay dưới header
    if (top < headerHeight + 8) {
      window.scrollTo({ top: window.scrollY + top - headerHeight - 16, behavior: 'smooth' });
    }
  }, [location.key, location.state]);

  // Đổi bộ lọc / danh mục -> hiện lại từ đầu
  const filterKey = `${categoryId ?? ''}|${subId ?? ''}|${priceIds.join()}|${offers.join()}|${collectionIds.join()}|${sort}`;
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [filterKey]);

  const priceRanges = PRICE_RANGES.filter((range) => priceIds.includes(range.id));
  const collections = COLLECTIONS.filter((item) => collectionIds.includes(item.id));
  const filtered = useMemo(
    () => sortProducts(filterProducts(products, { categoryId, subId, priceRanges, offers, collections }), sort),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filterKey đã gồm đủ các bộ lọc
    [products, filterKey],
  );


  // Ngăn bộ lọc mobile: Esc để đóng, khoá cuộn trang phía sau
  useEffect(() => {
    if (!filtersOpen) return undefined;
    const onKey = (event) => event.key === 'Escape' && setFiltersOpen(false);
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [filtersOpen]);

  const updateParam = (key, values) => {
    const next = new URLSearchParams(searchParams);
    const value = Array.isArray(values) ? values.join(',') : values;
    if (value && value !== 'default') next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const toggleIn = (list, id) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  const togglePrice = (id) => updateParam('price', toggleIn(priceIds, id));
  const toggleOffer = (id) => updateParam('offer', toggleIn(offers, id));
  const toggleCollection = (id) => updateParam('collection', toggleIn(collectionIds, id));
  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('price');
    next.delete('offer');
    next.delete('collection');
    setSearchParams(next, { replace: true });
  };

  // Sai đường dẫn, vd /category/abc
  if (categoryId && !found) return <NotFoundScreen />;

  const category = found?.category ?? null;
  const sub = found?.sub ?? null;
  const title = sub ? t(sub.key) : category ? t(category.key) : t('catalog.title');

  // Trang chủ / Danh mục sản phẩm / Áo / Áo thun
  const breadcrumb = [
    { label: t('breadcrumb.home'), to: '/' },
    { label: t('catalog.title'), to: category ? '/products' : undefined },
    category && { label: t(category.key), to: sub ? category.to : undefined },
    sub && { label: t(sub.key) },
  ].filter(Boolean);

  // Chip "đang lọc" phía trên lưới (bấm ✕ để bỏ)
  const activeChips = [
    ...priceRanges.map((range) => ({
      key: `price-${range.id}`,
      label: t(`catalog.price.${range.id}`),
      remove: () => togglePrice(range.id),
    })),
    ...collections.map((collection) => ({
      key: `collection-${collection.id}`,
      label: t(`catalog.collections.${collection.id}`),
      remove: () => toggleCollection(collection.id),
    })),
    // Lọc ưu đãi chỉ đến từ link (vd ?offer=sale) -> vẫn hiện chip để khách bỏ được
    ...offers.map((offer) => ({
      key: `offer-${offer}`,
      label: t(`catalog.offers.${offer}`),
      remove: () => toggleOffer(offer),
    })),
  ];

  const shown = filtered.slice(0, visible);

  return (
    <>
      {/* Đường dẫn nằm TRÊN banner, cùng kiểu với các trang khác: TRANG CHỦ / DANH MỤC SẢN PHẨM */}
      <Breadcrumb items={breadcrumb} />
      <CatalogBanner />

      <section className="catalog container" aria-labelledby="catalog-title">
        {/* Hàng tiêu đề: tên danh mục (trái) | Bộ lọc (mobile) + Sắp xếp (phải) */}
        <header ref={headRef} className="catalog__head">
          <div className="catalog__heading">
            <h1 id="catalog-title" className="catalog__title">
              {title}
            </h1>
            {/* Số sản phẩm không hiện ra ngoài, chỉ đọc cho trình đọc màn hình khi lọc */}
            {status === 'success' && (
              <p className="visually-hidden" aria-live="polite">
                {t('catalog.count', { count: filtered.length })}
              </p>
            )}
          </div>

          <div className="catalog__tools">
            <button
              type="button"
              className="catalog__filter-toggle"
              onClick={() => setFiltersOpen(true)}
              aria-expanded={filtersOpen}
              aria-controls="catalog-filters"
            >
              <Icon name="filter" size={18} />
              {t('catalog.filters')}
              {activeChips.length > 0 && <span className="catalog__filter-badge">{activeChips.length}</span>}
            </button>
            <SortMenu value={sort} onChange={(value) => updateParam('sort', value)} />
          </div>
        </header>

        <div className="catalog__layout">
          {filtersOpen && (
            <button
              type="button"
              className="catalog__backdrop"
              aria-label={t('common.close')}
              onClick={() => setFiltersOpen(false)}
            />
          )}

          <CatalogFilters
            id="catalog-filters"
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            priceIds={priceIds}
            collectionIds={collectionIds}
            onTogglePrice={togglePrice}
            onToggleCollection={toggleCollection}
            onClear={clearFilters}
            hasFilters={activeChips.length > 0}
            resultCount={filtered.length}
          />

          <div className="catalog__main">
            {apiFailed && status === 'success' && (
              <p className="catalog__notice" role="status">
                <Icon name="info" size={16} />
                {t('catalog.apiFailed')}
              </p>
            )}

            {activeChips.length > 0 && (
              <div className="catalog__chips">
                {activeChips.map((chip) => (
                  <button key={chip.key} type="button" className="catalog__chip" onClick={chip.remove}>
                    {chip.label}
                    <Icon name="close" size={14} />
                    <span className="visually-hidden">{t('catalog.removeFilter')}</span>
                  </button>
                ))}
                <button type="button" className="catalog__chip-clear" onClick={clearFilters}>
                  {t('catalog.clearAll')}
                </button>
              </div>
            )}

            {status === 'success' && filtered.length === 0 ? (
              <div className="catalog__empty">
                <Icon name="search" size={40} />
                <p>{t('catalog.empty')}</p>
                {activeChips.length > 0 && (
                  <Button variant="outline" onClick={clearFilters}>
                    {t('catalog.clearAll')}
                  </Button>
                )}
              </div>
            ) : (
              <ProductGrid
                products={shown}
                status={status}
                columns={4}
                skeletonCount={8}
                errorMessage={t('category.error')}
                emptyMessage={t('catalog.empty')}
                onRetry={() => load(true)}
                onAddToCart={onAddToCart}
              />
            )}

            {status === 'success' && filtered.length > visible && (
              <div className="catalog__more">
                <p>{t('catalog.showing', { shown: shown.length, total: filtered.length })}</p>
                <Button variant="outline" onClick={() => setVisible((count) => count + PAGE_SIZE)}>
                  {t('catalog.loadMore')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default CatalogScreen;
