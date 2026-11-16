import { CATEGORY_NAV } from '../../constants/navigation';

// Danh mục cho form sản phẩm. Khớp Backend (GET /catalog/categories): chỉ 3 danh mục gốc
// Áo / Quần / Đầm & Váy, KHÔNG có danh mục con.
// Bản giả lập dùng id của menu site ('tops' | 'bottoms' | 'dresses'), khớp category của mockProducts.
// Khi nối backend: thay bằng GET /catalog/categories (id là UUID).
export function getCategoryOptions(t) {
  return CATEGORY_NAV.map((item) => ({ id: item.id, name: t(item.key) }));
}

// Dữ liệu cũ lưu dạng "tops/tshirts" -> chỉ lấy phần danh mục gốc "tops"
export function categoryLabel(categoryId, t) {
  const rootId = categoryId?.split('/')[0];
  return getCategoryOptions(t).find((item) => item.id === rootId)?.name ?? categoryId ?? '—';
}

// Nhãn phân loại của 1 SKU: { SIZE: 'M', COLOR: 'XAM_TRANG' } -> "M / Xám trắng"
export function variantLabel(product, variant) {
  return product.options
    .map((option) => option.values.find((value) => value.code === variant.selections[option.type])?.label ?? variant.selections[option.type])
    .filter(Boolean)
    .join(' / ');
}
