import { MAIN_NAV } from '../../constants/navigation';

// Danh mục cho form sản phẩm. Bản giả lập dùng menu của site (constants/navigation.js):
// id = "<nhóm>/<mục con>" (vd "tops/tshirts"), khớp category/subcategory của mockProducts.
// Khi nối backend: thay bằng GET /catalog/categories (id là UUID).
// Danh mục có trong mockProducts nhưng không nằm trên menu site (vd túi tote) — thêm riêng
const EXTRA_CATEGORIES = ['accessories/bags'];

export function getCategoryOptions(t) {
  const fromNav = MAIN_NAV.filter((item) => item.children).flatMap((group) =>
    group.children.map((child) => ({ id: `${group.id}/${child.id}`, name: `${t(group.key)} › ${t(child.key)}` })),
  );
  return [...fromNav, ...EXTRA_CATEGORIES.map((id) => ({ id, name: t(`admin.extraCategories.${id.replace('/', '_')}`) }))];
}

export function categoryLabel(categoryId, t) {
  return getCategoryOptions(t).find((item) => item.id === categoryId)?.name ?? categoryId ?? '—';
}

// Nhãn phân loại của 1 SKU: { SIZE: 'M', COLOR: 'XAM_TRANG' } -> "M / Xám trắng"
export function variantLabel(product, variant) {
  return product.options
    .map((option) => option.values.find((value) => value.code === variant.selections[option.type])?.label ?? variant.selections[option.type])
    .filter(Boolean)
    .join(' / ');
}
