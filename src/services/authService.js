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
    { auth: false },
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
