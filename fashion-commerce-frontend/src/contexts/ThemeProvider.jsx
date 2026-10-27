import { useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './ThemeContext';
import { STORAGE_KEYS } from '../constants/storageKeys';

// Đọc theme mà script trong index.html đã gắn sẵn lên <html data-theme="...">
function getInitialTheme() {
  const current = document.documentElement.dataset.theme;
  return current === 'dark' ? 'dark' : 'light';
}

function readStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEYS.theme);
  } catch {
    return null; // trình duyệt chặn localStorage (chế độ ẩn danh...)
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  // Mỗi khi theme đổi: cập nhật thuộc tính trên <html> để CSS variables đổi theo
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Nếu người dùng CHƯA tự chọn theme, đi theo thay đổi của hệ điều hành
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event) => {
      if (!readStoredTheme()) setThemeState(event.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  // Người dùng chủ động chọn -> lưu lại để giữ sau khi tải lại trang
  const setTheme = useCallback((nextTheme) => {
    setThemeState(nextTheme);
    try {
      localStorage.setItem(STORAGE_KEYS.theme, nextTheme);
    } catch {
      /* bỏ qua nếu không lưu được */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // useMemo: chỉ tạo object mới khi theme đổi, tránh render lại thừa
  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
