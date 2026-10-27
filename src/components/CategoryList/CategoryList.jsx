import Icon from '../common/Icon';
import { useLanguage } from '../../hooks/useLanguage';
import './CategoryList.css';

// Danh mục là nhãn GIAO DIỆN cố định -> dùng key dịch.
// variant quyết định kiểu ô: 'blob' (blob trắng, chữ màu) | 'ring' (nền đậm, viền trắng, chữ trắng)
// (Nếu sau này danh mục lấy từ Backend, hiển thị đúng tên Backend trả về.)
const CATEGORIES = [
  { id: 'tops', labelKey: 'home.categories.tops', variant: 'blob', shape: 1 },
  { id: 'bottoms', labelKey: 'home.categories.bottoms', variant: 'blob', shape: 2 },
  { id: 'dresses', labelKey: 'home.categories.dresses', variant: 'ring', shape: 3 },
  { id: 'accessories', labelKey: 'home.categories.accessories', variant: 'blob', shape: 1 },
];

function CategoryList() {
  const { t } = useLanguage();

  return (
    <ul className="category-list">
      {CATEGORIES.map((category) => (
        <li key={category.id}>
          <a
            href={`#${category.id}`}
            className={`category-tile category-tile--${category.variant} category-tile--${category.id}`}
          >
            <Icon name="flower" size={20} filled className="category-tile__flower" />
            <span className={`category-tile__badge category-tile__badge--shape-${category.shape}`}>
              {t(category.labelKey)}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export default CategoryList;
