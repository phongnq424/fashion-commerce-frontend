import { STORAGE_KEYS } from '../constants/storageKeys';
import { currentOwner, findMockOrderByShopOrder } from './mockOrderStore';

// =====================================================================
// TRẢ HÀNG / HOÀN TIỀN (người mua) — hiện GIẢ LẬP ở frontend, lưu trong localStorage.
// Dữ liệu đúng dạng backend (ReturnResponse / ReturnSummaryResponse), nên sau này nối API thật
// chỉ cần thay thân các hàm dưới bằng:
//   POST /returns                      CreateReturnRequest -> ReturnResponse
//   GET  /returns?limit=&offset=       -> SliceResponse<ReturnSummaryResponse>
//   GET  /returns/{returnId}           -> ReturnResponse
//   POST /returns/{returnId}/cancel    -> chỉ khi REQUESTED
//   POST /returns/{returnId}/dispatch  { carrierCode, trackingNumber } -> chỉ khi APPROVED
// Quy tắc giống backend: chỉ đơn của shop đã HOÀN THÀNH mới gửi được yêu cầu trả hàng.
// =====================================================================

// reasonCode (backend nhận [A-Z0-9_]+). Chữ hiển thị: i18n returns.reasons.<code>
export const RETURN_REASONS = ['WRONG_SIZE', 'DEFECTIVE', 'NOT_AS_DESCRIBED', 'WRONG_ITEM', 'CHANGED_MIND', 'OTHER'];
// Đơn vị vận chuyển khi khách tự gửi trả. Chữ hiển thị: i18n returns.carriers.<code>
export const RETURN_CARRIERS = ['GHN', 'GHTK', 'VIETTEL_POST', 'SPX', 'JT', 'VNPOST', 'OTHER'];
export const RETURN_STEPS = ['REQUESTED', 'APPROVED', 'RETURNING', 'RECEIVED', 'REFUNDED'];

const wait = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
const fail = (status, code) => Object.assign(new Error(code), { status, code });
const newId = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const sameEmail = (a, b) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase();

const readAll = () => {
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.mockReturns) ?? '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};
const writeAll = (list) => {
  try {
    localStorage.setItem(STORAGE_KEYS.mockReturns, JSON.stringify(list));
  } catch {
    /* bỏ qua */
  }
};
const mine = () => readAll().filter((item) => sameEmail(item.owner, currentOwner()));

function findMine(returnId) {
  const found = mine().find((item) => item.id === returnId);
  if (!found) throw fail(404, 'RETURN_NOT_FOUND');
  return found;
}

function update(returnId, changes, toStatus, note = null) {
  let updated;
  writeAll(
    readAll().map((item) => {
      if (item.id !== returnId) return item;
      const now = new Date().toISOString();
      updated = {
        ...item,
        ...changes,
        status: toStatus,
        events: [...item.events, { id: newId(), fromStatus: item.status, toStatus, actorUserId: null, note, occurredAt: now }],
        updatedAt: now,
      };
      return updated;
    }),
  );
  return updated;
}

export async function createReturn({ shopOrderId, reasonCode, description, evidenceKeys, items }) {
  await wait(400);
  const order = findMockOrderByShopOrder(shopOrderId);
  const shop = order?.shops.find((item) => item.id === shopOrderId);
  if (!shop || !['COMPLETED', 'RETURNED'].includes(shop.status)) throw fail(422, 'RETURN_NOT_ELIGIBLE');

  const now = new Date().toISOString();
  const returnItems = items.map(({ orderItemId, quantity }) => {
    const line = shop.items.find((item) => item.id === orderItemId);
    if (!line) throw fail(400, 'RETURN_ITEM_INVALID');
    if (quantity > line.quantity) throw fail(400, 'RETURN_QUANTITY_EXCEEDED');
    return {
      orderItemId,
      productId: line.productId,
      variantId: line.variantId,
      productName: line.productName,
      sellerSku: line.sellerSku,
      purchasedQuantity: line.quantity,
      returnQuantity: quantity,
      requestedRefundMinor: Math.round((line.lineTotalMinor / line.quantity) * quantity),
    };
  });

  const created = {
    id: newId(),
    orderId: order.id,
    shopOrderId,
    shopOrderNumber: shop.shopOrderNumber,
    shopId: shop.shopId,
    buyerId: null,
    reasonCode,
    description: description?.trim() || null,
    evidenceKeys: evidenceKeys ?? [],
    status: 'REQUESTED',
    decisionNote: null,
    createdAt: now,
    updatedAt: now,
    dispatchedAt: null,
    receivedAt: null,
    carrierCode: null,
    trackingNumber: null,
    items: returnItems,
    requestedRefundMinor: returnItems.reduce((sum, item) => sum + item.requestedRefundMinor, 0),
    refund: null,
    events: [{ id: newId(), fromStatus: null, toStatus: 'REQUESTED', actorUserId: null, note: null, occurredAt: now }],
    owner: currentOwner(),
  };
  writeAll([created, ...readAll()]);
  return created;
}

export async function getMyReturns({ limit = 20, offset = 0 } = {}) {
  await wait();
  const all = mine().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    items: all.slice(offset, offset + limit).map((item) => ({
      id: item.id,
      orderId: item.orderId,
      shopOrderId: item.shopOrderId,
      shopOrderNumber: item.shopOrderNumber,
      status: item.status,
      reasonCode: item.reasonCode,
      requestedRefundMinor: item.requestedRefundMinor,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
    limit,
    offset,
    hasMore: offset + limit < all.length,
  };
}

export async function getMyReturn(returnId) {
  await wait();
  return findMine(returnId);
}

export async function cancelReturn(returnId) {
  await wait(300);
  if (findMine(returnId).status !== 'REQUESTED') throw fail(409, 'RETURN_NOT_CANCELLABLE');
  return update(returnId, {}, 'CANCELLED');
}

export async function dispatchReturn(returnId, { carrierCode, trackingNumber }) {
  await wait(300);
  if (findMine(returnId).status !== 'APPROVED') throw fail(409, 'RETURN_NOT_DISPATCHABLE');
  return update(
    returnId,
    { carrierCode, trackingNumber: trackingNumber.trim(), dispatchedAt: new Date().toISOString() },
    'RETURNING',
  );
}
