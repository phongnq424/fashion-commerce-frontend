// Cấu hình menu: chỉ lưu KEY dịch, không lưu chữ. Header, trang danh mục và breadcrumb đọc từ đây.
//
// - to:       đường dẫn trang (React Router). Trang chủ là '/'.
// - id:       mã danh mục, dùng trong đường dẫn /category/<id> và để lọc sản phẩm.
// - children: danh sách con (hiện mũi tên ⌄). Mỗi mục con có id riêng -> /category/<id>/<idCon>
//
// Muốn thêm mục con: thêm 1 dòng vào children + thêm chữ trong vi.js/en.js (mục navSub).
const sub = (categoryId, id) => ({
  id,
  key: `navSub.${categoryId}.${id}`,
  to: `/category/${categoryId}/${id}`,
});

export const MAIN_NAV = [
  { key: 'nav.home', to: '/' },
  {
    id: 'tops',
    key: 'nav.tops',
    to: '/category/tops', // link "Tất cả Áo" ở đầu danh sách con
    children: [
      sub('tops', 'tshirts'),
      sub('tops', 'shirts'),
      sub('tops', 'polos'),
      sub('tops', 'knitwear'),
      sub('tops', 'jackets'),
    ],
  },
  {
    id: 'bottoms',
    key: 'nav.bottoms',
    to: '/category/bottoms',
    children: [
      sub('bottoms', 'jeans'),
      sub('bottoms', 'trousers'),
      sub('bottoms', 'wideLeg'),
      sub('bottoms', 'shorts'),
    ],
  },
  {
    id: 'dresses',
    key: 'nav.dresses',
    to: '/category/dresses',
    children: [
      sub('dresses', 'midi'),
      sub('dresses', 'maxi'),
      sub('dresses', 'miniSkirts'),
      sub('dresses', 'longSkirts'),
    ],
  },
  { key: 'nav.contact', to: '/contact' },
];

// Tìm danh mục (và danh mục con nếu có) theo id trên đường dẫn.
// Trả về null nếu không có -> trang danh mục hiện "Không tìm thấy".
export function findCategory(categoryId, subId) {
  const category = MAIN_NAV.find((item) => item.id === categoryId && item.children);
  if (!category) return null;
  if (!subId) return { category, sub: null };
  const subCategory = category.children.find((child) => child.id === subId);
  return subCategory ? { category, sub: subCategory } : null;
}

export const FOOTER_NAV = [
  {
    titleKey: 'footer.support',
    links: [
      { key: 'footer.contact', href: '#contact' },
      { key: 'footer.sizeGuide', href: '#size-guide' },
      { key: 'footer.returnPolicy', href: '#returns' },
      { key: 'footer.faq', href: '#faq' },
    ],
  },
  {
    titleKey: 'footer.about',
    links: [
      { key: 'footer.story', href: '#story' },
      { key: 'footer.stores', href: '#stores' },
      { key: 'footer.careers', href: '#careers' },
    ],
  },
];
