import { useEffect, useState } from 'react';
import { getCategories } from '../productService';

// Danh mục cho form sản phẩm: GET /catalog/categories (id là UUID). Backend chỉ có danh mục gốc.
export function useCategoryOptions() {
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    let active = true;
    getCategories()
      .then((list) => active && setCategories(list.map((item) => ({ id: item.id, name: item.name }))))
      .catch((error) => console.warn('[Seller] Không tải được danh mục', error));
    return () => {
      active = false;
    };
  }, []);
  return categories;
}

export function categoryLabel(categoryId, categories) {
  return categories.find((item) => item.id === categoryId)?.name ?? '—';
}

// Nhãn phân loại của 1 SKU: { SIZE: 'M', COLOR: 'XAM_TRANG' } -> "M / Xám trắng"
export function variantLabel(product, variant) {
  return (product.options ?? [])
    .map((option) => option.values.find((value) => value.code === variant.selections?.[option.type])?.label ?? variant.selections?.[option.type])
    .filter(Boolean)
    .join(' / ');
}
