import { useCallback, useMemo, useState } from 'react';
import { AuthContext } from './AuthContext';
import { STORAGE_KEYS } from '../constants/storageKeys';
import * as authService from '../services/authService';

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.user));
  } catch {
    return null;
  }
}

function storeUser(user) {
  try {
    if (user) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEYS.user);
  } catch {
    /* bỏ qua nếu trình duyệt chặn localStorage */
  }
}

/**
 * Quản lý tài khoản cho toàn site:
 *   user                 null = chưa đăng nhập | { name, email, provider }
 *   authView             popup đang mở màn nào: null (đóng) | 'login' | 'register' | 'forgot'
 *   openAuth(view)       mở popup (mặc định màn đăng nhập)
 *   closeAuth()          đóng popup
 *   login / register (gửi OTP) / verifyRegistration (nhập OTP) / resendOtp / loginWithGoogle / logout
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [authView, setAuthView] = useState(null);

  const openAuth = useCallback((view = 'login') => setAuthView(view), []);
  const closeAuth = useCallback(() => setAuthView(null), []);

  // remember = false -> chỉ đăng nhập trong lần mở trang này, tải lại trang là thoát
  // identifier: email hoặc số điện thoại
  const login = useCallback(async ({ identifier, password, remember }) => {
    const loggedIn = await authService.login({ identifier, password });
    setUser(loggedIn);
    storeUser(remember ? loggedIn : null);
    return loggedIn;
  }, []);

  // Đăng ký bước 1: gửi thông tin -> Backend gửi OTP. CHƯA đăng nhập ở bước này.
  // Trả về { pendingId, otpSentTo, expiresIn, resendAfter } để hiện màn nhập mã.
  const register = useCallback((data) => authService.register(data), []);

  // Đăng ký bước 2: nhập đúng mã OTP -> tài khoản được tạo -> đăng nhập luôn
  const verifyRegistration = useCallback(async ({ pendingId, code }) => {
    const created = await authService.verifyOtp({ pendingId, code });
    setUser(created);
    storeUser(created);
    return created;
  }, []);

  const resendOtp = useCallback((pendingId) => authService.resendOtp({ pendingId }), []);

  const loginWithGoogle = useCallback(async () => {
    const googleUser = await authService.signInWithGoogle();
    setUser(googleUser);
    storeUser(googleUser);
    return googleUser;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    storeUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      authView,
      openAuth,
      closeAuth,
      login,
      register,
      verifyRegistration,
      resendOtp,
      loginWithGoogle,
      logout,
    }),
    [user, authView, openAuth, closeAuth, login, register, verifyRegistration, resendOtp, loginWithGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
