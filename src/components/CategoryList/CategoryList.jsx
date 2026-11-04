import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { useLanguage } from '../../hooks/useLanguage';
import './CategoryList.css';

// =====================================================================
// DANH MỤC NỔI BẬT TRÊN TRANG CHỦ: ảnh tròn có viền màu + tên bên dưới
// - image:    ảnh trong thư mục public/categories/ -> ghi '/categories/ten-anh.jpg'
//             (ảnh vuông là đẹp nhất, vd 400 x 400). Chưa có ảnh / ảnh lỗi -> tự hiện icon.
// - position: phần ảnh ưu tiên giữ lại khi cắt tròn, vd 'center 20%' giữ phần mặt / vai
// - icon:     icon dự phòng khi chưa có ảnh (tên icon trong components/common/Icon.jsx)
// - labelKey: dùng LẠI chữ của menu (navSub trong vi.js, en.js) -> menu đổi tên thì ô này đổi theo
// - to:       trang danh mục tương ứng
// Muốn đổi / thêm / bớt ô: sửa mảng này.
// =====================================================================
const FEATURED_CATEGORIES = [
  {
    id: 'tshirts',
    image: '/categories/ao-thun.jpg',
    position: 'center 25%',
    icon: 'tshirt',
    labelKey: 'navSub.tops.tshirts',
    to: '/category/tops/tshirts',
  },
  {
    id: 'shirts',
    image: '/categories/ao-so-mi.jpg',
    position: 'center 25%',
    icon: 'shirt',
    labelKey: 'navSub.tops.shirts',
    to: '/category/tops/shirts',
  },
  {
    id: 'jackets',
    image: '/categories/ao-khoac.jpg',
    position: 'center 25%',
    icon: 'jacket',
    labelKey: 'navSub.tops.jackets',
    to: '/category/tops/jackets',
  },
  {
    id: 'jeans',
    image: '/categories/quan-jeans.jpg',
    position: 'center',
    icon: 'pants',
    labelKey: 'navSub.bottoms.jeans',
    to: '/category/bottoms/jeans',
  },
  {
    id: 'dresses',
    image: '/categories/dam.jpg',
    position: 'center 25%',
    icon: 'dress',
    labelKey: 'navSub.dresses.midi',
    to: '/category/dresses/midi',
  },
  {
    id: 'skirts',
    image: '/categories/vay.jpg',
    position: 'center',
    icon: 'skirt',
    labelKey: 'navSub.dresses.miniSkirts',
    to: '/category/dresses/miniSkirts',
  },
];

// Ảnh trong vòng tròn. Lỗi ảnh -> thay bằng icon (khung không bị trống / vỡ hình)
function CategoryThumb({ image, position, icon }) {
  const [failed, setFailed] = useState(false);
  if (!image || failed) return <Icon name={icon} size={48} strokeWidth={1.2} />;
  return (
    <img
      src={image}
      alt="" // tên danh mục đã có chữ bên dưới -> ảnh chỉ trang trí
      className="category-item__image"
      style={{ objectPosition: position }}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function CategoryList() {
  const { t } = useLanguage();

  return (
    <ul className="category-list">
      {FEATURED_CATEGORIES.map((category) => (
        <li key={category.id}>
          {/* Cả ô là 1 link: bấm vào ảnh hay tên đều được */}
          <Link to={category.to} className="category-item">
            <span className="category-item__ring">
              <span className="category-item__circle">
                <CategoryThumb image={category.image} position={category.position} icon={category.icon} />
              </span>
            </span>
            <span className="category-item__name">{t(category.labelKey)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default CategoryList;
