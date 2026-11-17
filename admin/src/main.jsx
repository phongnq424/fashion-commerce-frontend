// =====================================================================
// TRANG QUẢN TRỊ SÀN — ứng dụng RIÊNG, chạy ở http://localhost:5174 (npm run dev:admin)
// Dùng chung Backend + database với web mua sắm (cùng gọi /api/v1 qua proxy tới cổng 8080),
// nhưng là bản build riêng: code quản trị KHÔNG nằm trong file JS của web khách.
// Dùng lại component / service chung của web qua alias @shared (= thư mục src/ của web).
// =====================================================================
import '@shared/theme/index.css';
import '@shared/styles/global.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@shared/contexts/ThemeProvider';
import { LanguageProvider } from '@shared/contexts/LanguageProvider';
import { AuthProvider } from '@shared/contexts/AuthProvider';
import AdminApp from './AdminApp';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <AdminApp />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
