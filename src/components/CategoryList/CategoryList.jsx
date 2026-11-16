import { useCallback, useMemo, useState } from 'react';
import Icon from '../common/Icon';
import StoryViewer from '../StoryViewer/StoryViewer';
import { CATEGORY_NAV } from '../../constants/navigation';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { CATEGORY_STORIES } from '../../data/categoryStories';
import { useLanguage } from '../../hooks/useLanguage';
import './CategoryList.css';

// =====================================================================
// DANH MỤC NỔI BẬT TRÊN TRANG CHỦ: ảnh tròn có viền màu + tên bên dưới
// Khớp Backend (GET /catalog/categories): chỉ 3 danh mục gốc Áo / Quần / Đầm & Váy, KHÔNG có danh mục con.
// - id:       id danh mục trên menu (constants/navigation.js) -> cũng là khoá tin trong data/categoryStories.js
// - image:    ảnh trong thư mục public/categories/ -> ghi '/categories/ten-anh.jpg'
//             (ảnh vuông là đẹp nhất, vd 400 x 400). Chưa có ảnh / ảnh lỗi -> tự hiện icon.
// - position: phần ảnh ưu tiên giữ lại khi cắt tròn, vd 'center 20%' giữ phần mặt / vai
// - icon:     icon dự phòng khi chưa có ảnh (tên icon trong components/common/Icon.jsx)
// Tên + đường dẫn lấy từ menu -> menu đổi tên thì ô này đổi theo.
// Bấm vào ô -> mở TIN NỔI BẬT dạng pop-up (nội dung tin: data/categoryStories.js)
// =====================================================================
const FEATURED_STYLE = {
  tops: { image: '/categories/ao-thun.jpg', position: 'center 25%', icon: 'tshirt' },
  bottoms: { image: '/categories/quan-jeans.jpg', position: 'center', icon: 'pants' },
  dresses: { image: '/categories/dam.jpg', position: 'center 25%', icon: 'dress' },
};

const FEATURED_CATEGORIES = CATEGORY_NAV.map((item) => ({
  id: item.id,
  labelKey: item.key,
  to: item.to,
  ...FEATURED_STYLE[item.id],
}));

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

// Danh mục đã xem tin -> viền chuyển xám (giống Instagram). Lưu trên trình duyệt.
function readSeen() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.seenStories) ?? '[]'));
  } catch {
    return new Set();
  }
}

function CategoryList() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState(null); // null = đóng | vị trí danh mục đang xem
  const [seen, setSeen] = useState(readSeen);

  // Chỉ những danh mục CÓ tin mới mở pop-up được
  const groups = useMemo(
    () =>
      FEATURED_CATEGORIES.filter((category) => CATEGORY_STORIES[category.id]?.length).map((category) => ({
        id: category.id,
        name: t(category.labelKey),
        avatar: category.image,
        to: category.to,
        slides: CATEGORY_STORIES[category.id],
      })),
    [t],
  );

  const markSeen = useCallback((id) => {
    setSeen((current) => {
      if (current.has(id)) return current;
      const next = new Set(current).add(id);
      try {
        localStorage.setItem(STORAGE_KEYS.seenStories, JSON.stringify([...next]));
      } catch {
        /* bỏ qua */
      }
      return next;
    });
  }, []);

  const closeStory = useCallback(() => setOpenIndex(null), []);

  return (
    <>
      <ul className="category-list">
        {FEATURED_CATEGORIES.map((category) => {
          const groupIndex = groups.findIndex((group) => group.id === category.id);
          const isSeen = seen.has(category.id);
          return (
            <li key={category.id}>
              {/* Cả ô là 1 nút: bấm vào ảnh hay tên đều mở tin nổi bật */}
              <button
                type="button"
                className={`category-item ${isSeen ? 'category-item--seen' : ''}`}
                aria-haspopup="dialog"
                aria-label={t('stories.open', { name: t(category.labelKey) })}
                disabled={groupIndex < 0}
                onClick={() => setOpenIndex(groupIndex)}
              >
                <span className="category-item__ring">
                  <span className="category-item__circle">
                    <CategoryThumb image={category.image} position={category.position} icon={category.icon} />
                  </span>
                </span>
                <span className="category-item__name">{t(category.labelKey)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Chỉ gắn pop-up khi đang mở -> luôn bắt đầu đúng danh mục vừa bấm */}
      {openIndex !== null && (
        <StoryViewer groups={groups} startIndex={openIndex} open onClose={closeStory} onSeen={markSeen} />
      )}
    </>
  );
}

export default CategoryList;
