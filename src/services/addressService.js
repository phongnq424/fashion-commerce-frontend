import { STORAGE_KEYS } from '../constants/storageKeys';
import { currentOwner } from './mockOrderStore';

// =====================================================================
// SỔ ĐỊA CHỈ CỦA NGƯỜI MUA — hiện GIẢ LẬP ở frontend (localStorage, tách theo email người dùng).
// Dữ liệu đúng dạng AddressResponse của backend, nên sau này nối API thật chỉ cần thay thân hàm:
//   GET    /users/me/addresses              -> AddressResponse[]
//   POST   /users/me/addresses              -> AddressResponse (201)
//   PUT    /users/me/addresses/{addressId}  -> AddressResponse (gửi ĐỦ payload)
//   DELETE /users/me/addresses/{addressId}  -> 204  (xoá nhiều = gọi lần lượt từng id)
// Quy tắc giống backend: địa chỉ đầu tiên tự thành mặc định; chỉ có 1 địa chỉ mặc định.
// =====================================================================

const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));
const newId = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const ownerKey = () => String(currentOwner() ?? '').trim().toLowerCase();

function readAll() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.mockAddresses) ?? '{}');
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

const readMine = () => readAll()[ownerKey()] ?? [];

function writeMine(list) {
  // Luôn đúng 1 địa chỉ mặc định (nếu còn địa chỉ)
  if (list.length && !list.some((item) => item.defaultAddress)) list[0] = { ...list[0], defaultAddress: true };
  const all = readAll();
  all[ownerKey()] = list;
  try {
    localStorage.setItem(STORAGE_KEYS.mockAddresses, JSON.stringify(all));
  } catch {
    /* bỏ qua */
  }
}

// Form -> AddressRequest đúng contract (chuỗi rỗng -> null cho các trường không bắt buộc)
export function toAddressRequest(form) {
  const optional = (value) => (value && String(value).trim() ? String(value).trim() : null);
  return {
    recipientName: form.recipientName.trim(),
    recipientPhone: form.recipientPhone.replace(/[\s.]/g, ''),
    addressLine1: form.addressLine1.trim(),
    addressLine2: optional(form.addressLine2),
    ward: optional(form.ward),
    district: optional(form.district),
    province: form.province.trim(),
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
  await wait();
  // Địa chỉ mặc định luôn lên đầu, còn lại: mới thêm trước
  return [...readMine()].sort(
    (a, b) => Number(b.defaultAddress) - Number(a.defaultAddress) || b.createdAt.localeCompare(a.createdAt),
  );
}

export async function createAddress(form) {
  await wait();
  const now = new Date().toISOString();
  const current = readMine();
  const created = { ...toAddressRequest(form), id: newId(), createdAt: now, updatedAt: now };
  if (current.length === 0) created.defaultAddress = true;
  const others = created.defaultAddress ? current.map((item) => ({ ...item, defaultAddress: false })) : current;
  writeMine([created, ...others]);
  return created;
}

export async function updateAddress(addressId, form) {
  await wait();
  const current = readMine();
  const target = current.find((item) => item.id === addressId);
  if (!target) throw Object.assign(new Error('Not found'), { status: 404, code: 'ADDRESS_NOT_FOUND' });
  const updated = { ...target, ...toAddressRequest(form), updatedAt: new Date().toISOString() };
  writeMine(
    current.map((item) =>
      item.id === addressId ? updated : updated.defaultAddress ? { ...item, defaultAddress: false } : item,
    ),
  );
  return updated;
}

// Xoá 1 hoặc nhiều địa chỉ. Xoá mất địa chỉ mặc định -> địa chỉ còn lại đầu tiên thành mặc định.
export async function deleteAddresses(addressIds) {
  await wait();
  const ids = new Set(addressIds);
  writeMine(readMine().filter((item) => !ids.has(item.id)));
}

export const deleteAddress = (addressId) => deleteAddresses([addressId]);

// Đặt mặc định = cập nhật lại địa chỉ đó với defaultAddress: true
export function setDefaultAddress(address) {
  return updateAddress(address.id, { ...address, defaultAddress: true });
}
