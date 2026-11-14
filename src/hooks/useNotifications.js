import { useContext } from 'react';
import { NotificationContext } from '../contexts/NotificationContext';

// Cách dùng:  const { unreadCount, refreshUnread } = useNotifications();
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications phải được dùng bên trong <NotificationProvider>');
  return context;
}
