import { apiClient } from '../apiClient';
import { enc, MAX_PAGE } from './constants';

// =====================================================================
// VOUCHER CỦA SHOP — API thật (quyền shop.voucher.manage)
//   POST /shops/{shopId}/vouchers                         CreateVoucherRequest -> VoucherResponse
//   GET  /shops/{shopId}/vouchers?limit=&offset=          -> SliceResponse<VoucherResponse>
//   GET  /shops/{shopId}/vouchers/{voucherId}
//   PUT  /shops/{shopId}/vouchers/{voucherId}             UpdateVoucherRequest (expectedVersion, không đổi code)
//   POST /shops/{shopId}/vouchers/{voucherId}/activate    { expectedVersion, note? }
//   POST /shops/{shopId}/vouchers/{voucherId}/deactivate  { expectedVersion, note? }
// appliesTo: ORDER (giảm tiền hàng) | SHIPPING (giảm phí ship). discountType: PERCENT (discountRateBp, 1000 = 10%) | FIXED.
// =====================================================================

export const VOUCHER_APPLIES_TO = ['ORDER', 'SHIPPING'];
export const VOUCHER_DISCOUNT_TYPES = ['PERCENT', 'FIXED'];

const base = (shopId) => `/shops/${enc(shopId)}/vouchers`;

export function getVouchers(shopId, { limit = MAX_PAGE, offset = 0 } = {}) {
  return apiClient.get(`${base(shopId)}?limit=${Math.min(limit, MAX_PAGE)}&offset=${offset}`);
}

export const getVoucher = (shopId, voucherId) => apiClient.get(`${base(shopId)}/${enc(voucherId)}`);

// form: { code, name, description, appliesTo, discountType, percent, amountMinor, maxDiscountMinor, minSpendMinor,
//         usageLimit, perUserLimit, startsAt (datetime-local), endsAt, active }
export function toVoucherRequest(form) {
  const num = (value) => (value === '' || value === null || value === undefined ? null : Number(value));
  const percent = form.discountType === 'PERCENT';
  return {
    name: form.name.trim(),
    description: form.description?.trim() || null,
    appliesTo: form.appliesTo,
    discountType: form.discountType,
    discountRateBp: percent ? Math.round(Number(form.percent) * 100) : null,
    discountAmountMinor: percent ? null : num(form.amountMinor),
    maxDiscountMinor: num(form.maxDiscountMinor),
    minSpendMinor: num(form.minSpendMinor) ?? 0,
    usageLimit: Number(form.usageLimit),
    perUserLimit: Number(form.perUserLimit),
    startsAt: new Date(form.startsAt).toISOString(),
    endsAt: new Date(form.endsAt).toISOString(),
  };
}

export function createVoucher(shopId, form) {
  return apiClient.post(base(shopId), {
    code: form.code.trim().toUpperCase(),
    ...toVoucherRequest(form),
    active: Boolean(form.active),
  });
}

export function updateVoucher(shopId, voucher, form) {
  return apiClient.put(`${base(shopId)}/${enc(voucher.id)}`, { expectedVersion: voucher.version, ...toVoucherRequest(form) });
}

export function setVoucherActive(shopId, voucher, active) {
  return apiClient.post(`${base(shopId)}/${enc(voucher.id)}/${active ? 'activate' : 'deactivate'}`, {
    expectedVersion: voucher.version,
    note: null,
  });
}
