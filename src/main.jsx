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
import { CartProvider } from './contexts/CartProvider';
import { WishlistProvider } from './contexts/WishlistProvider';
import { NotificationProvider } from './contexts/NotificationProvider';
import { ShopChatProvider } from './contexts/ShopChatProvider';
import App from './App';

// Bọc App trong các Provider để MỌI component bên trong dùng được useTheme / useLanguage / useAuth.
// BrowserRouter: bật điều hướng nhiều trang (đọc đường dẫn trên thanh địa chỉ).
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            {/* Giỏ hàng cần biết đã đăng nhập chưa -> nằm TRONG AuthProvider */}
            <CartProvider>
              {/* Yêu thích + số thông báo chưa đọc cũng cần biết đã đăng nhập chưa */}
              <WishlistProvider>
                <NotificationProvider>
                  {/* Chat với shop: nút chat góc phải + khung chat dùng chung các trang của khách */}
                  <ShopChatProvider>
                    <App />
                  </ShopChatProvider>
                </NotificationProvider>
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
