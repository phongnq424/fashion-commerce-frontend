import { apiClient, refreshAuthSession } from './apiClient';
import {
  clearAuthSession,
  readAuthSession,
  saveAuthSession,
  storeSessionUser,
} from './authSession';

function normalizeUser(user) {
  return { ...user, name: user.displayName };
}

// Tên ngắn của trình duyệt / hệ điều hành, vd "Chrome · Windows" (chỉ để người dùng nhận ra phiên)
function deviceLabel() {
  if (typeof navigator === 'undefined') return 'Web';
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Trình duyệt';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return [browser, os].filter(Boolean).join(' · ').slice(0, 100);
}

function normalizeIdentifier(identifier) {
  const value = identifier.trim();
  return value.includes('@') ? value : value.replace(/[\s.]/g, '');
}

export async function requestRegistrationOtp(email) {
  return apiClient.post('/auth/register/otp', { email }, { auth: false });
}

export async function register({ email, phone, password, name, otp }) {
  const user = await apiClient.post(
    '/auth/register',
    { email, phone, password, displayName: name, otp },
    { auth: false },
  );
  return normalizeUser(user);
}

export async function login({ identifier, password, remember = true }) {
  const tokens = await apiClient.post(
    '/auth/login',
    { identifier: normalizeIdentifier(identifier), password },
    // X-Device-Label: tên thiết bị hiện trong "Phiên đăng nhập" (GET /users/me/sessions)
    { auth: false, headers: { 'X-Device-Label': deviceLabel() } },
  );
  saveAuthSession(tokens, remember);

  try {
    return await getCurrentUser();
  } catch (error) {
    clearAuthSession();
    throw error;
  }
}

export async function getCurrentUser() {
  const user = normalizeUser(await apiClient.get('/users/me'));
  storeSessionUser(user);
  return user;
}

export async function restoreSession() {
  if (!readAuthSession()) return null;
  try {
    return await getCurrentUser();
  } catch (error) {
    if (error.status === 401 || error.status === 403) clearAuthSession();
    throw error;
  }
}

export async function requestPasswordResetOtp(identifier) {
  return apiClient.post(
    '/auth/password-reset/otp',
    { identifier: normalizeIdentifier(identifier) },
    { auth: false },
  );
}

export async function resetPassword({ identifier, otp, newPassword }) {
  return apiClient.post(
    '/auth/password-reset',
    { identifier: normalizeIdentifier(identifier), otp, newPassword },
    { auth: false },
  );
}

export async function logout() {
  let session = readAuthSession();
  if (!session) return;

  try {
    if (session.accessExpiresAt <= Date.now()) {
      await refreshAuthSession();
      session = readAuthSession();
    }

    await apiClient.post(
      '/auth/logout',
      { refreshToken: session.refreshToken },
      { retryAuth: false },
    );
  } finally {
    clearAuthSession();
  }
}

// =====================================================================
// TÀI KHOẢN CỦA TÔI (Backend: CurrentUserController)
//   PATCH  /users/me                 { displayName?, email?, phone?, currentPassword? } -> AccountResponse
//          đổi email / số điện thoại BẮT BUỘC gửi currentPassword
//   POST   /users/me/password        { currentPassword, newPassword } -> 204, THU HỒI MỌI phiên (phải đăng nhập lại)
//   GET    /users/me/sessions        SliceResponse<SessionResponse>
//   DELETE /users/me/sessions/{id}   204
// =====================================================================
export async function updateProfile({ displayName, email, phone, currentPassword }) {
  const body = {};
  if (displayName !== undefined) body.displayName = displayName;
  if (email !== undefined) body.email = email;
  if (phone !== undefined) body.phone = phone.replace(/[\s.]/g, '');
  if (currentPassword) body.currentPassword = currentPassword;
  const user = normalizeUser(await apiClient.patch('/users/me', body));
  storeSessionUser(user);
  return user;
}

export async function changePassword({ currentPassword, newPassword }) {
  await apiClient.post('/users/me/password', { currentPassword, newPassword });
  // Backend đã thu hồi mọi phiên (kể cả phiên này) -> xoá token trên trình duyệt
  clearAuthSession();
}

export async function getSessions({ limit = 50, offset = 0 } = {}) {
  return apiClient.get(`/users/me/sessions?limit=${limit}&offset=${offset}`);
}

export async function revokeSession(sessionId) {
  return apiClient.delete(`/users/me/sessions/${encodeURIComponent(sessionId)}`);
}
