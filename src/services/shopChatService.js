// =====================================================================
// CHAT VỚI SHOP (khách mua <-> shop trên sàn)
// ---------------------------------------------------------------------
// Backend HIỆN CHƯA CÓ API chat (không có bảng, không có endpoint).
// -> Tin nhắn được GIẢ LẬP: lưu trong localStorage của trình duyệt, shop tự trả lời mẫu.
//    Shop KHÔNG nhận được tin thật. Khi Backend có API (vd GET/POST /api/v1/conversations/...),
//    chỉ cần thay các hàm listConversations / getConversation / sendMessage / simulateShopReply,
//    giao diện (components/ShopChat) giữ nguyên.
// =====================================================================

const STORAGE_PREFIX = 'fc-shop-chat:';
const MAX_MESSAGES = 200;
const REPLY_DELAY_MS = 1200;

export const MESSAGE_MAX = 1000;

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

// Tin nhắn cuối của từng shop mà người dùng đã chat: { [shopId]: message }
export function listConversations(userKey) {
  const prefix = `${STORAGE_PREFIX}${userKey || 'guest'}:`;
  const result = {};
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      const messages = read(key);
      if (messages.length) result[key.slice(prefix.length)] = messages[messages.length - 1];
    }
  } catch {
    /* bỏ qua */
  }
  return result;
}

/**
 * Gửi tin nhắn. product (tuỳ chọn): đính kèm thẻ sản phẩm đang hỏi (chỉ gửi kèm lần đầu hỏi về sản phẩm đó).
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
      ? { product: { id: product.id, name: product.name, image: product.image ?? product.images?.[0] ?? null, price: product.price ?? null } }
      : {}),
  };
  const next = [...messages, message];
  write(key, next);
  return next;
}

// ----- Shop trả lời tự động (giả lập). Không hứa chính sách cụ thể vì mỗi shop tự đặt chính sách. -----
const normalize = (value) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');

const AUTO_REPLIES = [
  {
    test: /size|co |mac vua|cao|nang|kg|form/,
    vi: 'Dạ bạn cho shop xin chiều cao và cân nặng, shop tư vấn size vừa nhất nhé! Bảng size tham khảo có ở mục "Hướng dẫn chọn size" trên trang sản phẩm ạ.',
    en: 'Please share your height and weight and we will recommend the best size. A reference size chart is under "Size guide" on the product page.',
  },
  {
    test: /giao|ship|van chuyen|bao lau|nhan hang/,
    vi: 'Dạ shop đóng gói và giao cho đơn vị vận chuyển trong thời gian xử lý của shop. Bạn theo dõi mã vận đơn ở Tài khoản → Đơn mua nhé!',
    en: 'We pack and hand your order to the carrier within our handling time. Track it under Account → Orders.',
  },
  {
    test: /doi|tra|hoan|bao hanh|loi/,
    vi: 'Dạ bạn gửi yêu cầu ở Tài khoản → Trả hàng / hoàn tiền, chọn sản phẩm cần trả. Shop sẽ xem và phản hồi sớm ạ.',
    en: 'Please request it under Account → Returns & refunds and choose the items. We will review it shortly.',
  },
  {
    test: /con hang|het hang|mau|color/,
    vi: 'Dạ màu và size còn hàng hiện trên trang sản phẩm, ô bị mờ là đã hết ạ. Bạn cần màu/size nào, shop kiểm tra kho giúp mình nhé!',
    en: 'Available colors and sizes are shown on the product page; greyed-out options are sold out. Tell us which one you need.',
  },
];

const FALLBACK_REPLY = {
  vi: 'Cảm ơn bạn đã nhắn tin! Shop đã nhận được và sẽ phản hồi sớm nhất ạ.',
  en: 'Thanks for your message! We have received it and will reply as soon as possible.',
};

/** Giả lập shop trả lời sau REPLY_DELAY_MS. Trả về Promise danh sách tin nhắn mới. */
export function simulateShopReply(shopId, userKey, text, language = 'vi') {
  return new Promise((resolve) => {
    setTimeout(() => {
      const key = storageKey(shopId, userKey);
      const rule = AUTO_REPLIES.find((item) => item.test.test(normalize(text))) ?? FALLBACK_REPLY;
      const next = [...read(key), { id: newId(), from: 'shop', text: rule[language] ?? rule.vi, sentAt: new Date().toISOString() }];
      write(key, next);
      resolve(next);
    }, REPLY_DELAY_MS);
  });
}
