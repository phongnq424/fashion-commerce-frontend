import { useCallback, useEffect, useMemo, useState } from 'react';
import { LanguageContext } from './LanguageContext';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { dictionaries, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../i18n';

function getInitialLanguage() {
  // Script trong index.html đã đặt <html lang> theo lựa chọn đã lưu (nếu có)
  const current = document.documentElement.lang;
  return SUPPORTED_LANGUAGES.includes(current) ? current : DEFAULT_LANGUAGE;
}

// Lấy giá trị lồng nhau theo đường dẫn "header.cart" -> dict.header.cart
function getByPath(object, path) {
  return path.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), object);
}

// Thay {name} trong câu bằng giá trị thật: t('x', { name: 'Áo' })
function interpolate(text, params) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match));
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  const setLanguage = useCallback((nextLanguage) => {
    if (!SUPPORTED_LANGUAGES.includes(nextLanguage)) return;
    setLanguageState(nextLanguage);
    try {
      localStorage.setItem(STORAGE_KEYS.language, nextLanguage);
    } catch {
      /* bỏ qua nếu không lưu được */
    }
  }, []);

  // Hàm dịch: tìm ở ngôn ngữ hiện tại -> nếu thiếu thì lấy tiếng Việt -> cuối cùng trả về key
  const t = useCallback(
    (key, params) => {
      const text =
        getByPath(dictionaries[language], key) ?? getByPath(dictionaries[DEFAULT_LANGUAGE], key);
      if (typeof text !== 'string') {
        if (import.meta.env.DEV) console.warn(`[i18n] Thiếu bản dịch cho key: "${key}"`);
        return key;
      }
      return interpolate(text, params);
    },
    [language],
  );

  // Cập nhật <html lang> (giúp trình đọc màn hình đọc đúng giọng) và tiêu đề tab
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t('meta.title');
  }, [language, t]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
