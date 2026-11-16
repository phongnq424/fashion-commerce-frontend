// Cấu hình menu: chỉ lưu KEY dịch, không lưu chữ. Header, trang danh mục và breadcrumb đọc từ đây.
//
// - to: đường dẫn trang (React Router). Trang chủ là '/'.
// - id: mã danh mục, dùng trong đường dẫn /category/<id> và để lọc sản phẩm.
//
// Backend (GET /catalog/categories) chỉ có 3 danh mục gốc: Áo, Quần, Đầm & Váy.
// KHÔNG có danh mục con (parentId luôn null) -> menu không còn dropdown con.
// Map id <-> slug Backend nằm trong mappers/categoryMapper.js.
export const MAIN_NAV = [
  { key: 'nav.home', to: '/' },
  { id: 'tops', key: 'nav.tops', to: '/category/tops' },
  { id: 'bottoms', key: 'nav.bottoms', to: '/category/bottoms' },
  { id: 'dresses', key: 'nav.dresses', to: '/category/dresses' },
  { key: 'nav.contact', to: '/contact' },
];

// Chỉ các mục là danh mục sản phẩm (có id)
export const CATEGORY_NAV = MAIN_NAV.filter((item) => item.id);

// Tìm danh mục theo id trên đường dẫn.
// Trả về null nếu không có -> trang danh mục hiện "Không tìm thấy".
export function findCategory(categoryId) {
  const category = CATEGORY_NAV.find((item) => item.id === categoryId);
  return category ? { category } : null;
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
