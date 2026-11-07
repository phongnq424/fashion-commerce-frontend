import { Link } from 'react-router-dom';
import Icon from './Icon';
import { useLanguage } from '../../hooks/useLanguage';
import './Breadcrumb.css';

/**
 * Thanh đường dẫn "Trang chủ / Danh mục / Áo" hiển thị ngay dưới Header.
 * items: [{ label: 'Trang chủ', to: '/' }, { label: 'Danh mục' }, { label: 'Áo' }]
 *   - Có "to"  -> là link bấm được.
 *   - Không có -> chỉ là chữ.
 *   - Mục cuối luôn là trang hiện tại (aria-current="page"), không phải link.
 * variant:
 *   'default' -> TRANG CHỦ / DANH MỤC (chữ in hoa, dấu /)
 *   'compact' -> 🏠 Trang chủ › Danh mục sản phẩm (dải xám nhạt, dấu ›) — trang Danh mục sản phẩm
 */
function Breadcrumb({ items, variant = 'default' }) {
  const { t } = useLanguage();
  const compact = variant === 'compact';

  return (
    <nav className={`breadcrumb ${compact ? 'breadcrumb--compact' : ''}`} aria-label={t('breadcrumb.label')}>
      <ol className="breadcrumb__list container">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const homeIcon = compact && index === 0 ? <Icon name="home" size={16} filled strokeWidth={1.2} /> : null;
          return (
            <li key={`${item.label}-${index}`} className="breadcrumb__item">
              {isLast ? (
                <span aria-current="page" className="breadcrumb__current">
                  {homeIcon}
                  {item.label}
                </span>
              ) : item.to ? (
                <Link to={item.to} className="breadcrumb__link">
                  {homeIcon}
                  {item.label}
                </Link>
              ) : (
                <span className="breadcrumb__text">
                  {homeIcon}
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
