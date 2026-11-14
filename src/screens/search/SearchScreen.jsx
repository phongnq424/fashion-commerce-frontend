import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Breadcrumb from '../../components/common/Breadcrumb';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Icon from '../../components/common/Icon';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import { MAIN_NAV } from '../../constants/navigation';
import { useLanguage } from '../../hooks/useLanguage';
import {
  SEARCH_OFFERS,
  SEARCH_PAGE_SIZE,
  SEARCH_PRICE_PRESETS,
  SEARCH_SORTS,
  searchProducts,
} from '../../services/searchService';
import { formatPrice } from '../../utils/format';
import SearchFilters from './components/SearchFilters';
import './SearchScreen.css';

// Danh mục lấy từ menu (constants/navigation.js) -> khớp với category / subcategory trong mockProducts.js
const CATEGORIES = MAIN_NAV.filter((item) => item.children);

// Đọc bộ lọc từ đường dẫn:
// /search?q=ao&category=tops&sub=tshirts&min=200000&max=500000&offer=sale,new&inStock=1&sort=priceAsc
function readFilters(params) {
  const number = (value) => (value && /^\d+$/.test(value) ? Number(value) : null);
  const category = CATEGORIES.find((item) => item.id === params.get('category'));
  const sub = category?.children.find((child) => child.id === params.get('sub'));
  const sort = params.get('sort');
  return {
    q: (params.get('q') ?? '').trim(),
    category: category?.id ?? '',
    sub: sub?.id ?? '',
    minPrice: number(params.get('min')),
    maxPrice: number(params.get('max')),
    offers: (params.get('offer') ?? '').split(',').filter((id) => SEARCH_OFFERS.includes(id)),
    inStock: params.get('inStock') === '1',
    sort: SEARCH_SORTS.includes(sort) ? sort : 'relevance',
  };
}

/**
 * /search?q=... — Trang kết quả tìm kiếm (bố cục phổ biến: bộ lọc cột trái | lưới sản phẩm bên phải).
 * Dữ liệu: DỮ LIỆU GIẢ của frontend (data/mockProducts.js) qua services/searchService.js — không gọi backend.
 * Bộ lọc nằm trên đường dẫn -> gửi link cho người khác vẫn giữ nguyên kết quả.
 */
function SearchScreen({ onAddToCart }) {
  const { t, language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const filterKey = searchParams.toString();

  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [visible, setVisible] = useState(SEARCH_PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Tên danh mục đã dịch -> để tìm "áo thun" ra sản phẩm thuộc danh mục Áo thun
  const categoryLabels = useMemo(() => {
    const labels = {};
    CATEGORIES.forEach((category) => {
      labels[category.id] = t(category.key);
      category.children.forEach((child) => {
        labels[`${category.id}/${child.id}`] = t(child.key);
      });
    });
    return labels;
  }, [t]);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const result = await searchProducts(filters, categoryLabels);
      setProducts(result.items);
      setVisible(SEARCH_PAGE_SIZE);
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filterKey đại diện cho filters
  }, [filterKey, categoryLabels]);

  useEffect(() => {
    load();
  }, [load]);

  // Đổi bộ lọc trên đường dẫn (giá trị rỗng -> xoá khỏi đường dẫn)
  const update = (changes) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      const text = Array.isArray(value) ? value.join(',') : value;
      if (text === null || text === undefined || text === '' || text === false) next.delete(key);
      else next.set(key, text === true ? '1' : String(text));
    });
    setSearchParams(next, { replace: true });
  };

  const clearAll = () => setSearchParams(filters.q ? { q: filters.q } : {}, { replace: true });

  // Chip "đang lọc"
  const category = CATEGORIES.find((item) => item.id === filters.category);
  const sub = category?.children.find((child) => child.id === filters.sub);
  const priceLabel =
    filters.minPrice || filters.maxPrice
      ? [
          filters.minPrice ? formatPrice(filters.minPrice, language) : '0',
          filters.maxPrice ? formatPrice(filters.maxPrice, language) : '∞',
        ].join(' – ')
      : null;
  const chips = [
    category && {
      key: 'category',
      label: sub ? t(sub.key) : t(category.key),
      remove: () => update({ category: '', sub: '' }),
    },
    priceLabel && { key: 'price', label: priceLabel, remove: () => update({ min: '', max: '' }) },
    ...filters.offers.map((offer) => ({
      key: `offer-${offer}`,
      label: t(`searchPage.offers.${offer}`),
      remove: () => update({ offer: filters.offers.filter((item) => item !== offer) }),
    })),
    filters.inStock && { key: 'stock', label: t('searchPage.inStock'), remove: () => update({ inStock: false }) },
  ].filter(Boolean);

  const title = filters.q ? t('searchPage.resultsFor', { query: filters.q }) : t('searchPage.allProducts');
  const shown = products.slice(0, visible);

  return (
    <>
      <Breadcrumb items={[{ label: t('breadcrumb.home'), to: '/' }, { label: t('searchPage.breadcrumb') }]} />

      <section className="search-page container" aria-labelledby="search-title">
        <header className="search-page__head">
          <div>
            <h1 id="search-title" className="search-page__title">
              {title}
            </h1>
            {status === 'success' && (
              <p className="search-page__count" aria-live="polite">
                {t('searchPage.count', { count: products.length })}
              </p>
            )}
          </div>
          <div className="search-page__tools">
            <button
              type="button"
              className="search-page__filter-btn"
              onClick={() => setFiltersOpen(true)}
              aria-expanded={filtersOpen}
              aria-controls="search-filters"
            >
              <Icon name="filter" size={18} />
              {t('catalog.filters')}
              {chips.length > 0 && <span className="search-page__badge">{chips.length}</span>}
            </button>
            <label className="search-sort">
              <span className="search-sort__label">{t('searchPage.sortBy')}</span>
              <select
                value={filters.sort}
                onChange={(event) => update({ sort: event.target.value === 'relevance' ? '' : event.target.value })}
              >
                {SEARCH_SORTS.map((sort) => (
                  <option key={sort} value={sort}>
                    {t(`searchPage.sorts.${sort}`)}
                  </option>
                ))}
              </select>
              <Icon name="chevronDown" size={16} />
            </label>
          </div>
        </header>

        <div className="search-page__layout">
          {filtersOpen && (
            <button
              type="button"
              className="search-page__backdrop"
              aria-label={t('common.close')}
              onClick={() => setFiltersOpen(false)}
            />
          )}

          <SearchFilters
            id="search-filters"
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            filters={filters}
            categories={CATEGORIES}
            pricePresets={SEARCH_PRICE_PRESETS}
            onChange={update}
            onClear={clearAll}
            hasFilters={chips.length > 0}
          />

          <div className="search-page__main">
            {chips.length > 0 && (
              <div className="search-chips">
                {chips.map((chip) => (
                  <button key={chip.key} type="button" className="search-chips__chip" onClick={chip.remove}>
                    {chip.label}
                    <Icon name="close" size={14} />
                    <span className="visually-hidden">{t('catalog.removeFilter')}</span>
                  </button>
                ))}
                <button type="button" className="search-chips__clear" onClick={clearAll}>
                  {t('catalog.clearAll')}
                </button>
              </div>
            )}

            {status === 'success' && products.length === 0 ? (
              <div className="search-empty">
                <EmptyState
                  icon="search"
                  title={filters.q ? t('searchPage.emptyTitle', { query: filters.q }) : t('searchPage.emptyNoQuery')}
                  text={t('searchPage.emptyText')}
                  action={
                    chips.length > 0 ? (
                      <Button variant="outline" onClick={clearAll}>
                        {t('catalog.clearAll')}
                      </Button>
                    ) : undefined
                  }
                />
                <ul className="search-empty__tips">
                  <li>{t('searchPage.tips.spelling')}</li>
                  <li>{t('searchPage.tips.general')}</li>
                  <li>{t('searchPage.tips.fewer')}</li>
                </ul>
              </div>
            ) : (
              <ProductGrid
                products={shown}
                status={status}
                columns={4}
                skeletonCount={8}
                errorMessage={t('category.error')}
                emptyMessage={t('catalog.empty')}
                onRetry={load}
                onAddToCart={onAddToCart}
              />
            )}

            {status === 'success' && products.length > visible && (
              <div className="search-page__more">
                <p className="search-page__count">
                  {t('catalog.showing', { shown: shown.length, total: products.length })}
                </p>
                <Button variant="outline" onClick={() => setVisible((count) => count + SEARCH_PAGE_SIZE)}>
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

export default SearchScreen;
