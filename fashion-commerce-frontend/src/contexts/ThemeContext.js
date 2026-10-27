import { createContext } from 'react';

// Context chỉ chứa "cái hộp" dữ liệu. Logic nằm trong ThemeProvider.jsx,
// còn cách lấy dữ liệu ra nằm trong hooks/useTheme.js.
export const ThemeContext = createContext(null);
