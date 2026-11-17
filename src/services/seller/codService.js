import { apiClient } from '../apiClient';
import { enc, fetchAllSlices, MAX_PAGE } from './constants';

// =====================================================================
// THU HỘ COD & ĐỐI SOÁT — API thật
//   GET  /shops/{shopId}/cod-payments?status=&limit=&offset=  -> SliceResponse<CodCollectionSummaryResponse>
//   GET  /shops/{shopId}/cod-payments/{id}                    -> CodCollectionResponse (có events)
//   POST .../{id}/collect    { amountCollectedMinor, collectionReference, collectedAt?, note? }
//   POST .../{id}/fail       { reason, occurredAt? }
//   POST .../{id}/reconcile  { reconciliationReference, reconciledAt?, note? }   COLLECTED -> RECONCILED
// Luồng: AWAITING_COLLECTION -> COLLECTED -> RECONCILED ; thu lỗi: AWAITING_COLLECTION -> COLLECTION_FAILED -> COLLECTED
// =====================================================================

export const COD_STATUSES = ['AWAITING_COLLECTION', 'COLLECTION_FAILED', 'COLLECTED', 'RECONCILED', 'CANCELLED'];

const base = (shopId) => `/shops/${enc(shopId)}/cod-payments`;

export function getCodCollections(shopId, { status = '', limit = MAX_PAGE, offset = 0 } = {}) {
  const query = new URLSearchParams({ limit: String(Math.min(limit, MAX_PAGE)), offset: String(offset) });
  if (status) query.set('status', status);
  return apiClient.get(`${base(shopId)}?${query}`);
}

export function getAllCodCollections(shopId, { status = '' } = {}) {
  return fetchAllSlices(({ limit, offset }) => getCodCollections(shopId, { status, limit, offset }));
}

export function getCodCollection(shopId, collectionId) {
  return apiClient.get(`${base(shopId)}/${enc(collectionId)}`);
}

export function collectCod(shopId, collectionId, { amountCollectedMinor, collectionReference, note }) {
  return apiClient.post(`${base(shopId)}/${enc(collectionId)}/collect`, {
    amountCollectedMinor: Number(amountCollectedMinor),
    collectionReference: collectionReference.trim(),
    note: note?.trim() || null,
  });
}

export function failCod(shopId, collectionId, { reason }) {
  return apiClient.post(`${base(shopId)}/${enc(collectionId)}/fail`, { reason: reason.trim() });
}

export function reconcileCod(shopId, collectionId, { reconciliationReference, note }) {
  return apiClient.post(`${base(shopId)}/${enc(collectionId)}/reconcile`, {
    reconciliationReference: reconciliationReference.trim(),
    note: note?.trim() || null,
  });
}
