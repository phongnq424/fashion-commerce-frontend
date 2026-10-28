import { Link } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import './Breadcrumb.css';

/**
 * Thanh đường dẫn "Trang chủ / Danh mục / Áo" hiển thị ngay dưới Header.
 * items: [{ label: 'Trang chủ', to: '/' }, { label: 'Danh mục' }, { label: 'Áo' }]
 *   - Có "to"  -> là link bấm được.
 *   - Không có -> chỉ là chữ.
 *   - Mục cuối luôn là trang hiện tại (aria-current="page"), không phải link.
 */
function Breadcrumb({ items }) {
  const { t } = useLanguage();

  return (
    <nav className="breadcrumb" aria-label={t('breadcrumb.label')}>
      <ol className="breadcrumb__list container">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="breadcrumb__item">
              {isLast ? (
                <span aria-current="page" className="breadcrumb__current">
                  {item.label}
                </span>
              ) : item.to ? (
                <Link to={item.to} className="breadcrumb__link">
                  {item.label}
                </Link>
              ) : (
                <span className="breadcrumb__text">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
