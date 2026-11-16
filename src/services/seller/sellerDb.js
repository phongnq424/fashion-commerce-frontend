import { mockProducts } from '../../data/mockProducts';
import { REVIEW_POOL } from '../../data/mockReviews';
import { readAuthSession } from '../authSession';

// =====================================================================
// CƠ SỞ DỮ LIỆU GIẢ LẬP CHO SELLER CENTER (lưu trong localStorage của trình duyệt)
// ---------------------------------------------------------------------
// Mọi object lưu ở đây có ĐÚNG DẠNG dữ liệu backend trả về (docs/FRONTEND_API_CONTRACT.md mục 5, 6, 8,
// 13, 14, 15, 17). Các service trong thư mục này đọc / ghi qua file này và trả về đúng response đó,
// nên khi nối backend thật chỉ cần thay thân hàm trong service bằng apiClient — màn hình giữ nguyên.
//
// Cấu trúc:
//   users[email] = { userId, onboarding, applications[], shopIds[], invitations[], incomingTransfers[] }
//   shops[shopId] = { profile: ShopResponse, settings, members[], transfers[], pickupAddresses[],
//                     shippingProviders[], products[], orders[], cod[], returns[], reviews[] }
// Xoá toàn bộ dữ liệu giả: localStorage.removeItem('fc-seller-db')
// =====================================================================

const KEY = 'fc-seller-db';

export const wait = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));
export const now = () => new Date().toISOString();
export const uuid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
const daysAgo = (days, hour = 9) => {
  const date = new Date(Date.now() - days * 86400000);
  date.setHours(hour, 15, 0, 0);
  return date.toISOString();
};

// Lỗi giống backend: { status, code, message }
export function apiError(status, code, message = code) {
  return Object.assign(new Error(message), { status, code });
}

// Backend không có danh mục con: dữ liệu cũ lưu categoryId "tops/tshirts" -> đổi về "tops"
function migrateCategoryIds(data) {
  Object.values(data.shops ?? {}).forEach((shop) => {
    (shop?.products ?? []).forEach((product) => {
      if (typeof product.categoryId === 'string' && product.categoryId.includes('/')) {
        product.categoryId = product.categoryId.split('/')[0];
      }
    });
  });
  return data;
}

export function readDb() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (data && data.users && data.shops) return migrateCategoryIds(data);
  } catch {
    /* dữ liệu hỏng -> tạo mới */
  }
  return { users: {}, shops: {} };
}

function writeDb(db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* hết dung lượng -> bỏ qua */
  }
}

// Người đang đăng nhập (giống "current user" của backend)
export function currentUser() {
  const user = readAuthSession()?.user;
  if (!user?.email) throw apiError(401, 'AUTH_REQUIRED', 'Login required');
  return {
    email: String(user.email).toLowerCase(),
    userId: user.id ?? `user-${String(user.email).toLowerCase()}`,
    displayName: user.displayName ?? user.name ?? user.email,
  };
}

// Đọc - sửa - ghi trong 1 lần. fn(db, me) trả về giá trị cần trả cho màn hình (đã được copy sâu).
export async function transact(fn, delay = 180) {
  await wait(delay);
  const db = readDb();
  const me = currentUser();
  ensureUser(db, me);
  const result = fn(db, me);
  writeDb(db);
  return result === undefined ? undefined : JSON.parse(JSON.stringify(result));
}

// Lấy shop + kiểm tra người dùng là thành viên ACTIVE (backend: 403 nếu không có quyền)
export function requireShop(db, me, shopId) {
  const shop = db.shops[shopId];
  if (!shop || shop.profile.status === 'CLOSED') throw apiError(404, 'SHOP_NOT_FOUND', 'Shop not found');
  const member = shop.members.find((item) => item.userId === me.userId && item.status === 'ACTIVE');
  if (!member) throw apiError(403, 'SHOP_ACCESS_DENIED', 'Not a member of this shop');
  return shop;
}

export const isOwner = (shop, me) => shop.profile.ownerUserId === me.userId;

// ---------------------------------------------------------------------
// TẠO DỮ LIỆU MẪU
// ---------------------------------------------------------------------
const BUYERS = [
  ['Nguyễn Ngọc Anh', '0901234567', '12 Lê Lợi', 'Phường Bến Nghé', 'TP. Hồ Chí Minh'],
  ['Trần Minh Khoa', '0987654321', '45 Nguyễn Trãi', 'Phường 2', 'TP. Hồ Chí Minh'],
  ['Lê Thu Hà', '0912345678', '7 Hàng Bài', 'Phường Tràng Tiền', 'Hà Nội'],
  ['Phạm Bảo Ngân', '0934567890', '88 Trần Phú', 'Phường Hải Châu 1', 'Đà Nẵng'],
  ['Võ Hoàng Yến', '0978123456', '21 Lý Thường Kiệt', 'Phường 7', 'Cần Thơ'],
];

export const SHIPPING_PROVIDERS = [
  { code: 'GHN', name: 'Giao Hàng Nhanh', description: 'Bàn giao thủ công, nhập mã vận đơn khi giao hàng' },
  { code: 'GHTK', name: 'Giao Hàng Tiết Kiệm', description: 'Bàn giao thủ công, nhập mã vận đơn khi giao hàng' },
  { code: 'VIETTEL_POST', name: 'Viettel Post', description: 'Bàn giao thủ công, nhập mã vận đơn khi giao hàng' },
];

export const SELLER_POLICIES = [
  { version: 'SELLER_TERMS_V1', title: 'Điều khoản dành cho người bán', required: true },
  { version: 'SELLER_FEE_POLICY_V1', title: 'Chính sách phí dành cho người bán', required: true },
];

export const SHOP_ROLES = [
  { code: 'SHOP_OWNER', name: 'Chủ shop', description: 'Toàn quyền với shop' },
  { code: 'SHOP_MANAGER', name: 'Quản lý shop', description: 'Quản lý sản phẩm, đơn hàng, nhân viên' },
  { code: 'SHOP_CATALOG', name: 'Nhân viên sản phẩm', description: 'Thêm, sửa sản phẩm và tồn kho' },
  { code: 'SHOP_ORDERS', name: 'Nhân viên đơn hàng', description: 'Xử lý, giao đơn và thu hộ COD' },
  { code: 'SHOP_SUPPORT', name: 'Nhân viên CSKH', description: 'Trả hàng và trả lời đánh giá' },
  { code: 'SHOP_FINANCE', name: 'Nhân viên tài chính', description: 'Đối soát COD và hoàn tiền' },
];

const slugify = (text) =>
  String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'shop';

export { slugify };

const codeOf = (text) =>
  slugify(text).toUpperCase().replace(/-/g, '_').slice(0, 20) || 'X';

// mockProducts -> ProductResponse của backend
function toProductResponse(source, shopId, index) {
  const sizes = source.sizes?.length ? source.sizes : ['FREE'];
  const colors = source.colors?.length ? source.colors : [{ name: 'Mặc định', hex: null }];
  const options = [
    {
      id: uuid(),
      type: 'SIZE',
      displayName: 'Kích cỡ',
      sortOrder: 0,
      values: sizes.map((size, i) => ({ id: uuid(), code: codeOf(size), label: size, hexColor: null, sortOrder: i })),
    },
    {
      id: uuid(),
      type: 'COLOR',
      displayName: 'Màu sắc',
      sortOrder: 1,
      values: colors.map((color, i) => ({
        id: uuid(),
        code: codeOf(color.name),
        label: color.name,
        hexColor: color.hex ?? null,
        sortOrder: i,
      })),
    },
  ];
  const code = `TL${String(index + 1).padStart(3, '0')}`;
  const variants = [];
  options[0].values.forEach((size, si) => {
    options[1].values.forEach((color, ci) => {
      const stock = source.inStock === false ? 0 : [24, 3, 15, 0, 42, 8, 2, 19][(index + si + ci) % 8];
      variants.push({
        id: uuid(),
        sellerSku: `${code}-${size.code}-${color.code}`.slice(0, 100),
        barcode: null,
        selections: { SIZE: size.code, COLOR: color.code },
        priceMinor: source.price,
        compareAtPriceMinor: source.originalPrice ?? null,
        weightGrams: 350,
        lengthMm: 300,
        widthMm: 250,
        heightMm: 30,
        status: 'ACTIVE',
        quantityOnHand: stock,
        quantityReserved: stock > 5 ? 1 : 0,
        availableQuantity: Math.max(0, stock - (stock > 5 ? 1 : 0)),
        reorderPoint: 5,
      });
    });
  });
  const urls = [...new Set([source.image, ...(source.images ?? [])].filter(Boolean))].slice(0, 5);
  const status = index === 6 ? 'DRAFT' : index === 7 ? 'ARCHIVED' : 'ACTIVE';
  const created = daysAgo(40 - index);
  return {
    id: uuid(),
    shopId,
    categoryId: source.category,
    brandId: null,
    sellerProductCode: code,
    name: source.name,
    slug: `${slugify(source.name)}-${index + 1}`,
    description: source.description ?? source.name,
    material: source.material ?? null,
    fitType: null,
    targetGender: 'UNISEX',
    careInstructions: 'Giặt tay hoặc giặt máy chế độ nhẹ, không dùng chất tẩy.',
    sizeChart: null,
    version: 1,
    status,
    publishedAt: status === 'ACTIVE' ? created : null,
    options,
    variants,
    images: urls.map((url, i) => ({
      id: uuid(),
      variantId: null,
      storageKey: url,
      url,
      altText: source.name,
      sortOrder: i,
      primary: i === 0,
    })),
    createdAt: created,
    updatedAt: created,
  };
}

function recipient(buyer) {
  return {
    recipientName: buyer[0],
    recipientPhone: buyer[1],
    addressLine1: buyer[2],
    addressLine2: null,
    ward: buyer[3],
    district: null,
    province: buyer[4],
    provinceCode: null,
    postalCode: null,
    countryCode: 'VN',
  };
}

function shipmentFor(order, status, origin) {
  const events = [];
  const steps = status === 'DELIVERED' ? ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'] : ['PICKED_UP', 'IN_TRANSIT'];
  steps.forEach((step, i) => {
    const at = new Date(new Date(order.placedAt).getTime() + (i + 1) * 20 * 3600000).toISOString();
    events.push({ id: uuid(), status: step, location: i === 0 ? origin.provinceName : order.recipient.province, description: null, occurredAt: at, createdAt: at });
  });
  const shippedAt = events[0].occurredAt;
  return {
    id: uuid(),
    carrierCode: 'GHN',
    serviceCode: null,
    trackingNumber: `GHN${Math.floor(10000000 + Math.random() * 89999999)}`,
    origin,
    destination: order.recipient,
    shippingFeeMinor: order.shippingFeeMinor,
    status,
    shippedAt,
    estimatedDeliveryAt: new Date(new Date(shippedAt).getTime() + 3 * 86400000).toISOString(),
    deliveredAt: status === 'DELIVERED' ? events[events.length - 1].occurredAt : null,
    createdAt: shippedAt,
    updatedAt: events[events.length - 1].occurredAt,
    events,
  };
}

function orderItem(product, variant, quantity) {
  const sizeLabel = product.options[0].values.find((v) => v.code === variant.selections.SIZE)?.label;
  const colorLabel = product.options[1]?.values.find((v) => v.code === variant.selections.COLOR)?.label;
  return {
    id: uuid(),
    productId: product.id,
    variantId: variant.id,
    sellerSku: variant.sellerSku,
    productName: product.name,
    options: { SIZE: sizeLabel, COLOR: colorLabel },
    imageUrl: product.images.find((img) => img.primary)?.url ?? null,
    unitPriceMinor: variant.priceMinor,
    quantity,
    discountMinor: 0,
    lineTotalMinor: variant.priceMinor * quantity,
  };
}

const ORDER_PLAN = [
  // [trạng thái đơn shop, số ngày trước, phương thức, trạng thái vận đơn]
  ['PENDING_CONFIRMATION', 0, 'COD'],
  ['PENDING_CONFIRMATION', 0, 'MOMO'],
  ['PROCESSING', 1, 'COD'],
  ['READY_TO_SHIP', 1, 'COD'],
  ['SHIPPED', 2, 'COD', 'IN_TRANSIT'],
  ['COMPLETED', 6, 'COD', 'DELIVERED'],
  ['COMPLETED', 9, 'COD', 'DELIVERED'],
  ['CANCELLED', 3, 'COD'],
];

export function seedShopContent(shop, ownerName) {
  const shopId = shop.profile.id;
  const products = mockProducts.slice(0, 8).map((source, i) => toProductResponse(source, shopId, i));
  const origin = shop.pickupAddresses[0] ?? { provinceName: 'TP. Hồ Chí Minh' };
  const orders = ORDER_PLAN.map(([status, days, method, shipStatus], i) => {
    const product = products[i % 6];
    const variant = product.variants[(i * 3) % product.variants.length];
    const items = [orderItem(product, variant, 1 + (i % 2))];
    if (i % 3 === 0) {
      const extra = products[(i + 2) % 6];
      items.push(orderItem(extra, extra.variants[0], 1));
    }
    const subtotal = items.reduce((sum, item) => sum + item.lineTotalMinor, 0);
    const placedAt = daysAgo(days, 8 + i);
    const order = {
      id: uuid(),
      orderId: uuid(),
      orderNumber: `FC2611${String(1500 - i * 7).padStart(4, '0')}`,
      shopId,
      shopOrderNumber: `SO-${String(90120 - i * 13)}`,
      status,
      buyerId: uuid(),
      paymentMethod: method,
      currency: 'VND',
      recipient: recipient(BUYERS[i % BUYERS.length]),
      itemsSubtotalMinor: subtotal,
      shippingFeeMinor: 30000,
      discountTotalMinor: 0,
      totalMinor: subtotal + 30000,
      buyerNote: i === 0 ? 'Giao giờ hành chính giúp mình nhé.' : null,
      sellerNote: null,
      placedAt,
      confirmedAt: ['PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED'].includes(status) ? placedAt : null,
      cancelledAt: status === 'CANCELLED' ? placedAt : null,
      completedAt: null,
      items,
      shipment: null,
      updatedAt: placedAt,
      cancelReason: status === 'CANCELLED' ? 'Khách yêu cầu hủy' : null,
    };
    if (shipStatus) {
      order.shipment = shipmentFor(order, shipStatus, origin);
      order.updatedAt = order.shipment.updatedAt;
      if (shipStatus === 'DELIVERED') order.completedAt = order.shipment.deliveredAt;
    }
    return order;
  });

  // Thu hộ COD: mỗi đơn COD 1 bản ghi
  let completedCount = 0;
  const cod = orders
    .filter((order) => order.paymentMethod === 'COD')
    .map((order) => {
      let status = 'AWAITING_COLLECTION';
      if (order.status === 'CANCELLED') status = 'CANCELLED';
      if (order.status === 'COMPLETED') {
        completedCount += 1;
        status = completedCount === 1 ? 'COLLECTED' : 'RECONCILED';
      }
      const collected = ['COLLECTED', 'RECONCILED'].includes(status);
      const events = [{ id: uuid(), fromStatus: null, toStatus: 'AWAITING_COLLECTION', actorUserId: null, note: null, occurredAt: order.placedAt }];
      if (collected) events.push({ id: uuid(), fromStatus: 'AWAITING_COLLECTION', toStatus: 'COLLECTED', actorUserId: null, note: null, occurredAt: order.completedAt });
      if (status === 'RECONCILED') events.push({ id: uuid(), fromStatus: 'COLLECTED', toStatus: 'RECONCILED', actorUserId: null, note: 'Đối soát tuần 45', occurredAt: order.completedAt });
      if (status === 'CANCELLED') events.push({ id: uuid(), fromStatus: 'AWAITING_COLLECTION', toStatus: 'CANCELLED', actorUserId: null, note: null, occurredAt: order.cancelledAt });
      return {
        id: uuid(),
        paymentId: uuid(),
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        shopOrderId: order.id,
        shopOrderNumber: order.shopOrderNumber,
        shopId,
        status,
        expectedAmountMinor: order.totalMinor,
        collectedAmountMinor: collected ? order.totalMinor : null,
        currency: 'VND',
        paymentStatus: collected ? 'PAID' : status === 'CANCELLED' ? 'CANCELLED' : 'AWAITING_COLLECTION',
        collectionReference: collected ? `THU-${order.shopOrderNumber}` : null,
        failureReason: null,
        collectedAt: collected ? order.completedAt : null,
        collectedBy: null,
        reconciledAt: status === 'RECONCILED' ? order.completedAt : null,
        reconciledBy: null,
        reconciliationReference: status === 'RECONCILED' ? 'DS-2026-W45' : null,
        reconciliationNote: null,
        version: events.length,
        createdAt: order.placedAt,
        updatedAt: events[events.length - 1].occurredAt,
        events,
      };
    });

  // Trả hàng: 1 yêu cầu mới (chờ duyệt) + 1 yêu cầu đã nhận hàng (chờ hoàn COD)
  const completed = orders.filter((order) => order.status === 'COMPLETED');
  const returns = completed.map((order, i) => {
    const item = order.items[0];
    const status = i === 0 ? 'REQUESTED' : 'RECEIVED';
    const createdAt = daysAgo(i === 0 ? 1 : 4);
    const events = [{ id: uuid(), fromStatus: null, toStatus: 'REQUESTED', actorUserId: order.buyerId, note: null, occurredAt: createdAt }];
    if (status === 'RECEIVED') {
      events.push({ id: uuid(), fromStatus: 'REQUESTED', toStatus: 'APPROVED', actorUserId: null, note: 'Shop đồng ý nhận lại', occurredAt: daysAgo(3) });
      events.push({ id: uuid(), fromStatus: 'APPROVED', toStatus: 'RETURNING', actorUserId: order.buyerId, note: null, occurredAt: daysAgo(2) });
      events.push({ id: uuid(), fromStatus: 'RETURNING', toStatus: 'RECEIVED', actorUserId: null, note: 'Hàng còn nguyên tem mác', occurredAt: daysAgo(1) });
    }
    return {
      id: uuid(),
      orderId: order.orderId,
      shopOrderId: order.id,
      shopOrderNumber: order.shopOrderNumber,
      shopId,
      buyerId: order.buyerId,
      buyerName: order.recipient.recipientName,
      reasonCode: i === 0 ? 'WRONG_SIZE' : 'DEFECTIVE',
      description: i === 0 ? 'Áo hơi chật ở vai, mình muốn đổi size lớn hơn.' : 'Đường may ở tay áo bị bung chỉ.',
      evidenceKeys: item.imageUrl ? [item.imageUrl] : [],
      status,
      decisionNote: status === 'RECEIVED' ? 'Shop đồng ý nhận lại' : null,
      createdAt,
      updatedAt: events[events.length - 1].occurredAt,
      dispatchedAt: status === 'RECEIVED' ? daysAgo(2) : null,
      receivedAt: status === 'RECEIVED' ? daysAgo(1) : null,
      carrierCode: status === 'RECEIVED' ? 'GHTK' : null,
      trackingNumber: status === 'RECEIVED' ? 'GHTK55102938' : null,
      items: [
        {
          orderItemId: item.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          sellerSku: item.sellerSku,
          purchasedQuantity: item.quantity,
          returnQuantity: 1,
          requestedRefundMinor: item.unitPriceMinor,
        },
      ],
      requestedRefundMinor: item.unitPriceMinor,
      refund: null,
      events,
    };
  });

  // Đánh giá của khách cho các sản phẩm đang bán
  const reviews = REVIEW_POOL.slice(0, 7).map((review, i) => {
    const product = products[i % 6];
    const createdAt = daysAgo(2 + i * 2);
    const replied = i % 3 === 1;
    return {
      id: uuid(),
      orderItemId: uuid(),
      productId: product.id,
      productName: product.name,
      productImageUrl: product.images[0]?.url ?? null,
      shopId,
      rating: review.rating,
      title: null,
      body: review.comment,
      mediaKeys: [],
      buyerDisplayName: review.name,
      sellerReply: replied ? `Cảm ơn ${review.name} đã ủng hộ ${shop.profile.name}! Hẹn gặp lại bạn ở đơn sau nhé.` : null,
      sellerRepliedAt: replied ? daysAgo(1 + i * 2) : null,
      createdAt,
      updatedAt: createdAt,
    };
  });

  Object.assign(shop, { products, orders, cod, returns, reviews });
  void ownerName;
  return shop;
}

export function newShop({ shopId, ownerUserId, ownerEmail, ownerName, name, slug, email, phone, description, logoUrl, bannerUrl, pickupAddresses, shippingProviders, applicationId }) {
  const at = now();
  const pickup = pickupAddresses?.[0];
  return {
    profile: {
      id: shopId ?? uuid(),
      ownerUserId,
      applicationId: applicationId ?? uuid(),
      name,
      slug,
      description: description ?? null,
      logoKey: logoUrl ?? null,
      logoUrl: logoUrl ?? null,
      bannerKey: bannerUrl ?? null,
      bannerUrl: bannerUrl ?? null,
      contactEmail: email,
      contactPhone: phone,
      pickupAddress: pickup
        ? {
            contactName: pickup.contactName,
            contactPhone: pickup.contactPhone,
            addressLine1: pickup.addressDetail,
            addressLine2: null,
            ward: pickup.wardName,
            district: null,
            province: pickup.provinceName,
            provinceCode: pickup.provinceCode ?? null,
            postalCode: null,
            countryCode: 'VN',
          }
        : {},
      status: 'ACTIVE',
      activatedAt: at,
      suspendedAt: null,
      createdAt: at,
      updatedAt: at,
    },
    settings: { handlingDays: 2, returnWindowDays: 7, defaultShippingFeeMinor: 30000, allowCod: true, autoAcceptOrders: false },
    members: [
      {
        memberId: uuid(),
        userId: ownerUserId,
        email: ownerEmail,
        displayName: ownerName,
        status: 'ACTIVE',
        invitedBy: null,
        joinedAt: at,
        createdAt: at,
        roles: ['SHOP_OWNER'],
      },
    ],
    transfers: [],
    pickupAddresses: pickupAddresses ?? [],
    shippingProviders:
      shippingProviders ??
      SHIPPING_PROVIDERS.map((provider) => ({ ...provider, available: true, enabled: provider.code !== 'VIETTEL_POST', pickupAddressId: pickup?.id ?? null })),
    products: [],
    orders: [],
    cod: [],
    returns: [],
    reviews: [],
  };
}

// Nhân viên mẫu cho shop
export function seedStaff(shop, ownerUserId) {
  const at = daysAgo(10);
  shop.members.push(
    { memberId: uuid(), userId: uuid(), email: 'minh.thu@trendylab.vn', displayName: 'Đỗ Minh Thư', status: 'ACTIVE', invitedBy: ownerUserId, joinedAt: at, createdAt: at, roles: ['SHOP_ORDERS'] },
    { memberId: uuid(), userId: uuid(), email: 'quang.huy@trendylab.vn', displayName: 'Bùi Quang Huy', status: 'ACTIVE', invitedBy: ownerUserId, joinedAt: daysAgo(6), createdAt: daysAgo(6), roles: ['SHOP_CATALOG', 'SHOP_SUPPORT'] },
    { memberId: uuid(), userId: uuid(), email: 'khanh.linh@gmail.com', displayName: 'khanh.linh', status: 'INVITED', invitedBy: ownerUserId, joinedAt: null, createdAt: daysAgo(1), roles: ['SHOP_FINANCE'] },
  );
}

// Shop của NGƯỜI KHÁC (để có dữ liệu cho màn "Lời mời" và "Nhận quyền sở hữu")
function externalShop(db, name, ownerName) {
  const ownerUserId = uuid();
  const shop = newShop({
    ownerUserId,
    ownerEmail: `${slugify(ownerName)}@example.com`,
    ownerName,
    name,
    slug: slugify(name),
    email: `hello@${slugify(name)}.vn`,
    phone: '0909000111',
    pickupAddresses: [
      { id: uuid(), contactName: ownerName, contactPhone: '0909000111', provinceCode: null, provinceName: 'Hà Nội', wardCode: null, wardName: 'Phường Hàng Bạc', addressDetail: '15 Hàng Bạc', defaultPickup: true, active: true },
    ],
  });
  seedShopContent(shop, ownerName);
  db.shops[shop.profile.id] = shop;
  return shop;
}

// Lần đầu người dùng vào Seller Center: tạo "hộp" dữ liệu + 1 lời mời làm nhân viên + 1 lời mời nhận quyền sở hữu
function ensureUser(db, me) {
  if (db.users[me.email]) {
    db.users[me.email].userId = me.userId;
    return db.users[me.email];
  }
  const bucket = { userId: me.userId, onboarding: null, applications: [], shopIds: [], invitations: [], incomingTransfers: [] };
  db.users[me.email] = bucket;

  const linen = externalShop(db, 'Linen House', 'Trịnh Mai Phương');
  const memberId = uuid();
  linen.members.push({ memberId, userId: me.userId, email: me.email, displayName: me.displayName, status: 'INVITED', invitedBy: linen.profile.ownerUserId, joinedAt: null, createdAt: daysAgo(1), roles: ['SHOP_CATALOG'] });
  bucket.invitations.push({ memberId, shopId: linen.profile.id, shopName: linen.profile.name, invitedBy: linen.profile.ownerUserId, createdAt: daysAgo(1), roles: ['SHOP_CATALOG'] });

  const miu = externalShop(db, 'Miu Studio', 'Hà Gia Bảo');
  const transfer = {
    id: uuid(),
    shopId: miu.profile.id,
    shopName: miu.profile.name,
    fromOwnerUserId: miu.profile.ownerUserId,
    toUserId: me.userId,
    keepPreviousOwnerAsManager: true,
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 5 * 86400000).toISOString(),
    decidedAt: null,
    createdAt: daysAgo(2),
    fromOwnerName: 'Hà Gia Bảo',
  };
  miu.transfers.push(transfer);
  bucket.incomingTransfers.push(transfer.id);
  return bucket;
}

export function userBucket(db, me) {
  return ensureUser(db, me);
}

// Tóm tắt shop (ShopSummaryResponse) + vai trò của người đang xem (riêng frontend: myRoles)
export function shopSummary(shop, me) {
  const p = shop.profile;
  const member = shop.members.find((item) => item.userId === me.userId);
  return {
    id: p.id,
    ownerUserId: p.ownerUserId,
    name: p.name,
    slug: p.slug,
    logoKey: p.logoKey,
    logoUrl: p.logoUrl,
    status: p.status,
    activatedAt: p.activatedAt,
    suspendedAt: p.suspendedAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    myRoles: member?.roles ?? [],
  };
}

// Danh sách shop người dùng có quyền vào (chủ shop hoặc nhân viên ACTIVE)
export function myShopIds(db, me) {
  return Object.values(db.shops)
    .filter((shop) => shop.profile.status !== 'CLOSED' && shop.members.some((m) => m.userId === me.userId && m.status === 'ACTIVE'))
    .map((shop) => shop.profile.id);
}

export function slice(items, limit = 20, offset = 0) {
  return { items: items.slice(offset, offset + limit), limit, offset, hasMore: offset + limit < items.length };
}
