import { useCallback, useEffect, useMemo, useState } from 'react';
import { NotificationContext } from './NotificationContext';
import { useAuth } from '../hooks/useAuth';
import { getUnreadCount } from '../services/notificationService';

const POLL_MS = 60_000; // hỏi lại số thông báo chưa đọc mỗi 60 giây

/**
 * Số thông báo chưa đọc (chuông trên Header + menu tài khoản).
 *   unreadCount, refreshUnread(), setUnreadCount(n)
 */
export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!user) return;
    try {
      setUnreadCount(await getUnreadCount());
    } catch (error) {
      console.error(error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return undefined;
    }
    refreshUnread();
    const timer = window.setInterval(refreshUnread, POLL_MS);
    return () => window.clearInterval(timer);
  }, [user, refreshUnread]);

  const value = useMemo(() => ({ unreadCount, refreshUnread, setUnreadCount }), [unreadCount, refreshUnread]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
