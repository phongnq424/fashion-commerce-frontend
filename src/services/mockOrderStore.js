import { STORAGE_KEYS } from '../constants/storageKeys';
import { readAuthSession } from './authSession';

// =====================================================================
// KHO ĐƠN HÀNG GIẢ LẬP (frontend) — lưu trong localStorage của trình duyệt.
// Đặt hàng ở trang thanh toán -> lưu vào đây -> trang "Đơn hàng của tôi" đọc lại.
//
// Mỗi đơn được lưu ĐÚNG DẠNG OrderResponse của backend (docs/FRONTEND_API_CONTRACT.md mục 12),
// nên khi chuyển sang backend thật, các trang đơn hàng không phải sửa giao diện.
// Đơn gắn với email người đặt (owner): đăng nhập bằng email nào thì thấy đơn của email đó.
// =====================================================================

const read = () => {
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.mockOrders) ?? '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const write = (list) => {
  try {
    localStorage.setItem(STORAGE_KEYS.mockOrders, JSON.stringify(list));
  } catch {
    /* bỏ qua nếu không lưu được */
  }
};

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;

const sameEmail = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

// Email của người đang đăng nhập (null nếu chưa đăng nhập)
export const currentOwner = () => readAuthSession()?.user?.email ?? null;

// Phương thức ở trang thanh toán ('cod' | 'bank' | 'card') -> mã kiểu backend
const METHOD_CODES = { cod: 'COD', bank: 'BANK', card: 'CARD' };

/**
 * Tạo + lưu đơn từ dữ liệu trang thanh toán.
 * - items: [{ id, name, image, price, color, size, quantity }]
 * - shipping: form giao hàng   - totals: calculateTotals()   - paymentMethod: 'cod' | 'bank' | 'card'
 * - owner: email người đặt
 * Trả về OrderResponse vừa lưu.
 */
export function saveMockOrder({ orderCode, items, shipping, totals, paymentMethod, owner }) {
  const now = new Date().toISOString();
  const orderId = newId();
  const shippingFee = Math.max(0, (totals.shippingFee ?? 0) - (totals.shippingDiscount ?? 0));
  const discount = (totals.discount ?? 0) + (totals.shippingDiscount ?? 0);
  const method = METHOD_CODES[paymentMethod] ?? String(paymentMethod).toUpperCase();

  // Quà tặng kèm -> thêm thành 1 dòng giá 0đ ngay sau sản phẩm được tặng
  const withGifts = items.flatMap((item) =>
    item.gift
      ? [
          item,
          {
            id: `${item.id}-gift`,
            name: item.gift.name,
            image: item.gift.image,
            price: 0,
            size: item.gift.options?.join(', '),
            quantity: 1,
            isGift: true,
          },
        ]
      : [item],
  );

  const orderItems = withGifts.map((item) => ({
    id: newId(),
    productId: item.id,
    variantId: null,
    sellerSku: '',
    productName: item.name,
    options: Object.fromEntries(
      [
        ['SIZE', item.size],
        ['COLOR', item.color],
      ].filter(([, value]) => value),
    ),
    imageUrl: item.image ?? null, // riêng dữ liệu giả: backend chưa trả ảnh trong dòng đơn
    unitPriceMinor: item.price,
    quantity: item.quantity,
    discountMinor: 0,
    lineTotalMinor: item.price * item.quantity,
    isGift: Boolean(item.isGift), // riêng dữ liệu giả: quà tặng kèm (không đánh giá / trả hàng)
  }));

  const order = {
    id: orderId,
    orderNumber: orderCode,
    status: 'CONFIRMED',
    currency: 'VND',
    paymentMethod: method,
    recipient: {
      recipientName: shipping.fullName,
      recipientPhone: shipping.phone,
      addressLine1: shipping.address,
      addressLine2: null,
      ward: shipping.wardName || null,
      district: shipping.districtName || null,
      province: shipping.provinceName,
      provinceCode: shipping.provinceId || null,
      postalCode: null,
      countryCode: 'VN',
    },
    itemsSubtotalMinor: totals.subtotal,
    shippingFeeMinor: shippingFee,
    discountTotalMinor: totals.discount ?? 0,
    grandTotalMinor: totals.total,
    buyerNote: null,
    placedAt: now,
    paidAt: null,
    completedAt: null,
    cancelledAt: null,
    shops: [
      {
        id: newId(),
        shopId: 'trendylab',
        shopOrderNumber: `${orderCode}-1`,
        status: 'PENDING_CONFIRMATION',
        itemsSubtotalMinor: totals.subtotal,
        shippingFeeMinor: shippingFee,
        discountTotalMinor: discount,
        totalMinor: totals.total,
        items: orderItems,
      },
    ],
    payment: {
      id: newId(),
      orderId,
      method,
      amountMinor: totals.total,
      currency: 'VND',
      status: method === 'COD' ? 'AWAITING_COLLECTION' : 'PENDING',
      checkoutUrl: null,
      paidAt: null,
      createdAt: now,
    },
    owner: owner ?? shipping.email ?? null,
  };

  write([order, ...read()]);
  return order;
}

// OrderResponse -> OrderSummaryResponse (dạng danh sách)
const toSummary = (order) => ({
  id: order.id,
  orderNumber: order.orderNumber,
  status: order.status,
  paymentMethod: order.paymentMethod,
  grandTotalMinor: order.grandTotalMinor,
  currency: order.currency,
  shopCount: order.shops.length,
  itemCount: order.shops.reduce((sum, shop) => sum + shop.items.reduce((n, item) => n + item.quantity, 0), 0),
  paymentStatus: order.payment?.status ?? null,
  placedAt: order.placedAt,
  // Riêng dữ liệu giả: kèm danh sách sản phẩm để thẻ đơn hiện ảnh + tên (GET /orders của backend chưa có).
  // Khi nối backend: danh sách gọi thêm GET /orders/{id} cho từng đơn, hoặc nhờ backend bổ sung trường này.
  shops: order.shops,
  completedAt: order.completedAt,
});

const mine = () => {
  const owner = currentOwner();
  return owner ? read().filter((order) => sameEmail(order.owner, owner)) : [];
};

export function listMockOrders({ limit = 20, offset = 0 } = {}) {
  const all = mine().sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  return { items: all.slice(offset, offset + limit).map(toSummary), limit, offset, hasMore: offset + limit < all.length };
}

export function findMockOrder(orderId) {
  return mine().find((order) => order.id === orderId) ?? null;
}

export function cancelMockOrder(orderId, reason) {
  const now = new Date().toISOString();
  let updated = null;
  write(
    read().map((order) => {
      if (order.id !== orderId) return order;
      updated = {
        ...order,
        status: 'CANCELLED',
        cancelledAt: now,
        cancelReason: reason ?? null,
        shops: order.shops.map((shop) => ({ ...shop, status: 'CANCELLED' })),
        payment: order.payment ? { ...order.payment, status: 'CANCELLED' } : null,
      };
      return updated;
    }),
  );
  return updated;
}

// Tìm đơn (của người đang đăng nhập) chứa shop order này — dùng khi tạo yêu cầu trả hàng
export function findMockOrderByShopOrder(shopOrderId) {
  return mine().find((order) => order.shops.some((shop) => shop.id === shopOrderId)) ?? null;
}
