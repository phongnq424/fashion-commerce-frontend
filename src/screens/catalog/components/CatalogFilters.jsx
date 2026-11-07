import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';
import { COLLECTIONS, PRICE_RANGES } from '../data/catalogConfig';

/**
 * Cột bộ lọc bên trái (desktop) / ngăn kéo từ trái ra (mobile, bấm nút "Bộ lọc").
 * 2 nhóm ô tick: Chọn mức giá | Bộ sưu tập (vd BST Tết 2027)
 * Danh mục (Áo, Quần...) chọn bằng menu trên header.
 * Mỗi ô được tick -> hiện thành 1 chip phía trên lưới sản phẩm (vd "Dưới 100.000đ ✕").
 */
function CatalogFilters({
  id,
  open,
  onClose,
  priceIds,
  collectionIds,
  onTogglePrice,
  onToggleCollection,
  onClear,
  hasFilters,
  resultCount,
}) {
  const { t } = useLanguage();

  return (
    <aside id={id} className={`catalog-filters ${open ? 'is-open' : ''}`} aria-label={t('catalog.filters')}>
      <div className="catalog-filters__mobile-head">
        <p className="catalog-filters__mobile-title">{t('catalog.filters')}</p>
        <button type="button" className="catalog-filters__close" onClick={onClose} aria-label={t('common.close')}>
          <Icon name="close" size={20} />
        </button>
      </div>

      <div className="catalog-filters__scroll">
        {/* ----- Chọn mức giá ----- */}
        <fieldset className="catalog-filters__group">
          <legend className="catalog-filters__title">{t('catalog.priceTitle')}</legend>
          {PRICE_RANGES.map((range) => (
            <label key={range.id} className="catalog-check">
              <input type="checkbox" checked={priceIds.includes(range.id)} onChange={() => onTogglePrice(range.id)} />
              <span>{t(`catalog.price.${range.id}`)}</span>
            </label>
          ))}
        </fieldset>

        {/* ----- Bộ sưu tập ----- */}
        <fieldset className="catalog-filters__group">
          <legend className="catalog-filters__title">{t('catalog.collectionsTitle')}</legend>
          {COLLECTIONS.map((collection) => (
            <label key={collection.id} className="catalog-check">
              <input
                type="checkbox"
                checked={collectionIds.includes(collection.id)}
                onChange={() => onToggleCollection(collection.id)}
              />
              <span>{t(`catalog.collections.${collection.id}`)}</span>
            </label>
          ))}
        </fieldset>

        {hasFilters && (
          <button type="button" className="catalog-filters__clear" onClick={onClear}>
            <Icon name="refresh" size={14} />
            {t('catalog.clearAll')}
          </button>
        )}
      </div>

      {/* Mobile: nút xem kết quả ở đáy ngăn kéo */}
      <div className="catalog-filters__mobile-foot">
        <Button variant="outline" onClick={onClear} disabled={!hasFilters}>
          {t('catalog.clearAll')}
        </Button>
        <Button onClick={onClose}>{t('catalog.showResults', { count: resultCount })}</Button>
      </div>
    </aside>
  );
}

export default CatalogFilters;
