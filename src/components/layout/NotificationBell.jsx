import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useNotifications } from '../../hooks/useNotifications';
import './NotificationBell.css';

/**
 * Chuông 🔔 trên Header (chỉ hiện khi đã đăng nhập): số thông báo chưa đọc + link tới /account/notifications.
 * Số liệu: NotificationProvider (GET /notifications/unread-count, hỏi lại mỗi 60 giây).
 */
function NotificationBell() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  if (!user) return null;

  return (
    <Link
      to="/account/notifications"
      className="icon-btn noti-bell"
      aria-label={`${t('notifications.title')} — ${t('notifications.unreadLabel', { count: unreadCount })}`}
    >
      <Icon name="bell" />
      {unreadCount > 0 && (
        <span className="noti-bell__badge" aria-hidden="true">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}

export default NotificationBell;
