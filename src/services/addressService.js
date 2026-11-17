import { apiClient } from './apiClient';

// =====================================================================
// SỔ ĐỊA CHỈ CỦA NGƯỜI MUA — API thật (cần đăng nhập)
//   GET    /users/me/addresses              -> AddressResponse[]
//   POST   /users/me/addresses              -> AddressResponse (201)
//   PUT    /users/me/addresses/{addressId}  -> AddressResponse (gửi ĐỦ payload)
//   DELETE /users/me/addresses/{addressId}  -> 204
// Backend tự giữ đúng 1 địa chỉ mặc định.
// =====================================================================

// Form -> CreateAddressRequest / UpdateAddressRequest (chuỗi rỗng -> null cho trường không bắt buộc)
export function toAddressRequest(form) {
  const optional = (value) => (value && String(value).trim() ? String(value).trim() : null);
  return {
    recipientName: String(form.recipientName ?? '').trim(),
    recipientPhone: String(form.recipientPhone ?? '').replace(/[\s.]/g, ''),
    addressLine1: String(form.addressLine1 ?? '').trim(),
    addressLine2: optional(form.addressLine2),
    ward: optional(form.ward),
    district: optional(form.district),
    province: String(form.province ?? '').trim(),
    provinceCode: optional(form.provinceCode),
    postalCode: optional(form.postalCode),
    countryCode: (form.countryCode || 'VN').toUpperCase(),
    defaultAddress: Boolean(form.defaultAddress),
  };
}

// "12 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh"
export function formatAddressLine(address) {
  if (!address) return '';
  return [address.addressLine1, address.addressLine2, address.ward, address.district, address.province]
    .filter(Boolean)
    .join(', ');
}

export async function getAddresses() {
  const list = (await apiClient.get('/users/me/addresses')) ?? [];
  // Địa chỉ mặc định luôn lên đầu, còn lại: mới thêm trước
  return [...list].sort(
    (a, b) =>
      Number(b.defaultAddress) - Number(a.defaultAddress) || String(b.createdAt).localeCompare(String(a.createdAt)),
  );
}

export function createAddress(form) {
  return apiClient.post('/users/me/addresses', toAddressRequest(form));
}

export function updateAddress(addressId, form) {
  return apiClient.put(`/users/me/addresses/${encodeURIComponent(addressId)}`, toAddressRequest(form));
}

export async function deleteAddresses(addressIds) {
  for (const id of addressIds) {
    await apiClient.delete(`/users/me/addresses/${encodeURIComponent(id)}`);
  }
}

export const deleteAddress = (addressId) => deleteAddresses([addressId]);

// Đặt mặc định = cập nhật lại địa chỉ đó với defaultAddress: true
export function setDefaultAddress(address) {
  return updateAddress(address.id, { ...address, defaultAddress: true });
}
