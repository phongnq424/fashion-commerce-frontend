// =====================================================================
// DỮ LIỆU MẪU CỦA BE GIẢ — tạo 1 lần khi BE giả chạy lần đầu (lưu ở mock-server/.data/db.json).
// Sản phẩm lấy từ data/mockProducts.js + data/extraProducts.js, đổi sang đúng dạng ProductResponse của Backend.
//
// TÀI KHOẢN DEMO (mật khẩu đều là Demo@123, mã OTP đăng ký / quên mật khẩu luôn là 123456):
//   WEB KHÁCH (http://localhost:5173)
//     khach@trendylab.vn     khách mua (có sẵn địa chỉ, đơn hàng, yêu thích)
//     seller@trendylab.vn    chủ shop "TrendyLab Official" + quản lý "Lam Studio" (1 tài khoản nhiều shop)
//     lam@trendylab.vn       chủ shop "Lam Studio"
//     denim@trendylab.vn     chủ shop "Bụi Denim"
//     may@trendylab.vn       chủ shop "Mây Basic"
//     nhanvien@trendylab.vn  nhân viên ĐƠN HÀNG của TrendyLab Official (không thấy tài chính)
//     moi@trendylab.vn       đã gửi hồ sơ mở shop, đang chờ admin duyệt
//     vipham@trendylab.vn    chủ shop bị admin TẠM KHOÁ
//   TRANG QUẢN TRỊ (http://localhost:5174)
//     admin@trendylab.vn     PLATFORM_ADMIN (toàn quyền)
//     kiemduyet@trendylab.vn PLATFORM_MODERATOR (duyệt seller, shop, sản phẩm, đánh giá)
//     hotro@trendylab.vn     PLATFORM_SUPPORT (xem đơn hàng để hỗ trợ khách)
// =====================================================================
import { mockProducts } from '../data/mockProducts.js';
import { extraProducts } from '../data/extraProducts.js';
import { daysAgo, slugify, stableUuid } from './util.js';
import { refreshVariant, settleShopOrder } from './logic.js';

export const DEMO_PASSWORD = 'Demo@123';
export const DEMO_OTP = '123456';

const PLATFORM_PERMISSIONS = {
  PLATFORM_ADMIN: ['seller.review', 'shop.suspend', 'product.moderate', 'review.moderate', 'platform.users.read', 'platform.users.manage', 'platform.roles.manage', 'platform.orders.support_read', 'platform.returns.resolve', 'platform.finance.manage'],
  PLATFORM_MODERATOR: ['seller.review', 'shop.suspend', 'product.moderate', 'review.moderate'],
  PLATFORM_SUPPORT: ['platform.orders.support_read', 'platform.returns.resolve'],
  CUSTOMER: ['account.read_own', 'account.update_own', 'address.manage_own', 'seller.apply', 'cart.manage_own', 'checkout.create_own', 'order.read_own', 'order.cancel_own', 'return.request_own', 'voucher.redeem_own', 'review.create_own', 'review.manage_own'],
};
const ROLE_NAMES = {
  CUSTOMER: 'Khách mua',
  PLATFORM_ADMIN: 'Quản trị nền tảng',
  PLATFORM_MODERATOR: 'Kiểm duyệt nền tảng',
  PLATFORM_SUPPORT: 'Hỗ trợ khách hàng',
};

const CATEGORY_DEFS = [
  { route: 'tops', slug: 'ao', name: 'Áo' },
  { route: 'bottoms', slug: 'quan', name: 'Quần' },
  { route: 'dresses', slug: 'vay-dam', name: 'Váy & Đầm' },
];

function user(key, email, displayName, roles, extra = {}) {
  return {
    id: stableUuid(`user:${key}`),
    email,
    phone: extra.phone ?? null,
    displayName,
    status: 'ACTIVE',
    statusReason: null,
    statusChangedBy: null,
    statusChangedAt: null,
    password: DEMO_PASSWORD,
    roles,
    version: 0,
    emailVerifiedAt: daysAgo(60),
    phoneVerifiedAt: null,
    lastLoginAt: daysAgo(1),
    createdAt: daysAgo(extra.age ?? 60),
  };
}

function shop(key, owner, name, extra = {}) {
  const id = stableUuid(`shop:${key}`);
  return {
    id,
    ownerUserId: owner.id,
    applicationId: stableUuid(`application:${key}`),
    name,
    slug: slugify(name),
    description: extra.description ?? null,
    logoKey: extra.logoUrl ?? null,
    logoUrl: extra.logoUrl ?? null,
    bannerKey: null,
    bannerUrl: null,
    contactEmail: owner.email,
    contactPhone: extra.phone ?? '0901234567',
    pickupAddress: {
      contactName: owner.displayName,
      contactPhone: extra.phone ?? '0901234567',
      addressLine1: extra.address ?? '12 Lê Lợi',
      addressLine2: null,
      ward: 'Phường Bến Nghé',
      district: 'Quận 1',
      province: 'TP. Hồ Chí Minh',
      provinceCode: '79',
      postalCode: null,
      countryCode: 'VN',
    },
    status: 'ACTIVE',
    activatedAt: daysAgo(extra.age ?? 50),
    suspendedAt: null,
    createdAt: daysAgo(extra.age ?? 50),
    updatedAt: daysAgo(5),
    settings: { handlingDays: 2, returnWindowDays: 7, defaultShippingFeeMinor: 30000, allowCod: true, autoAcceptOrders: false },
    finance: {
      settings: { platformFeeRateBp: 500, minimumPayoutMinor: 100000, version: 0, updatedAt: daysAgo(50) },
      account: { availableBalanceMinor: 0, pendingPayoutMinor: 0, paidOutMinor: 0, version: 0, updatedAt: daysAgo(50) },
    },
    members: [
      {
        memberId: stableUuid(`member:${key}:${owner.id}`),
        userId: owner.id,
        email: owner.email,
        displayName: owner.displayName,
        status: 'ACTIVE',
        invitedBy: null,
        joinedAt: daysAgo(extra.age ?? 50),
        createdAt: daysAgo(extra.age ?? 50),
        roles: ['SHOP_OWNER'],
      },
    ],
  };
}

const colorCode = (c) => slugify(c.id || c.name).toUpperCase().replace(/-/g, '_') || 'MAU';
const hex = (value) => (/^#[0-9a-f]{6}$/i.test(value ?? '') ? value.toUpperCase() : null);

// mockProducts -> ProductResponse
function toProduct(source, index, shopId, categories) {
  const id = stableUuid(`product:${source.id}`);
  const categoryId = categories.find((c) => c.route === source.category)?.id ?? categories[0].id;
  const sizes = source.sizes?.length ? source.sizes : ['Freesize'];
  const colors = source.colors ?? [];
  const options = [
    { id: stableUuid(`${id}:SIZE`), type: 'SIZE', displayName: 'Kích cỡ', sortOrder: 0, values: sizes.map((s, i) => ({ id: stableUuid(`${id}:SIZE:${s}`), code: String(s).toUpperCase(), label: String(s), hexColor: null, sortOrder: i })) },
  ];
  if (colors.length) {
    options.push({ id: stableUuid(`${id}:COLOR`), type: 'COLOR', displayName: 'Màu sắc', sortOrder: 1, values: colors.map((c, i) => ({ id: stableUuid(`${id}:COLOR:${c.id}`), code: colorCode(c), label: c.name, hexColor: hex(c.hex), sortOrder: i })) });
  }
  const combos = colors.length ? sizes.flatMap((s) => colors.map((c) => ({ s, c }))) : sizes.map((s) => ({ s, c: null }));
  const variants = combos.map(({ s, c }, i) => {
    const selections = { SIZE: String(s).toUpperCase() };
    if (c) selections.COLOR = colorCode(c);
    const stock = source.inStock === false ? 0 : 8 + ((index * 7 + i * 5) % 30);
    return refreshVariant({
      id: stableUuid(`${id}:variant:${selections.SIZE}:${selections.COLOR ?? ''}`),
      sellerSku: `${source.id.toUpperCase()}-${selections.SIZE}${c ? `-${selections.COLOR}` : ''}`.slice(0, 100),
      barcode: null,
      selections,
      priceMinor: source.price,
      compareAtPriceMinor: source.originalPrice && source.originalPrice > source.price ? source.originalPrice : null,
      weightGrams: 300,
      lengthMm: null,
      widthMm: null,
      heightMm: null,
      status: 'ACTIVE',
      quantityOnHand: stock,
      quantityReserved: 0,
      reorderPoint: 5,
    });
  });
  const urls = [...new Set([...(source.images ?? []), source.image].filter(Boolean))];
  const images = urls.map((url, i) => ({ id: stableUuid(`${id}:img:${url}`), variantId: null, storageKey: url, url, altText: source.name.slice(0, 250), sortOrder: i, primary: i === 0 }));
  colors.forEach((c) => {
    if (!c.image || urls.includes(c.image)) return;
    const variant = variants.find((v) => v.selections.COLOR === colorCode(c));
    images.push({ id: stableUuid(`${id}:img:${c.image}`), variantId: variant?.id ?? null, storageKey: c.image, url: c.image, altText: c.name, sortOrder: images.length, primary: false });
  });
  const description = [source.description, ...(source.details ?? [])].filter(Boolean).join('\n\n');
  const published = source.isNew ? daysAgo(1 + (index % 5)) : daysAgo(20 + index * 3);
  return {
    id,
    shopId,
    categoryId,
    brandId: null,
    sellerProductCode: source.id.toUpperCase(),
    name: source.name.slice(0, 240),
    slug: `${slugify(source.name)}-${source.id}`,
    description: description || source.name,
    material: source.material ?? null,
    fitType: null,
    targetGender: 'UNISEX',
    careInstructions: (source.care ?? []).join('\n') || null,
    sizeChart: null,
    version: 1,
    status: 'ACTIVE',
    publishedAt: published,
    options,
    variants,
    images,
    createdAt: published,
    updatedAt: published,
    soldCount: source.soldCount ?? 0,
  };
}

export function buildSeed() {
  const categories = CATEGORY_DEFS.map((c) => ({ id: stableUuid(`category:${c.slug}`), parentId: null, name: c.name, slug: c.slug, description: null, route: c.route }));

  const admin = user('admin', 'admin@trendylab.vn', 'Quản trị TrendyLab', ['CUSTOMER', 'PLATFORM_ADMIN'], { age: 120 });
  const customer = user('khach', 'khach@trendylab.vn', 'Ngọc Anh', ['CUSTOMER'], { phone: '0912345678', age: 40 });
  const seller = user('seller', 'seller@trendylab.vn', 'Minh Trendy', ['CUSTOMER'], { phone: '0901234567', age: 90 });
  const lam = user('lam', 'lam@trendylab.vn', 'Lam Nguyễn', ['CUSTOMER'], { phone: '0987654321', age: 70 });
  const staff = user('nhanvien', 'nhanvien@trendylab.vn', 'Hùng Đơn Hàng', ['CUSTOMER'], { age: 30 });
  const applicant = user('moi', 'moi@trendylab.vn', 'Thảo Mới', ['CUSTOMER'], { phone: '0934567890', age: 5 });
  const mai = user('mai', 'mai@trendylab.vn', 'Mai Phương', ['CUSTOMER'], { phone: '0923456789', age: 100 });
  const tuan = user('tuan', 'tuan@trendylab.vn', 'Tuấn Lê', ['CUSTOMER'], { phone: '0945678901', age: 100 });
  const moderator = user('kiemduyet', 'kiemduyet@trendylab.vn', 'Kiểm duyệt viên', ['CUSTOMER', 'PLATFORM_MODERATOR'], { age: 110 });
  const support = user('hotro', 'hotro@trendylab.vn', 'Nhân viên hỗ trợ', ['CUSTOMER', 'PLATFORM_SUPPORT'], { age: 110 });
  const denim = user('denim', 'denim@trendylab.vn', 'Quốc Bảo', ['CUSTOMER'], { phone: '0956789012', age: 80 });
  const may = user('may', 'may@trendylab.vn', 'Mây Trần', ['CUSTOMER'], { phone: '0967890123', age: 75 });
  const violator = user('vipham', 'vipham@trendylab.vn', 'Tài khoản vi phạm', ['CUSTOMER'], { phone: '0978901234', age: 40 });
  const users = [admin, moderator, support, customer, seller, lam, denim, may, staff, applicant, violator, mai, tuan];

  const shop1 = shop('trendylab', seller, 'TrendyLab Official', { description: 'Thời trang basic, local brand chính hãng.', age: 80 });
  shop1.members.push({ memberId: stableUuid('member:trendylab:staff'), userId: staff.id, email: staff.email, displayName: staff.displayName, status: 'ACTIVE', invitedBy: seller.id, joinedAt: daysAgo(20), createdAt: daysAgo(21), roles: ['SHOP_ORDERS'] });
  const shop2 = shop('lam', lam, 'Lam Studio', { description: 'Đầm váy thiết kế, may đo tại Hà Nội.', age: 45, phone: '0987654321', address: '25 Hàng Bông' });
  shop2.pickupAddress = { ...shop2.pickupAddress, ward: 'Phường Hàng Trống', district: 'Quận Hoàn Kiếm', province: 'Hà Nội', provinceCode: '01' };
  // seller@ cũng là quản lý của Lam Studio -> demo 1 tài khoản nhiều shop (đổi shop ở góc trên)
  shop2.members.push({ memberId: stableUuid('member:lam:seller'), userId: seller.id, email: seller.email, displayName: seller.displayName, status: 'ACTIVE', invitedBy: lam.id, joinedAt: daysAgo(30), createdAt: daysAgo(31), roles: ['SHOP_MANAGER'] });
  const shop3 = shop('denim', denim, 'Bụi Denim', { description: 'Chuyên quần áo jean, wash thủ công tại Sài Gòn.', age: 70, phone: '0956789012', address: '102 Nguyễn Trãi' });
  const shop4 = shop('may', may, 'Mây Basic', { description: 'Đồ basic mặc hằng ngày, giá tốt.', age: 60, phone: '0967890123', address: '7 Trần Phú' });
  shop4.pickupAddress = { ...shop4.pickupAddress, ward: 'Phường Hải Châu 1', district: 'Quận Hải Châu', province: 'Đà Nẵng', provinceCode: '48' };
  // Shop bị admin tạm khoá -> sản phẩm của shop này KHÔNG hiện trên web khách
  const shop5 = shop('vipham', violator, 'Hàng Hiệu Giá Rẻ', { description: 'Shop đã bị tạm khoá do bán hàng nhái.', age: 35, phone: '0978901234' });
  Object.assign(shop5, { status: 'SUSPENDED', suspendedAt: daysAgo(3), updatedAt: daysAgo(3) });
  const shops = [shop1, shop2, shop3, shop4, shop5];
  const shopByKey = { denim: shop3, may: shop4, vipham: shop5 };

  // Sản phẩm: váy/đầm về Lam Studio, còn lại TrendyLab Official; extraProducts ghi rõ shop
  const products = [
    ...mockProducts.map((p, i) => toProduct(p, i, p.category === 'dresses' && i % 2 === 0 ? shop2.id : shop1.id, categories)),
    ...extraProducts.map((p, i) => toProduct(p, mockProducts.length + i, shopByKey[p.shop].id, categories)),
  ];
  if (!products.some((p) => p.shopId === shop2.id) && products.length > 2) products[products.length - 1].shopId = shop2.id;

  const roles = Object.entries(PLATFORM_PERMISSIONS).map(([code, permissions]) => ({ id: stableUuid(`role:${code}`), code, name: ROLE_NAMES[code], description: null, system: true, active: true, version: 0, permissions }));
  const permissions = [...new Set(Object.values(PLATFORM_PERMISSIONS).flat())].map((code) => ({ id: stableUuid(`perm:${code}`), featureCode: code.split('.')[0].toUpperCase(), code, description: code }));

  const address = {
    id: stableUuid('address:khach:1'),
    recipientName: 'Ngọc Anh',
    recipientPhone: '0912345678',
    addressLine1: '45 Nguyễn Huệ',
    addressLine2: null,
    ward: 'Phường Bến Nghé',
    district: 'Quận 1',
    province: 'TP. Hồ Chí Minh',
    provinceCode: '79',
    postalCode: null,
    countryCode: 'VN',
    defaultAddress: true,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(30),
  };
  const recipient = (({ id, defaultAddress, createdAt, updatedAt, ...r }) => (void id, void defaultAddress, void createdAt, void updatedAt, r))(address);

  const db = {
    categories,
    users,
    roles,
    permissions,
    shops,
    products,
    carts: {},
    snapshots: {},
    orders: [],
    shopOrders: [],
    cod: [],
    returns: [],
    reviews: [],
    addresses: { [customer.id]: [address] },
    wishlist: { [customer.id]: products.slice(1, 3).map((p) => ({ productId: p.id, addedAt: daysAgo(3) })) },
    notifications: [],
    vouchers: [],
    onboardings: [],
    applications: [],
    transfers: [],
    cases: [],
    payouts: [],
    financeEntries: [],
    settlements: [],
    reports: [],
    sessions: [],
    idempotency: {},
    counters: { order: 1000 },
  };

  // ----- Đơn mẫu -----
  const makeOrder = ({ key, product, variantIndex = 0, quantity = 1, status, shopStatus, days, buyer = customer }) => {
    const variant = product.variants[variantIndex] ?? product.variants[0];
    const shopRow = shops.find((s) => s.id === product.shopId);
    const orderId = stableUuid(`order:${key}`);
    const shopOrderId = stableUuid(`shopOrder:${key}`);
    db.counters.order += 1;
    const number = `TL${String(db.counters.order).padStart(8, '0')}`;
    const subtotal = variant.priceMinor * quantity;
    const shipping = shopRow.settings.defaultShippingFeeMinor;
    const optionLabels = Object.fromEntries(Object.entries(variant.selections).map(([type, code]) => [type, product.options.find((o) => o.type === type)?.values.find((v) => v.code === code)?.label ?? code]));
    const item = { id: stableUuid(`orderItem:${key}`), productId: product.id, variantId: variant.id, sellerSku: variant.sellerSku, productName: product.name, options: optionLabels, unitPriceMinor: variant.priceMinor, quantity, discountMinor: 0, lineTotalMinor: subtotal, imageUrl: product.images[0]?.url ?? null };
    const placedAt = daysAgo(days, 9 + (db.counters.order % 11));
    const done = shopStatus === 'COMPLETED';
    const cancelled = shopStatus === 'CANCELLED';
    db.orders.push({
      id: orderId,
      orderNumber: number,
      buyerId: buyer.id,
      buyerEmail: buyer.email,
      status,
      paymentMethod: 'COD',
      recipient: { ...recipient },
      itemsSubtotalMinor: subtotal,
      shippingFeeMinor: shipping,
      discountTotalMinor: 0,
      grandTotalMinor: subtotal + shipping,
      buyerNote: null,
      placedAt,
      paidAt: done ? daysAgo(days - 3) : null,
      completedAt: done ? daysAgo(days - 3) : null,
      cancelledAt: cancelled ? daysAgo(days) : null,
      appliedVouchers: [],
      payment: { id: stableUuid(`payment:${key}`), orderId, merchantReference: number, method: 'COD', provider: 'COD', amountMinor: subtotal + shipping, currency: 'VND', status: done ? 'PAID' : cancelled ? 'CANCELLED' : 'AWAITING_COLLECTION', checkoutUrl: null, expiresAt: null, paidAt: done ? daysAgo(days - 3) : null, createdAt: placedAt },
    });
    const so = {
      id: shopOrderId,
      orderId,
      orderNumber: number,
      shopId: shopRow.id,
      shopOrderNumber: `${number}-1`,
      status: shopStatus,
      buyerId: buyer.id,
      paymentMethod: 'COD',
      recipient: { ...recipient },
      itemsSubtotalMinor: subtotal,
      shippingFeeMinor: shipping,
      discountTotalMinor: 0,
      totalMinor: subtotal + shipping,
      buyerNote: null,
      sellerNote: null,
      placedAt,
      confirmedAt: shopStatus === 'PENDING_CONFIRMATION' ? null : daysAgo(days - 1),
      cancelledAt: cancelled ? placedAt : null,
      completedAt: done ? daysAgo(days - 3) : null,
      updatedAt: done ? daysAgo(days - 3) : placedAt,
      items: [item],
      shipment: ['SHIPPED', 'COMPLETED'].includes(shopStatus)
        ? { id: stableUuid(`shipment:${key}`), carrierCode: 'GHN', serviceCode: null, trackingNumber: `GHN${String(db.counters.order)}VN`, origin: shopRow.pickupAddress, destination: { ...recipient }, shippingFeeMinor: shipping, status: done ? 'DELIVERED' : 'IN_TRANSIT', shippedAt: daysAgo(days - 2), estimatedDeliveryAt: daysAgo(days - 4), deliveredAt: done ? daysAgo(days - 3) : null, createdAt: daysAgo(days - 2), updatedAt: daysAgo(days - 3), events: [{ id: stableUuid(`shipEvent:${key}:1`), status: 'PICKED_UP', location: shopRow.pickupAddress.province, description: 'Đã lấy hàng', occurredAt: daysAgo(days - 2), createdAt: daysAgo(days - 2) }, ...(done ? [{ id: stableUuid(`shipEvent:${key}:2`), status: 'DELIVERED', location: 'TP. Hồ Chí Minh', description: 'Giao hàng thành công', occurredAt: daysAgo(days - 3), createdAt: daysAgo(days - 3) }] : [{ id: stableUuid(`shipEvent:${key}:2`), status: 'IN_TRANSIT', location: 'Kho trung chuyển', description: 'Đang vận chuyển', occurredAt: daysAgo(days - 2, 18), createdAt: daysAgo(days - 2, 18) }])] }
        : null,
    };
    db.shopOrders.push(so);
    if (cancelled) {
      so.sellerNote = 'Khách đổi ý, hủy trước khi giao';
    } else if (!done) {
      variant.quantityReserved += quantity;
      refreshVariant(variant);
    } else {
      product.soldCount = (product.soldCount ?? 0) + quantity;
    }
    db.cod.push({
      id: stableUuid(`cod:${key}`),
      paymentId: stableUuid(`payment:${key}`),
      orderId,
      orderNumber: number,
      shopOrderId,
      shopOrderNumber: so.shopOrderNumber,
      shopId: shopRow.id,
      status: done ? 'COLLECTED' : cancelled ? 'CANCELLED' : 'AWAITING_COLLECTION',
      expectedAmountMinor: so.totalMinor,
      collectedAmountMinor: done ? so.totalMinor : null,
      currency: 'VND',
      paymentStatus: done ? 'PAID' : cancelled ? 'CANCELLED' : 'AWAITING_COLLECTION',
      collectionReference: done ? `GHN-COD-${db.counters.order}` : null,
      failureReason: null,
      collectedAt: done ? daysAgo(days - 3) : null,
      collectedBy: done ? seller.id : null,
      reconciledAt: null,
      reconciledBy: null,
      reconciliationReference: null,
      reconciliationNote: null,
      version: done ? 1 : 0,
      createdAt: placedAt,
      updatedAt: done ? daysAgo(days - 3) : placedAt,
      events: [],
    });
    if (done) settleShopOrder(db, so, daysAgo(days - 3));
    return { so, item };
  };

  const p1 = products.filter((p) => p.shopId === shop1.id);
  const p2 = products.filter((p) => p.shopId === shop2.id);
  const done1 = makeOrder({ key: 'done1', product: p1[0], quantity: 1, status: 'COMPLETED', shopStatus: 'COMPLETED', days: 12 });
  const done2 = makeOrder({ key: 'done2', product: p1[1] ?? p1[0], variantIndex: 1, quantity: 2, status: 'COMPLETED', shopStatus: 'COMPLETED', days: 6 });
  makeOrder({ key: 'pending1', product: p1[2] ?? p1[0], quantity: 1, status: 'CONFIRMED', shopStatus: 'PENDING_CONFIRMATION', days: 0 });
  makeOrder({ key: 'shipping1', product: p1[3] ?? p1[0], quantity: 1, status: 'SHIPPED', shopStatus: 'SHIPPED', days: 2 });
  if (p2[0]) makeOrder({ key: 'lam1', product: p2[0], quantity: 1, status: 'CONFIRMED', shopStatus: 'PENDING_CONFIRMATION', days: 1 });

  // Lịch sử bán hàng 90 ngày cho cả 2 shop (để dashboard / báo cáo có số liệu, biểu đồ có hình)
  // Đơn đã giao xong -> đã đối soát, cộng số dư; khoảng 1/8 đơn bị hủy.
  const REVIEW_TEXTS = [
    [5, 'Rất ưng', 'Vải đẹp, form chuẩn, giao nhanh. Sẽ ủng hộ shop tiếp.'],
    [4, 'Ổn trong tầm giá', 'Chất liệu ổn, màu hơi khác ảnh một chút nhưng vẫn đẹp.'],
    [5, 'Đúng mô tả', 'Đóng gói cẩn thận, size vừa in.'],
    [3, 'Tạm được', 'Đường may chưa thật chắc, giao hơi chậm.'],
  ];
  const history = (list, count, prefix) => {
    for (let i = 0; i < count; i += 1) {
      const days = 4 + Math.floor((i * 89) / count) + (i % 3);
      const isCancelled = i % 8 === 5;
      const buyer = i % 2 ? mai : tuan;
      const placed = makeOrder({
        key: `${prefix}${i}`,
        product: list[(i * 3) % list.length],
        variantIndex: i % 4,
        quantity: 1 + (i % 3 === 0 ? 1 : 0),
        status: isCancelled ? 'CANCELLED' : 'COMPLETED',
        shopStatus: isCancelled ? 'CANCELLED' : 'COMPLETED',
        days: Math.min(days, 92),
        buyer,
      });
      // Khoảng 1/3 đơn đã giao có đánh giá -> trang sản phẩm có điểm sao, shop có đánh giá để trả lời
      if (!isCancelled && i % 3 === 0) {
        const [rating, title, body] = REVIEW_TEXTS[i % REVIEW_TEXTS.length];
        db.reviews.push({ id: stableUuid(`review:${prefix}${i}`), orderItemId: placed.item.id, productId: placed.item.productId, shopId: placed.so.shopId, buyerId: buyer.id, rating, title, body, mediaKeys: [], buyerDisplayName: buyer.displayName, sellerReply: null, sellerRepliedAt: null, status: 'PUBLISHED', moderationReason: null, createdAt: daysAgo(Math.max(1, days - 4)), updatedAt: daysAgo(Math.max(1, days - 4)) });
      }
    }
  };
  history(p1, 34, 'h1-');
  if (p2.length) history(p2, 16, 'h2-');
  const p3 = products.filter((p) => p.shopId === shop3.id && p.variants.some((v) => v.quantityOnHand > 0));
  const p4 = products.filter((p) => p.shopId === shop4.id);
  history(p3, 14, 'h3-');
  history(p4, 18, 'h4-');
  makeOrder({ key: 'denim-new', product: p3[0], quantity: 1, status: 'CONFIRMED', shopStatus: 'PENDING_CONFIRMATION', days: 0, buyer: mai });
  makeOrder({ key: 'may-ship', product: p4[0], quantity: 2, status: 'SHIPPED', shopStatus: 'SHIPPED', days: 2 });
  // Thêm vài đơn đang xử lý gần đây cho "Việc cần làm"
  makeOrder({ key: 'proc1', product: p1[5 % p1.length], quantity: 1, status: 'PROCESSING', shopStatus: 'PROCESSING', days: 1, buyer: mai });
  makeOrder({ key: 'ready1', product: p1[6 % p1.length], quantity: 1, status: 'PROCESSING', shopStatus: 'READY_TO_SHIP', days: 1, buyer: tuan });
  if (p2[1]) makeOrder({ key: 'lam2', product: p2[1], quantity: 1, status: 'SHIPPED', shopStatus: 'SHIPPED', days: 2, buyer: mai });

  // 1 đơn của khách gồm hàng của 2 shop (TrendyLab + Lam Studio) -> 2 đơn con, mỗi shop tự xử lý phần mình
  if (p2[2]) {
    const a = makeOrder({ key: 'multi-a', product: p1[7 % p1.length], quantity: 1, status: 'PROCESSING', shopStatus: 'PROCESSING', days: 1 });
    const b = makeOrder({ key: 'multi-b', product: p2[2], quantity: 1, status: 'PROCESSING', shopStatus: 'PENDING_CONFIRMATION', days: 1 });
    const parent = db.orders.find((o) => o.id === a.so.orderId);
    const extra = db.orders.find((o) => o.id === b.so.orderId);
    b.so.orderId = parent.id;
    b.so.orderNumber = parent.orderNumber;
    b.so.shopOrderNumber = `${parent.orderNumber}-2`;
    db.cod.filter((c) => c.orderId === extra.id).forEach((c) => Object.assign(c, { orderId: parent.id, orderNumber: parent.orderNumber }));
    parent.itemsSubtotalMinor += extra.itemsSubtotalMinor;
    parent.shippingFeeMinor += extra.shippingFeeMinor;
    parent.grandTotalMinor += extra.grandTotalMinor;
    parent.payment.amountMinor = parent.grandTotalMinor;
    db.orders.splice(db.orders.indexOf(extra), 1);
  }

  // Đánh giá mẫu cho đơn đã giao
  db.reviews.push({
    id: stableUuid('review:1'),
    orderItemId: done1.item.id,
    productId: done1.item.productId,
    shopId: shop1.id,
    buyerId: customer.id,
    rating: 5,
    title: 'Rất ưng',
    body: 'Vải dày dặn, form đẹp, giao nhanh. Sẽ ủng hộ shop tiếp.',
    mediaKeys: [],
    buyerDisplayName: customer.displayName,
    sellerReply: 'Cảm ơn bạn đã ủng hộ TrendyLab ạ!',
    sellerRepliedAt: daysAgo(8),
    status: 'PUBLISHED',
    moderationReason: null,
    createdAt: daysAgo(9),
    updatedAt: daysAgo(8),
  });
  void done2;

  // Voucher mẫu
  const voucher = (key, shopRow, data) => ({ id: stableUuid(`voucher:${key}`), shopId: shopRow.id, description: null, maxDiscountMinor: null, discountRateBp: null, discountAmountMinor: null, usedCount: 0, perUserLimit: 1, usageLimit: 500, active: true, version: 0, startsAt: daysAgo(10), endsAt: daysAgo(-60), createdAt: daysAgo(10), updatedAt: daysAgo(10), ...data });
  db.vouchers.push(
    voucher('trendy10', shop1, { code: 'TRENDY10', name: 'Giảm 10% đơn từ 300k', appliesTo: 'ORDER', discountType: 'PERCENT', discountRateBp: 1000, maxDiscountMinor: 50000, minSpendMinor: 300000 }),
    voucher('freeship', shop1, { code: 'FREESHIP', name: 'Miễn phí vận chuyển', appliesTo: 'SHIPPING', discountType: 'FIXED', discountAmountMinor: 30000, minSpendMinor: 0 }),
    voucher('lam50', shop2, { code: 'LAM50K', name: 'Giảm 50k đơn từ 500k', appliesTo: 'ORDER', discountType: 'FIXED', discountAmountMinor: 50000, minSpendMinor: 500000 }),
  );

  // Hồ sơ mở shop đang chờ duyệt (để thử màn admin)
  const onboardingId = stableUuid('onboarding:moi');
  db.onboardings.push({
    id: onboardingId,
    applicantUserId: applicant.id,
    status: 'PENDING_REVIEW',
    shop: { shopId: stableUuid('shop:moi'), name: 'Thảo Handmade', slug: 'thao-handmade', email: applicant.email, phone: '0934567890', avatarKey: null, avatarUrl: null, description: 'Túi và phụ kiện len handmade.', coverKey: null, coverUrl: null, status: 'DRAFT' },
    pickupAddresses: [{ id: stableUuid('pickup:moi'), contactName: 'Thảo Mới', contactPhone: '0934567890', provinceCode: '48', provinceName: 'Đà Nẵng', wardCode: null, wardName: 'Phường Hải Châu 1', addressDetail: '88 Bạch Đằng', defaultPickup: true, active: true }],
    shippingProviders: [
      { code: 'GHN', name: 'Giao Hàng Nhanh', description: 'Bàn giao thủ công, nhập mã vận đơn khi giao hàng', available: true, enabled: true, pickupAddressId: stableUuid('pickup:moi') },
      { code: 'GHTK', name: 'Giao Hàng Tiết Kiệm', description: 'Bàn giao thủ công, nhập mã vận đơn khi giao hàng', available: true, enabled: false, pickupAddressId: null },
      { code: 'VIETTEL_POST', name: 'Viettel Post', description: 'Bàn giao thủ công, nhập mã vận đơn khi giao hàng', available: true, enabled: false, pickupAddressId: null },
    ],
    taxProfile: { businessType: 'INDIVIDUAL', legalName: 'Nguyễn Thị Thảo', businessName: null, legalRepresentativeName: null, taxCode: '0401234567', businessRegistrationNumber: null, issuedDate: null, issuedBy: null, registeredAddress: { provinceCode: '48', provinceName: 'Đà Nẵng', wardCode: null, wardName: 'Phường Hải Châu 1', addressDetail: '88 Bạch Đằng' }, invoiceEmail: applicant.email, registrationDocumentKey: null, status: 'PENDING', reviewedBy: null, reviewedAt: null, reviewNote: null },
    identityVerification: { documentType: 'CCCD', legalName: 'Nguyễn Thị Thảo', documentNumberLast4: '6789', frontDocumentKey: 'https://placehold.co/600x380?text=CCCD+mat+truoc', backDocumentKey: 'https://placehold.co/600x380?text=CCCD+mat+sau', selfieDocumentKey: 'https://placehold.co/400x400?text=Selfie', status: 'PENDING', reviewedBy: null, reviewedAt: null, reviewNote: null },
    acceptedPolicyVersions: ['seller-terms-2026.1', 'prohibited-items-2026.1'],
    submittedAt: daysAgo(1),
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
    completedAt: null,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  });

  // Báo cáo vi phạm mẫu
  db.cases.push({ id: stableUuid('case:1'), productId: p1[4]?.id ?? p1[0].id, productName: (p1[4] ?? p1[0]).name, shopId: shop1.id, reporterUserId: customer.id, reasonCode: 'MISLEADING', description: 'Màu thực tế khác ảnh khá nhiều.', evidenceKeys: [], status: 'OPEN', assignedTo: null, resolutionAction: null, resolutionNote: null, resolvedAt: null, createdAt: daysAgo(2), updatedAt: daysAgo(2) });
  if (p2[0]) db.cases.push({ id: stableUuid('case:2'), productId: p2[0].id, productName: p2[0].name, shopId: shop2.id, reporterUserId: mai.id, reasonCode: 'COUNTERFEIT', description: 'Nghi hàng nhái mẫu thiết kế của thương hiệu khác.', evidenceKeys: [], status: 'OPEN', assignedTo: null, resolutionAction: null, resolutionNote: null, resolvedAt: null, createdAt: daysAgo(1), updatedAt: daysAgo(1) });
  if (p1[9]) db.cases.push({ id: stableUuid('case:3'), productId: p1[9].id, productName: p1[9].name, shopId: shop1.id, reporterUserId: tuan.id, reasonCode: 'INAPPROPRIATE', description: 'Ảnh sản phẩm có hình phản cảm.', evidenceKeys: [], status: 'OPEN', assignedTo: null, resolutionAction: null, resolutionNote: null, resolvedAt: null, createdAt: daysAgo(3), updatedAt: daysAgo(3) });
  if (p2[3]) db.cases.push({ id: stableUuid('case:4'), productId: p2[3].id, productName: p2[3].name, shopId: shop2.id, reporterUserId: customer.id, reasonCode: 'MISLEADING', description: 'Chất liệu ghi lụa nhưng thực tế là polyester.', evidenceKeys: [], status: 'RESOLVED', assignedTo: null, resolutionAction: 'WARN', resolutionNote: 'Đã nhắc shop sửa mô tả chất liệu.', resolvedAt: daysAgo(5), createdAt: daysAgo(8), updatedAt: daysAgo(5) });

  // Yêu cầu rút tiền mẫu của TrendyLab Official
  const payoutAmount = 100000;
  if (shop1.finance.account.availableBalanceMinor >= payoutAmount) {
    shop1.finance.account.availableBalanceMinor -= payoutAmount;
    shop1.finance.account.pendingPayoutMinor += payoutAmount;
    db.financeEntries.unshift({ id: stableUuid('entry:payout1'), shopId: shop1.id, type: 'PAYOUT_RESERVED', amountMinor: -payoutAmount, balanceAfterMinor: shop1.finance.account.availableBalanceMinor, currency: 'VND', referenceType: 'SHOP_PAYOUT', referenceId: stableUuid('payout:1'), description: 'Giữ tiền chờ rút PO000001', occurredAt: daysAgo(1) });
    db.payouts.push({ id: stableUuid('payout:1'), payoutNumber: 'PO000001', shopId: shop1.id, amountMinor: payoutAmount, currency: 'VND', status: 'REQUESTED', sellerNote: 'Rút tiền tuần này', decisionNote: null, requestedBy: seller.id, reviewedBy: null, reviewedAt: null, paidBy: null, paidAt: null, paymentReference: null, version: 0, createdAt: daysAgo(1), updatedAt: daysAgo(1) });
  }

  // Thông báo mẫu
  db.notifications.push(
    { id: stableUuid('noti:1'), userId: customer.id, type: 'ORDER_SHIPPED', title: 'Đơn hàng đang được giao', body: 'Shop TrendyLab Official đã giao đơn cho GHN.', payload: {}, readAt: null, createdAt: daysAgo(2) },
    { id: stableUuid('noti:2'), userId: seller.id, type: 'SHOP_ORDER_PLACED', title: 'Có đơn hàng mới', body: 'Bạn có đơn mới cần xác nhận.', payload: {}, readAt: null, createdAt: daysAgo(0) },
  );

  // Báo cáo vi phạm đã xử lý: shop "Hàng Hiệu Giá Rẻ" bị tạm khoá
  const banned = products.find((p) => p.shopId === shop5.id);
  if (banned) db.cases.push({ id: stableUuid('case:vipham'), productId: banned.id, productName: banned.name, shopId: shop5.id, reporterUserId: tuan.id, reasonCode: 'COUNTERFEIT', description: 'Bán áo in logo thương hiệu, giá rẻ bất thường.', evidenceKeys: [], status: 'RESOLVED', assignedTo: moderator.id, resolutionAction: 'HIDE', resolutionNote: 'Đã ẩn sản phẩm, tạm khoá shop.', resolvedAt: daysAgo(3), createdAt: daysAgo(5), updatedAt: daysAgo(3) });

  return db;
}

// Danh sách tài khoản demo cho thanh DEMO (GET /api/v1/__mock/accounts — route riêng của BE giả)
const PLATFORM_ROLE_TEXT = { PLATFORM_ADMIN: 'Quản trị sàn (toàn quyền)', PLATFORM_MODERATOR: 'Kiểm duyệt sàn', PLATFORM_SUPPORT: 'Hỗ trợ khách hàng' };
const SHOP_ROLE_TEXT = { SHOP_OWNER: 'Chủ shop', SHOP_MANAGER: 'Quản lý', SHOP_CATALOG: 'NV sản phẩm', SHOP_ORDERS: 'NV đơn hàng', SHOP_SUPPORT: 'NV CSKH', SHOP_FINANCE: 'NV tài chính' };
const DEMO_ORDER = ['khach', 'seller', 'lam', 'denim', 'may', 'nhanvien', 'moi', 'vipham', 'admin', 'kiemduyet', 'hotro'];

export function describeDemoAccounts(db) {
  return DEMO_ORDER.map((key) => db.users.find((u) => u.id === stableUuid(`user:${key}`)))
    .filter(Boolean)
    .map((u) => {
      const platform = u.roles.filter((r) => PLATFORM_ROLE_TEXT[r]);
      const memberships = db.shops
        .map((s) => ({ s, m: s.members.find((m) => m.userId === u.id && m.status === 'ACTIVE') }))
        .filter((x) => x.m)
        .map(({ s, m }) => `${m.roles.map((r) => SHOP_ROLE_TEXT[r] ?? r).join(', ')} "${s.name}"${s.status === 'ACTIVE' ? '' : ` (${s.status})`}`);
      const pending = db.onboardings.find((o) => o.applicantUserId === u.id && o.status !== 'APPROVED');
      const parts = [...platform.map((r) => PLATFORM_ROLE_TEXT[r]), ...memberships];
      if (pending) parts.push(`Hồ sơ mở shop: ${pending.status}`);
      if (!parts.length) parts.push('Khách mua');
      return { email: u.email, displayName: u.displayName, app: platform.length ? 'admin' : 'web', description: parts.join(' · ') };
    });
}
