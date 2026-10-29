// CSS toàn cục import ĐẦU TIÊN để CSS của component (nạp sau) được ưu tiên hơn khi trùng độ ưu tiên.
// Thứ tự: theme (định nghĩa biến) -> global (reset, dùng biến)
import './theme/index.css';
import './styles/global.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeProvider';
import { LanguageProvider } from './contexts/LanguageProvider';
import { AuthProvider } from './contexts/AuthProvider';
import App from './App';

// Bọc App trong các Provider để MỌI component bên trong dùng được useTheme / useLanguage / useAuth.
// BrowserRouter: bật điều hướng nhiều trang (đọc đường dẫn trên thanh địa chỉ).
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
