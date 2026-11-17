import { apiClient } from '../apiClient';
import { enc, fetchAllSlices, MAX_PAGE } from './constants';

// =====================================================================
// TRẢ HÀNG / HOÀN TIỀN PHÍA SHOP — API thật
//   GET  /shops/{shopId}/returns?limit=&offset=           -> SliceResponse<ReturnSummaryResponse>
//   GET  /shops/{shopId}/returns/{returnId}               -> ReturnResponse
//   POST .../{id}/decision            { decision: APPROVE|REJECT, note? }   chỉ khi REQUESTED
//   POST .../{id}/receive             { receivedAt?, note? }                 APPROVED | RETURNING -> RECEIVED (hoàn kho)
//   POST .../{id}/manual-cod-refund   { amountMinor, reference, processedAt?, note? }  RECEIVED + COD đã thu
// =====================================================================

const base = (shopId) => `/shops/${enc(shopId)}/returns`;

export function getShopReturns(shopId, { limit = MAX_PAGE, offset = 0 } = {}) {
  return apiClient.get(`${base(shopId)}?limit=${Math.min(limit, MAX_PAGE)}&offset=${offset}`);
}

export function getAllShopReturns(shopId) {
  return fetchAllSlices(({ limit, offset }) => getShopReturns(shopId, { limit, offset }));
}

export function getShopReturn(shopId, returnId) {
  return apiClient.get(`${base(shopId)}/${enc(returnId)}`);
}

export function decideReturn(shopId, returnId, { decision, note }) {
  return apiClient.post(`${base(shopId)}/${enc(returnId)}/decision`, { decision, note: note?.trim() || null });
}

export function receiveReturn(shopId, returnId, { note } = {}) {
  return apiClient.post(`${base(shopId)}/${enc(returnId)}/receive`, { note: note?.trim() || null });
}

export function manualCodRefund(shopId, returnId, { amountMinor, reference, note }) {
  return apiClient.post(`${base(shopId)}/${enc(returnId)}/manual-cod-refund`, {
    amountMinor: Number(amountMinor),
    reference: reference.trim(),
    note: note?.trim() || null,
  });
}
