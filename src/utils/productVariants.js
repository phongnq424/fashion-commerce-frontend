// Tiện ích cho biến thể (variant = 1 tổ hợp size + màu, có giá + tồn kho riêng).
// Dùng chung cho dữ liệu Backend (product.source === 'api') và dữ liệu mock.

const same = (a, b) => String(a ?? '').trim().toUpperCase() === String(b ?? '').trim().toUpperCase();

// Màu dự phòng khi Backend không gửi hexColor: đoán theo TÊN màu (tiếng Việt / tiếng Anh).
// Thứ tự quan trọng: cụm dài ("xanh navy") phải đứng trước cụm ngắn ("xanh").
const COLOR_NAME_HEX = [
  ['xanh navy', '#1f2a4d'], ['navy', '#1f2a4d'],
  ['xanh than', '#1f2a4d'], ['xanh đen', '#1b2433'],
  ['xanh rêu', '#5b6b3a'], ['rêu', '#5b6b3a'], ['olive', '#6b6b3a'],
  ['xanh lá', '#3f8f4f'], ['green', '#3f8f4f'],
  ['xanh ngọc', '#2bb3a3'], ['mint', '#a8e6cf'],
  ['xanh dương', '#2f6fd6'], ['xanh biển', '#2f6fd6'], ['blue', '#2f6fd6'],
  ['xanh da trời', '#87bfff'], ['xanh nhạt', '#a9c9f0'],
  ['xanh', '#3a6fc4'],
  ['đỏ đô', '#5a1420'], ['đỏ rượu', '#5a1420'], ['burgundy', '#5a1420'], ['wine', '#5a1420'],
  ['đỏ', '#c8292c'], ['red', '#c8292c'],
  ['hồng sữa', '#f1cdc9'], ['hồng phấn', '#f5c6d0'], ['hồng', '#ef8fb1'], ['pink', '#ef8fb1'],
  ['tím', '#7b4fa3'], ['purple', '#7b4fa3'], ['lavender', '#c7b8ea'],
  ['cam', '#f08a24'], ['orange', '#f08a24'],
  ['vàng', '#f2c94c'], ['yellow', '#f2c94c'],
  ['kem', '#f3ead3'], ['cream', '#f3ead3'], ['ivory', '#f6f1e1'],
  ['be', '#d9c3a0'], ['beige', '#d9c3a0'],
  ['nâu', '#7a5233'], ['brown', '#7a5233'], ['camel', '#b5824d'], ['bò', '#b5824d'],
  ['ghi', '#9a9a9a'], ['xám', '#8e8e93'], ['grey', '#8e8e93'], ['gray', '#8e8e93'],
  ['đen', '#1b1b1b'], ['black', '#1b1b1b'],
  ['trắng', '#ffffff'], ['white', '#ffffff'],
];

export function guessColorHex(...names) {
  for (const raw of names) {
    const name = String(raw ?? '').toLowerCase();
    if (!name) continue;
    const match = COLOR_NAME_HEX.find(([keyword]) => name.includes(keyword));
    if (match) return match[1];
  }
  return null;
}

// Mã (code) của size theo nhãn đang hiển thị. Mock không có code -> dùng luôn nhãn.
function sizeCode(product, sizeLabel) {
  const option = product.sizeOptions?.find((item) => item.label === sizeLabel);
  return option?.code ?? sizeLabel;
}

function colorCode(product, colorId) {
  const color = product.colors?.find((item) => item.id === colorId);
  return color?.code ?? colorId;
}

// Biến thể khớp với size + màu đang chọn. Trả về null nếu chưa chọn đủ hoặc sản phẩm mock.
export function findVariant(product, { size, colorId }) {
  const variants = product.variants ?? [];
  if (!variants.length) return null;
  const needSize = (product.sizes?.length ?? 0) > 0;
  const needColor = (product.colors?.length ?? 0) > 0;
  if ((needSize && !size) || (needColor && !colorId)) return null;

  return (
    variants.find(
      (variant) =>
        (!needSize || same(variant.selections?.SIZE, sizeCode(product, size))) &&
        (!needColor || same(variant.selections?.COLOR, colorCode(product, colorId))),
    ) ?? null
  );
}

// Size này còn hàng không (khi đã chọn màu thì chỉ xét biến thể cùng màu).
// Sản phẩm mock không có variants -> luôn coi là còn hàng theo product.inStock.
export function isSizeAvailable(product, sizeLabel, colorId) {
  const variants = product.variants ?? [];
  if (!variants.length) return product.inStock !== false;
  const code = sizeCode(product, sizeLabel);
  const wantedColor = colorId ? colorCode(product, colorId) : null;
  return variants.some(
    (variant) =>
      same(variant.selections?.SIZE, code) &&
      (!wantedColor || same(variant.selections?.COLOR, wantedColor)) &&
      variant.availableQuantity > 0,
  );
}

export function isColorAvailable(product, colorId) {
  const variants = product.variants ?? [];
  if (!variants.length) return product.inStock !== false;
  const code = colorCode(product, colorId);
  return variants.some((variant) => same(variant.selections?.COLOR, code) && variant.availableQuantity > 0);
}

// Danh sách ảnh cho khung ảnh: ảnh sản phẩm + ảnh riêng của từng màu (nếu chưa có trong danh sách).
// Nhờ vậy bấm màu nào cũng đổi được ảnh lớn sang đúng màu đó.
export function buildGallery(product) {
  const base = product.images?.length ? product.images : [product.image];
  const colorImages = (product.colors ?? []).map((color) => color.image);
  return [...new Set([...base, ...colorImages].filter(Boolean))];
}
