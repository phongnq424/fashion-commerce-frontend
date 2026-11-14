import { useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';
import { SEARCH_OFFERS } from '../../../services/searchService';

/**
 * Cột bộ lọc trang tìm kiếm. Máy tính: cột trái. Mobile: ngăn trượt từ trái (open / onClose).
 * Các nhóm lọc khớp với trường có trong data/mockProducts.js:
 *   Danh mục (category / subcategory) • Khoảng giá (price) • Ưu đãi (originalPrice, isNew) • Còn hàng (inStock)
 * - categories: MAIN_NAV có children (constants/navigation.js)
 * - onChange({ key: value }) — key là tên tham số trên đường dẫn
 */
function SearchFilters({ id, open, onClose, filters, categories, pricePresets, onChange, onClear, hasFilters }) {
  const { t } = useLanguage();
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');

  useEffect(() => {
    setMin(filters.minPrice ? String(filters.minPrice) : '');
    setMax(filters.maxPrice ? String(filters.maxPrice) : '');
  }, [filters.minPrice, filters.maxPrice]);

  const applyPrice = (event) => {
    event.preventDefault();
    const digits = (value) => value.replace(/\D/g, '');
    let low = digits(min);
    let high = digits(max);
    if (low && high && Number(low) > Number(high)) [low, high] = [high, low];
    onChange({ min: low, max: high });
  };

  const presetActive = (preset) =>
    (preset.min ?? null) === (filters.minPrice ?? null) && (preset.max ?? null) === (filters.maxPrice ?? null);

  const toggleOffer = (offer) =>
    onChange({
      offer: filters.offers.includes(offer) ? filters.offers.filter((item) => item !== offer) : [...filters.offers, offer],
    });

  const categoryOption = (label, categoryId, subId, key) => (
    <label key={key} className="filter-option">
      <input
        type="radio"
        name="search-category"
        checked={filters.category === categoryId && filters.sub === subId}
        onChange={() => onChange({ category: categoryId, sub: subId })}
      />
      <span>{label}</span>
    </label>
  );

  return (
    <aside id={id} className={`search-filters ${open ? 'search-filters--open' : ''}`} aria-label={t('catalog.filters')}>
      <div className="search-filters__head">
        <h2 className="search-filters__title">
          <Icon name="filter" size={18} />
          {t('catalog.filters')}
        </h2>
        <button type="button" className="icon-btn search-filters__close" onClick={onClose} aria-label={t('common.close')}>
          <Icon name="close" />
        </button>
      </div>

      <fieldset className="filter-group">
        <legend className="filter-group__title">{t('searchPage.category')}</legend>
        {categoryOption(t('searchPage.any'), '', '', 'all')}
        {categories.map((category) => (
          <div key={category.id}>
            {categoryOption(t(category.key), category.id, '', category.id)}
            <div className="filter-group__children">
              {category.children.map((child) =>
                categoryOption(t(child.key), category.id, child.id, `${category.id}-${child.id}`),
              )}
            </div>
          </div>
        ))}
      </fieldset>

      <fieldset className="filter-group">
        <legend className="filter-group__title">{t('searchPage.price')}</legend>
        <div className="filter-pills">
          {pricePresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="filter-pill"
              aria-pressed={presetActive(preset)}
              onClick={() =>
                presetActive(preset)
                  ? onChange({ min: '', max: '' })
                  : onChange({ min: preset.min ?? '', max: preset.max ?? '' })
              }
            >
              {t(`searchPage.pricePresets.${preset.id}`)}
            </button>
          ))}
        </div>
        <form className="price-range" onSubmit={applyPrice}>
          <input
            inputMode="numeric"
            className="field__input"
            placeholder={t('searchPage.priceFrom')}
            aria-label={t('searchPage.priceFrom')}
            value={min}
            onChange={(event) => setMin(event.target.value)}
          />
          <span aria-hidden="true">–</span>
          <input
            inputMode="numeric"
            className="field__input"
            placeholder={t('searchPage.priceTo')}
            aria-label={t('searchPage.priceTo')}
            value={max}
            onChange={(event) => setMax(event.target.value)}
          />
          <Button type="submit" variant="soft" size="sm" fullWidth>
            {t('searchPage.apply')}
          </Button>
        </form>
      </fieldset>

      <fieldset className="filter-group">
        <legend className="filter-group__title">{t('searchPage.offer')}</legend>
        {SEARCH_OFFERS.map((offer) => (
          <label key={offer} className="filter-option">
            <input type="checkbox" checked={filters.offers.includes(offer)} onChange={() => toggleOffer(offer)} />
            <span>{t(`searchPage.offers.${offer}`)}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="filter-group">
        <legend className="filter-group__title">{t('searchPage.availability')}</legend>
        <label className="filter-option">
          <input
            type="checkbox"
            checked={filters.inStock}
            onChange={(event) => onChange({ inStock: event.target.checked })}
          />
          <span>{t('searchPage.inStockOnly')}</span>
        </label>
      </fieldset>

      <div className="search-filters__foot">
        <Button variant="outline" fullWidth onClick={onClear} disabled={!hasFilters}>
          {t('catalog.clearAll')}
        </Button>
        <Button fullWidth className="search-filters__done" onClick={onClose}>
          {t('searchPage.showResults')}
        </Button>
      </div>
    </aside>
  );
}

export default SearchFilters;
