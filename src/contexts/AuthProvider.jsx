import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './AuthContext';
import * as authService from '../services/authService';
import { AUTH_SESSION_CHANGED_EVENT, readAuthSession } from '../services/authSession';

/**
 * Quản lý tài khoản cho toàn site:
 *   user                 null = chưa đăng nhập | { name, email, provider }
 *   authView             popup đang mở màn nào: null (đóng) | 'login' | 'register' | 'forgot'
 *   openAuth(view)       mở popup (mặc định màn đăng nhập)
 *   closeAuth()          đóng popup
 *   login / register (gửi OTP) / verifyRegistration (nhập OTP) / resendOtp / logout
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readAuthSession()?.user ?? null);
  const [isAuthLoading, setIsAuthLoading] = useState(() => Boolean(readAuthSession()));
  const [authView, setAuthView] = useState(null);

  useEffect(() => {
    let active = true;

    authService
      .restoreSession()
      .then((restoredUser) => {
        if (active) setUser(restoredUser);
      })
      .catch((error) => {
        if (active && error.code !== 'NETWORK_ERROR') setUser(null);
      })
      .finally(() => {
        if (active) setIsAuthLoading(false);
      });

    const handleSessionChange = () => {
      if (!readAuthSession()) setUser(null);
    };
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChange);

    return () => {
      active = false;
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChange);
    };
  }, []);

  const openAuth = useCallback((view = 'login') => setAuthView(view), []);
  const closeAuth = useCallback(() => setAuthView(null), []);

  // remember = false -> phiên chỉ tồn tại trong tab hiện tại; đóng tab là đăng xuất.
  // identifier: email hoặc số điện thoại
  const login = useCallback(async ({ identifier, password, remember }) => {
    const loggedIn = await authService.login({ identifier, password, remember });
    setUser(loggedIn);
    return loggedIn;
  }, []);

  // Bước 1 chỉ gửi email để backend phát OTP; thông tin đăng ký vẫn giữ trong state của modal.
  const register = useCallback(async (data) => {
    const challenge = await authService.requestRegistrationOtp(data.email);
    return { ...challenge, registration: data, otpSentTo: data.email };
  }, []);

  // Bước 2 gửi toàn bộ RegisterRequest kèm OTP, sau đó đăng nhập để lấy token.
  const verifyRegistration = useCallback(async ({ registration, code }) => {
    await authService.register({ ...registration, otp: code });
    const loggedIn = await authService.login({
      identifier: registration.email,
      password: registration.password,
      remember: true,
    });
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const resendOtp = useCallback((email) => authService.requestRegistrationOtp(email), []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthLoading,
      authView,
      openAuth,
      closeAuth,
      login,
      register,
      verifyRegistration,
      resendOtp,
      logout,
    }),
    [user, isAuthLoading, authView, openAuth, closeAuth, login, register, verifyRegistration, resendOtp, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
