import { apiClient } from '../apiClient';
import { enc, MAX_PAGE } from './constants';

// =====================================================================
// TÀI CHÍNH & BÁO CÁO CỦA SHOP — API thật (quyền shop.sales.read: chủ shop, quản lý, tài chính)
//   GET  /shops/{shopId}/finance/account                     -> FinanceAccountResponse (số dư khả dụng, đang chờ rút, đã rút)
//   GET  /shops/{shopId}/finance/settings                    -> FinanceSettingsResponse (phí sàn, mức rút tối thiểu)
//   GET  /shops/{shopId}/finance/transactions?type=&limit=&offset=  -> SliceResponse<FinanceEntryResponse>
//   GET  /shops/{shopId}/finance/settlements?limit=&offset=  -> SliceResponse<SettlementResponse>
//   POST /shops/{shopId}/finance/payouts                     { amountMinor, note? } -> PayoutResponse (REQUESTED)
//   GET  /shops/{shopId}/finance/payouts?status=&limit=&offset=
//   POST /shops/{shopId}/finance/payouts/{payoutId}/cancel   { expectedVersion, note }
//   GET  /shops/{shopId}/reports/sales?from=&to=             -> SalesReportResponse
//   GET  /shops/{shopId}/reports/top-products?from=&to=&limit=
//   GET  /shops/{shopId}/reports/order-statuses?from=&to=
//   GET  /shops/{shopId}/reports/finance.csv?from=&to=       (text/csv)
// Tiền shop nhận = doanh thu - phí sàn (platformFeeRateBp, 500 = 5%) - hoàn tiền. Rút tiền do admin sàn duyệt.
// =====================================================================

export const PAYOUT_STATUSES = ['REQUESTED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED'];
export const FINANCE_ENTRY_TYPES = ['SALE_CREDIT', 'PLATFORM_FEE', 'REFUND_DEBIT', 'FEE_REVERSAL', 'PAYOUT_RESERVED', 'PAYOUT_RELEASED', 'PAYOUT_PAID'];

const base = (shopId) => `/shops/${enc(shopId)}`;
const range = ({ from, to } = {}) => {
  const query = new URLSearchParams();
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  return query;
};
// "?from=...&to=..." hoặc "" khi không lọc ngày
const suffix = (query) => (query.toString() ? '?' + query.toString() : '');

export const getFinanceAccount = (shopId) => apiClient.get(`${base(shopId)}/finance/account`);
export const getFinanceSettings = (shopId) => apiClient.get(`${base(shopId)}/finance/settings`);

export function getTransactions(shopId, { type = '', limit = 50, offset = 0 } = {}) {
  const query = new URLSearchParams({ limit: String(Math.min(limit, MAX_PAGE)), offset: String(offset) });
  if (type) query.set('type', type);
  return apiClient.get(`${base(shopId)}/finance/transactions?${query}`);
}

export function getSettlements(shopId, { limit = 50, offset = 0 } = {}) {
  return apiClient.get(`${base(shopId)}/finance/settlements?limit=${Math.min(limit, MAX_PAGE)}&offset=${offset}`);
}

export function getPayouts(shopId, { status = '', limit = 50, offset = 0 } = {}) {
  const query = new URLSearchParams({ limit: String(Math.min(limit, MAX_PAGE)), offset: String(offset) });
  if (status) query.set('status', status);
  return apiClient.get(`${base(shopId)}/finance/payouts?${query}`);
}

export function requestPayout(shopId, { amountMinor, note }) {
  return apiClient.post(`${base(shopId)}/finance/payouts`, { amountMinor: Number(amountMinor), note: note?.trim() || null });
}

export function cancelPayout(shopId, payout, note) {
  return apiClient.post(`${base(shopId)}/finance/payouts/${enc(payout.id)}/cancel`, {
    expectedVersion: payout.version,
    note: note?.trim() || 'Seller cancelled',
  });
}

export function getSalesReport(shopId, period) {
  const query = range(period);
  return apiClient.get(`${base(shopId)}/reports/sales${suffix(query)}`);
}

export function getTopProducts(shopId, period, limit = 10) {
  const query = range(period);
  query.set('limit', String(limit));
  return apiClient.get(`${base(shopId)}/reports/top-products?${query}`);
}

export function getOrderStatusReport(shopId, period) {
  const query = range(period);
  return apiClient.get(`${base(shopId)}/reports/order-statuses${suffix(query)}`);
}

// Tải file CSV đối soát về máy
export async function downloadFinanceCsv(shopId, period) {
  const query = range(period);
  const text = await apiClient.get(`${base(shopId)}/reports/finance.csv${suffix(query)}`, { accept: 'text/csv' });
  const blob = new Blob([typeof text === 'string' ? text : JSON.stringify(text)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `finance-${period?.from ?? 'all'}-${period?.to ?? 'now'}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
