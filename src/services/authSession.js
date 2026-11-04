import { STORAGE_KEYS } from '../constants/storageKeys';

export const AUTH_SESSION_CHANGED_EVENT = 'fc:auth-session-changed';
let memorySession = null;

function getStorage(remember) {
  if (typeof window === 'undefined') return null;
  return remember ? window.localStorage : window.sessionStorage;
}

function readFrom(storage, remember) {
  try {
    const value = JSON.parse(storage?.getItem(STORAGE_KEYS.authSession));
    return value?.accessToken && value?.refreshToken ? { ...value, remember } : null;
  } catch {
    return null;
  }
}

function notifySessionChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
}

export function readAuthSession() {
  if (typeof window === 'undefined') return memorySession;
  return readFrom(window.sessionStorage, false) ?? readFrom(window.localStorage, true) ?? memorySession;
}

export function saveAuthSession(tokens, remember, user = null) {
  const storage = getStorage(remember);
  const otherStorage = getStorage(!remember);
  const session = {
    tokenType: tokens.tokenType ?? 'Bearer',
    accessToken: tokens.accessToken,
    accessExpiresAt: Date.now() + Number(tokens.expiresIn ?? 0) * 1000,
    refreshToken: tokens.refreshToken,
    refreshExpiresAt: tokens.refreshExpiresAt,
    user,
  };
  memorySession = { ...session, remember };

  try {
    otherStorage?.removeItem(STORAGE_KEYS.authSession);
    storage?.setItem(STORAGE_KEYS.authSession, JSON.stringify(session));
  } catch {
    // Nếu storage bị chặn, phiên vẫn hoạt động cho tới khi trang tải lại.
  }

  notifySessionChanged();
  return { ...session, remember };
}

export function replaceAuthTokens(tokens) {
  const current = readAuthSession();
  if (!current) return null;
  return saveAuthSession(tokens, current.remember, current.user);
}

export function storeSessionUser(user) {
  const current = readAuthSession();
  if (!current) return;
  memorySession = { ...current, user };

  const storage = getStorage(current.remember);
  try {
    storage?.setItem(STORAGE_KEYS.authSession, JSON.stringify({
      tokenType: current.tokenType,
      accessToken: current.accessToken,
      accessExpiresAt: current.accessExpiresAt,
      refreshToken: current.refreshToken,
      refreshExpiresAt: current.refreshExpiresAt,
      user,
    }));
  } catch {
    // Không làm hỏng đăng nhập chỉ vì trình duyệt chặn storage.
  }

  notifySessionChanged();
}

export function clearAuthSession() {
  memorySession = null;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(STORAGE_KEYS.authSession);
      window.sessionStorage.removeItem(STORAGE_KEYS.authSession);
      window.localStorage.removeItem(STORAGE_KEYS.user);
      window.localStorage.removeItem(STORAGE_KEYS.mockUsers);
    } catch {
      // Storage có thể bị chặn trong chế độ riêng tư.
    }
  }
  notifySessionChanged();
}
