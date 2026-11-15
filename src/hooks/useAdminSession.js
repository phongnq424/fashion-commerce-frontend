import { useSyncExternalStore } from 'react';
import { readAdminSession, subscribeAdminSession } from '../services/admin/adminAuth';

// Phiên đăng nhập trang quản trị (tách riêng phiên của khách hàng). Trả về session | null.
let cache = { raw: undefined, value: null };
function snapshot() {
  const value = readAdminSession();
  const raw = JSON.stringify(value);
  if (raw !== cache.raw) cache = { raw, value };
  return cache.value;
}

export function useAdminSession() {
  return useSyncExternalStore(subscribeAdminSession, snapshot, () => null);
}
