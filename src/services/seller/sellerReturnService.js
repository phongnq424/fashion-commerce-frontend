import { apiError, now, requireShop, slice, transact, uuid } from './sellerDb';

// =====================================================================
// TRẢ HÀNG CỦA SHOP — GIẢ LẬP, đúng dạng backend (contract mục 17, phần Shop):
//   GET  /shops/{shopId}/returns                          -> SliceResponse<ReturnSummaryResponse>
//   GET  /shops/{shopId}/returns/{returnId}               -> ReturnResponse
//   POST .../{id}/decision            { decision: APPROVE|REJECT, note? }   chỉ khi REQUESTED
//   POST .../{id}/receive             { note? }                              APPROVED | RETURNING -> RECEIVED (hoàn kho)
//   POST .../{id}/manual-cod-refund   { amountMinor, reference, note? }      RECEIVED + COD đã thu, số tiền = requestedRefundMinor
// =====================================================================

const toSummary = (item) => ({
  id: item.id,
  orderId: item.orderId,
  shopOrderId: item.shopOrderId,
  shopOrderNumber: item.shopOrderNumber,
  status: item.status,
  reasonCode: item.reasonCode,
  requestedRefundMinor: item.requestedRefundMinor,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  buyerName: item.buyerName, // riêng bản giả lập
  itemCount: item.items.reduce((sum, line) => sum + line.returnQuantity, 0),
});

function find(db, me, shopId, returnId) {
  const shop = requireShop(db, me, shopId);
  const item = shop.returns.find((r) => r.id === returnId);
  if (!item) throw apiError(404, 'RETURN_NOT_FOUND');
  return { shop, item };
}

function move(item, toStatus, note) {
  const at = now();
  item.events.push({ id: uuid(), fromStatus: item.status, toStatus, actorUserId: null, note: note?.trim() || null, occurredAt: at });
  Object.assign(item, { status: toStatus, updatedAt: at });
}

export function getShopReturns(shopId, { limit = 200, offset = 0 } = {}) {
  return transact((db, me) => {
    const items = requireShop(db, me, shopId).returns.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(toSummary);
    return slice(items, limit, offset);
  }, 150);
}

export function getShopReturn(shopId, returnId) {
  return transact((db, me) => {
    const { shop, item } = find(db, me, shopId, returnId);
    // riêng bản giả lập: kèm trạng thái COD của đơn để biết có hoàn COD thủ công được không
    const cod = shop.cod.find((c) => c.shopOrderId === item.shopOrderId);
    return { ...item, codStatus: cod?.status ?? null };
  }, 120);
}

export function decideReturn(shopId, returnId, { decision, note }) {
  return transact((db, me) => {
    const { item } = find(db, me, shopId, returnId);
    if (item.status !== 'REQUESTED') throw apiError(409, 'RETURN_NOT_DECIDABLE');
    if (decision === 'REJECT' && !note?.trim()) throw apiError(400, 'RETURN_REJECTION_NOTE_REQUIRED');
    move(item, decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', note);
    item.decisionNote = note?.trim() || null;
    return item;
  });
}

export function receiveReturn(shopId, returnId, { note } = {}) {
  return transact((db, me) => {
    const { shop, item } = find(db, me, shopId, returnId);
    if (!['APPROVED', 'RETURNING'].includes(item.status)) throw apiError(409, 'RETURN_NOT_RECEIVABLE');
    move(item, 'RECEIVED', note);
    item.receivedAt = now();
    // Hoàn kho đúng 1 lần
    item.items.forEach((line) => {
      const variant = shop.products.flatMap((p) => p.variants).find((v) => v.id === line.variantId);
      if (variant) {
        variant.quantityOnHand += line.returnQuantity;
        variant.availableQuantity = Math.max(0, variant.quantityOnHand - variant.quantityReserved);
      }
    });
    const order = shop.orders.find((o) => o.id === item.shopOrderId);
    const fullyReturned = order?.items.every((orderLine) => item.items.some((l) => l.orderItemId === orderLine.id && l.returnQuantity >= orderLine.quantity));
    if (order && fullyReturned) order.status = 'RETURNED';
    return item;
  });
}

export function manualCodRefund(shopId, returnId, { amountMinor, reference, note }) {
  return transact((db, me) => {
    const { shop, item } = find(db, me, shopId, returnId);
    if (item.refund) throw apiError(409, 'RETURN_ALREADY_REFUNDED');
    if (item.status !== 'RECEIVED') throw apiError(409, 'RETURN_NOT_REFUNDABLE');
    const cod = shop.cod.find((c) => c.shopOrderId === item.shopOrderId);
    if (!cod || !['COLLECTED', 'RECONCILED'].includes(cod.status)) throw apiError(409, 'COD_REFUND_PAYMENT_NOT_COLLECTED');
    if (Number(amountMinor) !== item.requestedRefundMinor) throw apiError(422, 'REFUND_AMOUNT_MISMATCH');
    if (!reference?.trim()) throw apiError(400, 'REQUEST_INVALID');
    const at = now();
    item.refund = { id: uuid(), method: 'MANUAL_COD', amountMinor: Number(amountMinor), reference: reference.trim(), status: 'SUCCEEDED', note: note?.trim() || null, processedAt: at };
    move(item, 'REFUNDED', note);
    return { ...item, codStatus: cod.status };
  });
}
