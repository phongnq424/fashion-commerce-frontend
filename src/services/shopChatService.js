// =====================================================================
// NHẮN TIN VỚI SHOP (chăm sóc khách hàng) — trang chi tiết sản phẩm
// ---------------------------------------------------------------------
// Backend HIỆN CHƯA CÓ API tin nhắn / chat (không có bảng, không có endpoint).
// -> Tin nhắn được GIẢ LẬP, lưu trong localStorage của trình duyệt, shop tự trả lời mẫu.
// Khi Backend có API (vd GET/POST /api/v1/conversations/...), chỉ cần thay 3 hàm
// getConversation / sendMessage / (phần trả lời tự động) bên dưới, giao diện giữ nguyên.
//
// Chỉ chat trên web (không gọi điện / email).
// Tên + logo shop lấy THẬT từ Backend: GET /api/v1/shops/{shopId} -> { name, logoUrl } (API này cần đăng nhập)
// Sản phẩm mock / chưa đăng nhập / lỗi -> hiện TrendyLab.
// =====================================================================
import { apiClient } from './apiClient';

const STORAGE_PREFIX = 'fc-shop-chat:';
const MAX_MESSAGES = 200;
const REPLY_DELAY_MS = 1200;

export const MESSAGE_MAX = 1000;

const DEFAULT_CONTACT = {
  name: 'TrendyLab',
  logoUrl: null,
  official: true, // shop chính hãng của sàn
};

const contactCache = new Map();

/**
 * Tên + logo của shop bán sản phẩm (để hiện trên thẻ shop và khung chat).
 * product.shopId (UUID) + đã đăng nhập -> GET /shops/{shopId}. Còn lại -> TrendyLab.
 */
export async function getShopContact(product, { loggedIn } = {}) {
  const shopId = product?.source === 'api' ? product.shopId : null;
  if (!shopId) return { ...DEFAULT_CONTACT, id: 'trendylab' };
  // Chưa đăng nhập (GET /shops/{id} cần đăng nhập) -> dùng tên shop có sẵn trong sản phẩm
  if (!loggedIn) return { ...DEFAULT_CONTACT, id: shopId, name: product.shopName || DEFAULT_CONTACT.name, official: false };
  if (contactCache.has(shopId)) return contactCache.get(shopId);

  try {
    const shop = await apiClient.get(`/shops/${encodeURIComponent(shopId)}`);
    const contact = {
      id: shopId,
      name: shop.name || product.shopName || DEFAULT_CONTACT.name,
      logoUrl: shop.logoUrl ?? null,
      official: false,
    };
    contactCache.set(shopId, contact);
    return contact;
  } catch (error) {
    console.warn('[ShopChat] Không tải được thông tin shop, hiện TrendyLab', error);
    return { ...DEFAULT_CONTACT, id: shopId, name: product.shopName || DEFAULT_CONTACT.name };
  }
}

// ----- Lưu trữ giả lập -----
const storageKey = (shopId, userKey) => `${STORAGE_PREFIX}${userKey || 'guest'}:${shopId}`;

function read(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function write(key, messages) {
  try {
    localStorage.setItem(key, JSON.stringify(messages.slice(-MAX_MESSAGES)));
  } catch {
    /* hết dung lượng -> bỏ qua */
  }
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function getConversation(shopId, userKey) {
  return read(storageKey(shopId, userKey));
}

/**
 * Gửi tin nhắn. product (tuỳ chọn): đính kèm thẻ sản phẩm đang hỏi (chỉ gửi kèm tin đầu tiên về sản phẩm đó).
 * Trả về danh sách tin nhắn mới.
 */
export function sendMessage(shopId, userKey, { text, product }) {
  const key = storageKey(shopId, userKey);
  const messages = read(key);
  const lastProductId = [...messages].reverse().find((message) => message.product)?.product.id;
  const attachProduct = product && product.id !== lastProductId;

  const message = {
    id: newId(),
    from: 'me',
    text: text.trim().slice(0, MESSAGE_MAX),
    sentAt: new Date().toISOString(),
    ...(attachProduct
      ? { product: { id: product.id, name: product.name, image: product.image ?? null, price: product.price ?? null } }
      : {}),
  };
  const next = [...messages, message];
  write(key, next);
  return next;
}

// ----- Shop trả lời tự động (giả lập) -----
const normalize = (value) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');

const AUTO_REPLIES = [
  {
    test: /size|co |mac vua|cao|nang|kg|form/,
    vi: 'Dạ shop gửi bạn bảng size ở mục "Hướng dẫn chọn size" ngay dưới phần chọn size ạ. Bạn cho shop xin chiều cao và cân nặng, shop tư vấn size vừa nhất nhé!',
    en: 'Please check the "Size guide" next to the size options. Share your height and weight and we will recommend the best size!',
  },
  {
    test: /giao|ship|van chuyen|bao lau|nhan hang/,
    vi: 'Dạ đơn được giao trong 2–4 ngày làm việc tuỳ khu vực, miễn phí giao hàng cho đơn từ 499.000đ ạ.',
    en: 'Orders arrive in 2–4 business days depending on your area. Free shipping on orders from 499,000đ.',
  },
  {
    test: /doi|tra|hoan|bao hanh|loi/,
    vi: 'Dạ shop hỗ trợ đổi trả trong 30 ngày nếu sản phẩm còn tem mác, chưa qua sử dụng. Bạn vào Tài khoản → Đơn hàng để gửi yêu cầu đổi trả nhé!',
    en: 'We accept returns within 30 days for unused items with tags. Go to Account → Orders to request a return.',
  },
  {
    test: /con hang|het hang|mau|color/,
    vi: 'Dạ màu và size còn hàng sẽ hiện trên trang sản phẩm, ô bị mờ là đã hết ạ. Bạn cần màu/size nào, shop kiểm tra kho giúp mình nhé!',
    en: 'Available colors and sizes are shown on the product page; greyed-out options are sold out. Tell us which one you need and we will check stock.',
  },
];

const FALLBACK_REPLY = {
  vi: 'Cảm ơn bạn đã nhắn tin! Shop đã nhận được và sẽ phản hồi sớm nhất trong giờ làm việc (8:00–22:00) ạ.',
  en: 'Thanks for your message! We have received it and will reply as soon as possible during business hours (8:00–22:00).',
};

/** Giả lập shop trả lời sau REPLY_DELAY_MS. Trả về Promise danh sách tin nhắn mới. */
export function simulateShopReply(shopId, userKey, text, language = 'vi') {
  return new Promise((resolve) => {
    setTimeout(() => {
      const key = storageKey(shopId, userKey);
      const words = normalize(text);
      const rule = AUTO_REPLIES.find((item) => item.test.test(words)) ?? FALLBACK_REPLY;
      const next = [
        ...read(key),
        { id: newId(), from: 'shop', text: rule[language] ?? rule.vi, sentAt: new Date().toISOString() },
      ];
      write(key, next);
      resolve(next);
    }, REPLY_DELAY_MS);
  });
}
