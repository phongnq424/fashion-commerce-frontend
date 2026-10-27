import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

// Cách dùng trong component:  const { theme, toggleTheme } = useTheme();
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme phải được dùng bên trong <ThemeProvider>');
  }
  return context;
}
