import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';
import { SORT_OPTIONS } from '../data/catalogConfig';

/**
 * Nút "Sắp xếp: Mặc định ⌄" (màu thương hiệu), cùng hàng với tiêu đề.
 * Dùng <select> thật bên dưới -> bàn phím, trình đọc màn hình, điện thoại đều dùng được.
 */
function SortMenu({ value, onChange }) {
  const { t } = useLanguage();

  return (
    <label className="sort-menu">
      <span className="sort-menu__label">{t('catalog.sortLabel')}</span>
      <span className="sort-menu__value" aria-hidden="true">
        {t(`catalog.sort.${value}`)}
      </span>
      <Icon name="chevronDown" size={16} className="sort-menu__chevron" />
      <select className="sort-menu__select" value={value} onChange={(event) => onChange(event.target.value)}>
        {SORT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {t(`catalog.sort.${option}`)}
          </option>
        ))}
      </select>
    </label>
  );
}

export default SortMenu;
