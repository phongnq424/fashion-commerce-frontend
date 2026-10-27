import { useContext } from 'react';
import { LanguageContext } from '../contexts/LanguageContext';

// Cách dùng:  const { t, language, setLanguage } = useLanguage();
//             <h2>{t('home.newArrivals.title')}</h2>
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage phải được dùng bên trong <LanguageProvider>');
  }
  return context;
}
