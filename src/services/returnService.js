import { apiClient } from './apiClient';

// =====================================================================
// TRẢ HÀNG / HOÀN TIỀN (người mua) — API thật
//   POST /returns                      CreateReturnRequest -> ReturnResponse
//   GET  /returns?limit=&offset=       -> SliceResponse<ReturnSummaryResponse>
//   GET  /returns/{returnId}           -> ReturnResponse
//   POST /returns/{returnId}/cancel    -> chỉ khi REQUESTED
//   POST /returns/{returnId}/dispatch  { carrierCode, trackingNumber, shippedAt? } -> chỉ khi APPROVED
// Backend chỉ nhận yêu cầu cho shop order COMPLETED / RETURNED và còn trong hạn trả hàng của shop.
// =====================================================================

// reasonCode (backend nhận [A-Z0-9_]+). Chữ hiển thị: i18n returns.reasons.<code>
export const RETURN_REASONS = ['WRONG_SIZE', 'DEFECTIVE', 'NOT_AS_DESCRIBED', 'WRONG_ITEM', 'CHANGED_MIND', 'OTHER'];
// Đơn vị vận chuyển khi khách tự gửi trả. Chữ hiển thị: i18n returns.carriers.<code>
export const RETURN_CARRIERS = ['GHN', 'GHTK', 'VIETTEL_POST', 'SPX', 'JT', 'VNPOST', 'OTHER'];
export const RETURN_STEPS = ['REQUESTED', 'APPROVED', 'RETURNING', 'RECEIVED', 'REFUNDED'];

export function createReturn({ shopOrderId, reasonCode, description, evidenceKeys, items }) {
  return apiClient.post('/returns', {
    shopOrderId,
    reasonCode,
    description: description?.trim() || null,
    evidenceKeys: evidenceKeys?.length ? evidenceKeys : [],
    items: items.map((item) => ({ orderItemId: item.orderItemId, quantity: item.quantity })),
  });
}

export function getMyReturns({ limit = 20, offset = 0 } = {}) {
  return apiClient.get(`/returns?limit=${limit}&offset=${offset}`);
}

export function getMyReturn(returnId) {
  return apiClient.get(`/returns/${encodeURIComponent(returnId)}`);
}

export function cancelReturn(returnId) {
  return apiClient.post(`/returns/${encodeURIComponent(returnId)}/cancel`);
}

export function dispatchReturn(returnId, { carrierCode, trackingNumber }) {
  return apiClient.post(`/returns/${encodeURIComponent(returnId)}/dispatch`, {
    carrierCode,
    trackingNumber: trackingNumber.trim(),
  });
}
