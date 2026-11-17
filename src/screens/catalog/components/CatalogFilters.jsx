import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';
import { PRICE_RANGES } from '../data/catalogConfig';

/**
 * Cột bộ lọc bên trái (desktop) / ngăn kéo từ trái ra (mobile, bấm nút "Bộ lọc").
 * 2 nhóm ô tick: Chọn mức giá | Shop bán (các shop đang có sản phẩm trên sàn)
 * Danh mục (Áo, Quần...) chọn bằng menu trên header.
 * Mỗi ô được tick -> hiện thành 1 chip phía trên lưới sản phẩm (vd "Dưới 100.000đ ✕").
 */
function CatalogFilters({
  id,
  open,
  onClose,
  priceIds,
  shops = [],
  shopIds = [],
  onTogglePrice,
  onToggleShop,
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

        {/* ----- Shop bán ----- */}
        {shops.length > 1 && (
          <fieldset className="catalog-filters__group">
            <legend className="catalog-filters__title">{t('market.shop.filterTitle')}</legend>
            {shops.map((shop) => (
              <label key={shop.id} className="catalog-check">
                <input type="checkbox" checked={shopIds.includes(shop.id)} onChange={() => onToggleShop(shop.id)} />
                <span>
                  {shop.name} <span className="catalog-check__count">({shop.count})</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

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
