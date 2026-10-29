import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { useLanguage } from '../../hooks/useLanguage';
import './CategoryList.css';

// =====================================================================
// DANH MỤC NỔI BẬT TRÊN TRANG CHỦ
// - icon:     tên icon trong components/common/Icon.jsx (tshirt, shirt, jacket, pants, dress, skirt)
// - labelKey: dùng LẠI chữ của menu (nav / navSub trong vi.js, en.js) -> menu đổi tên thì ô này đổi theo
// - to:       trang danh mục tương ứng (cùng đường dẫn với menu)
// Muốn đổi / thêm / bớt ô: sửa mảng này.
// =====================================================================
const FEATURED_CATEGORIES = [
  { id: 'tshirts', icon: 'tshirt', labelKey: 'navSub.tops.tshirts', to: '/category/tops/tshirts' },
  { id: 'shirts', icon: 'shirt', labelKey: 'navSub.tops.shirts', to: '/category/tops/shirts' },
  { id: 'jackets', icon: 'jacket', labelKey: 'navSub.tops.jackets', to: '/category/tops/jackets' },
  { id: 'jeans', icon: 'pants', labelKey: 'navSub.bottoms.jeans', to: '/category/bottoms/jeans' },
  { id: 'dresses', icon: 'dress', labelKey: 'navSub.dresses.midi', to: '/category/dresses/midi' },
  { id: 'skirts', icon: 'skirt', labelKey: 'navSub.dresses.miniSkirts', to: '/category/dresses/miniSkirts' },
];

function CategoryList() {
  const { t } = useLanguage();

  return (
    <ul className="category-list">
      {FEATURED_CATEGORIES.map((category) => (
        <li key={category.id}>
          {/* Cả ô là 1 link: bấm vào vòng tròn, tên hay "Mua ngay" đều được */}
          <Link to={category.to} className="category-item">
            <span className="category-item__circle">
              <Icon name={category.icon} size={52} strokeWidth={1.2} />
            </span>
            <span className="category-item__name">{t(category.labelKey)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default CategoryList;
