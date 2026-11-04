import { createContext } from 'react';

// Hộp dữ liệu tài khoản. Logic nằm trong AuthProvider.jsx, cách lấy ra nằm trong hooks/useAuth.js
export const AuthContext = createContext(null);
