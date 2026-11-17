import { readAuthSession } from '../authSession';

// Hằng số dùng chung cho Kênh người bán (khớp mã của Backend).

// Vai trò trong shop (bảng roles, scope SHOP). Tên hiển thị: i18n seller.roles.<code>
export const SHOP_ROLES = [
  { code: 'SHOP_OWNER', name: 'Chủ shop', description: 'Toàn quyền với shop' },
  { code: 'SHOP_MANAGER', name: 'Quản lý shop', description: 'Quản lý sản phẩm, đơn hàng, voucher, báo cáo' },
  { code: 'SHOP_CATALOG', name: 'Nhân viên sản phẩm', description: 'Thêm, sửa sản phẩm và xem tồn kho' },
  { code: 'SHOP_ORDERS', name: 'Nhân viên đơn hàng', description: 'Xử lý, giao đơn' },
  { code: 'SHOP_SUPPORT', name: 'Nhân viên CSKH', description: 'Trả hàng và trả lời đánh giá' },
  { code: 'SHOP_FINANCE', name: 'Nhân viên tài chính', description: 'Xem doanh số và báo cáo tài chính' },
];

// Mã hãng vận chuyển khi giao hàng (Backend nhận mã [A-Za-z0-9._-]+, giao thủ công + nhập mã vận đơn).
// Danh sách hãng của từng shop được chọn ở bước đăng ký bán hàng; Backend chưa có API đọc lại sau đó.
export const SHIPPING_PROVIDERS = [
  { code: 'GHN', name: 'Giao Hàng Nhanh' },
  { code: 'GHTK', name: 'Giao Hàng Tiết Kiệm' },
  { code: 'VIETTEL_POST', name: 'Viettel Post' },
  { code: 'SPX', name: 'SPX Express' },
  { code: 'JT', name: 'J&T Express' },
  { code: 'VNPOST', name: 'VNPost' },
];

// Backend: limit 1..100 cho mọi danh sách
export const MAX_PAGE = 100;

export const currentUserId = () => readAuthSession()?.user?.id ?? null;

export const enc = encodeURIComponent;

// Tải hết các trang của 1 API dạng SliceResponse { items, hasMore } (tối đa maxPages trang)
export async function fetchAllSlices(load, { limit = MAX_PAGE, maxPages = 5 } = {}) {
  const items = [];
  for (let page = 0; page < maxPages; page += 1) {
    const result = await load({ limit, offset: page * limit });
    items.push(...(result?.items ?? []));
    if (!result?.hasMore) break;
  }
  return { items, limit: items.length, offset: 0, hasMore: false };
}
