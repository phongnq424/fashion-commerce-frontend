import { apiError, now, requireShop, slice, transact, uuid } from './adminDb';

// =====================================================================
// THU HỘ COD & ĐỐI SOÁT — GIẢ LẬP, đúng dạng backend (contract mục 14):
//   GET  /shops/{shopId}/cod-payments?status=          -> SliceResponse<CodCollectionSummaryResponse>
//   GET  /shops/{shopId}/cod-payments/{id}              -> CodCollectionResponse (có events)
//   POST .../{id}/collect    { amountCollectedMinor, collectionReference, note? }  (đơn phải đã giao, số tiền đúng bằng dự kiến)
//   POST .../{id}/fail       { reason }
//   POST .../{id}/reconcile  { reconciliationReference, note? }                   COLLECTED -> RECONCILED
// Luồng: AWAITING_COLLECTION -> COLLECTED -> RECONCILED ; thu lỗi: AWAITING_COLLECTION -> COLLECTION_FAILED -> COLLECTED
// =====================================================================

export const COD_STATUSES = ['AWAITING_COLLECTION', 'COLLECTION_FAILED', 'COLLECTED', 'RECONCILED', 'CANCELLED'];

function summary(collection, shop) {
  const order = shop.orders.find((o) => o.id === collection.shopOrderId);
  const { events, failureReason, collectionReference, reconciliationReference, reconciliationNote, collectedBy, reconciledBy, version, createdAt, shopId, ...rest } = collection;
  void events; void failureReason; void collectionReference; void reconciliationReference; void reconciliationNote; void collectedBy; void reconciledBy; void version; void createdAt; void shopId;
  return { ...rest, shopOrderStatus: order?.status ?? null, recipientName: order?.recipient.recipientName ?? null };
}

function find(db, me, shopId, collectionId) {
  const shop = requireShop(db, me, shopId);
  const collection = shop.cod.find((c) => c.id === collectionId);
  if (!collection) throw apiError(404, 'COD_COLLECTION_NOT_FOUND');
  return { shop, collection };
}

function move(collection, toStatus, note) {
  const at = now();
  collection.events.push({ id: uuid(), fromStatus: collection.status, toStatus, actorUserId: null, note: note || null, occurredAt: at });
  Object.assign(collection, { status: toStatus, version: collection.version + 1, updatedAt: at });
}

// Đơn tổng chỉ PAID khi mọi COD chưa hủy đều COLLECTED / RECONCILED
function syncPaymentStatus(collection) {
  collection.paymentStatus = ['COLLECTED', 'RECONCILED'].includes(collection.status)
    ? 'PAID'
    : collection.status === 'COLLECTION_FAILED'
      ? 'FAILED'
      : collection.status === 'CANCELLED'
        ? 'CANCELLED'
        : 'AWAITING_COLLECTION';
}

export function getCodCollections(shopId, { status = '', limit = 200, offset = 0 } = {}) {
  return transact((db, me) => {
    const shop = requireShop(db, me, shopId);
    const items = shop.cod
      .filter((c) => !status || c.status === status)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((c) => summary(c, shop));
    return slice(items, limit, offset);
  }, 150);
}

export function getCodCollection(shopId, collectionId) {
  return transact((db, me) => find(db, me, shopId, collectionId).collection, 100);
}

export function collectCod(shopId, collectionId, { amountCollectedMinor, collectionReference, note }) {
  return transact((db, me) => {
    const { shop, collection } = find(db, me, shopId, collectionId);
    if (!['AWAITING_COLLECTION', 'COLLECTION_FAILED'].includes(collection.status)) throw apiError(409, 'COD_COLLECTION_NOT_COLLECTABLE');
    const order = shop.orders.find((o) => o.id === collection.shopOrderId);
    if (!order || !['COMPLETED', 'DELIVERED'].includes(order.status)) throw apiError(409, 'COD_ORDER_NOT_DELIVERED');
    if (Number(amountCollectedMinor) !== collection.expectedAmountMinor) throw apiError(422, 'COD_AMOUNT_MISMATCH');
    if (!collectionReference?.trim()) throw apiError(400, 'REQUEST_INVALID');
    move(collection, 'COLLECTED', note);
    Object.assign(collection, { collectedAmountMinor: Number(amountCollectedMinor), collectionReference: collectionReference.trim(), collectedAt: now(), collectedBy: me.userId, failureReason: null });
    syncPaymentStatus(collection);
    return collection;
  });
}

export function failCod(shopId, collectionId, { reason }) {
  return transact((db, me) => {
    const { collection } = find(db, me, shopId, collectionId);
    if (collection.status !== 'AWAITING_COLLECTION') throw apiError(409, 'COD_COLLECTION_NOT_COLLECTABLE');
    if (!reason?.trim()) throw apiError(400, 'REQUEST_INVALID');
    move(collection, 'COLLECTION_FAILED', reason);
    collection.failureReason = reason.trim();
    syncPaymentStatus(collection);
    return collection;
  });
}

export function reconcileCod(shopId, collectionId, { reconciliationReference, note }) {
  return transact((db, me) => {
    const { collection } = find(db, me, shopId, collectionId);
    if (collection.status !== 'COLLECTED') throw apiError(409, 'COD_COLLECTION_NOT_RECONCILABLE');
    if (!reconciliationReference?.trim()) throw apiError(400, 'REQUEST_INVALID');
    move(collection, 'RECONCILED', note);
    Object.assign(collection, { reconciliationReference: reconciliationReference.trim(), reconciliationNote: note?.trim() || null, reconciledAt: now(), reconciledBy: me.userId });
    syncPaymentStatus(collection);
    return collection;
  });
}
