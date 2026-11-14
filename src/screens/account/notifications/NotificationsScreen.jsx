import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../hooks/useLanguage';
import { useNotifications } from '../../../hooks/useNotifications';
import {
  getNotificationIcon,
  getNotificationLink,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../../services/notificationService';
import { formatDateTime, formatRelative } from '../../../utils/status';
import AccountLayout from '../components/AccountLayout';

const PAGE = 20;

/**
 * /account/notifications — Thông báo.
 * Tab "Tất cả / Chưa đọc" • nút "Đánh dấu đã đọc tất cả" • tải thêm.
 * Bấm 1 thông báo: đánh dấu đã đọc (PATCH) rồi mở trang liên quan (theo payload: returnId / orderId / productId).
 */
function NotificationsScreen() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { unreadCount, refreshUnread, setUnreadCount } = useNotifications();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(
    async (offset = 0) => {
      if (offset === 0) setStatus('loading');
      try {
        const page = await getNotifications({ unreadOnly, limit: PAGE, offset });
        setItems((current) => (offset === 0 ? page.items : [...current, ...page.items]));
        setHasMore(Boolean(page.hasMore));
        setStatus('success');
      } catch (error) {
        console.error(error);
        setStatus('error');
      }
    },
    [unreadOnly],
  );

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const open = async (notification) => {
    if (!notification.readAt) {
      setItems((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item)),
      );
      setUnreadCount(Math.max(0, unreadCount - 1));
      markNotificationRead(notification.id).catch(() => refreshUnread());
    }
    const link = getNotificationLink(notification);
    if (link) navigate(link);
  };

  const readAll = async () => {
    try {
      await markAllNotificationsRead();
      const now = new Date().toISOString();
      setItems((current) => (unreadOnly ? [] : current.map((item) => ({ ...item, readAt: item.readAt ?? now }))));
      setUnreadCount(0);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <AccountLayout
      title={t('notifications.title')}
      subtitle={t('notifications.unreadLabel', { count: unreadCount })}
      breadcrumb={[{ label: t('notifications.title') }]}
      actions={
        <Button variant="outline" size="sm" onClick={readAll} disabled={unreadCount === 0}>
          <Icon name="check" size={16} />
          {t('notifications.readAll')}
        </Button>
      }
    >
      <div className="account-tabs" role="tablist" aria-label={t('notifications.title')}>
        {[false, true].map((value) => (
          <button
            key={String(value)}
            type="button"
            role="tab"
            className="account-tabs__tab"
            aria-selected={unreadOnly === value}
            onClick={() => setUnreadOnly(value)}
          >
            {value ? t('notifications.unread') : t('notifications.all')}
            {value && unreadCount > 0 && <span className="account-tabs__count">({unreadCount})</span>}
          </button>
        ))}
      </div>

      {status === 'loading' && <div className="account-skeleton" />}
      {status === 'error' && (
        <div className="account-card">
          <EmptyState
            tone="error"
            icon="alert"
            title={t('account.loadError')}
            action={<Button variant="secondary" onClick={() => load()}>{t('common.retry')}</Button>}
          />
        </div>
      )}
      {status === 'success' && items.length === 0 && (
        <div className="account-card">
          <EmptyState
            icon="bell"
            title={unreadOnly ? t('notifications.emptyUnread') : t('notifications.empty')}
            text={t('notifications.emptyText')}
          />
        </div>
      )}

      {status === 'success' && items.length > 0 && (
        <ul className="noti-list account-card">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`noti ${item.readAt ? '' : 'noti--unread'}`}
                onClick={() => open(item)}
              >
                <span className="noti__icon" aria-hidden="true">
                  <Icon name={getNotificationIcon(item.type)} size={20} />
                </span>
                <span className="noti__body">
                  <span className="noti__title">
                    {!item.readAt && <span className="visually-hidden">{t('notifications.unread')}: </span>}
                    {item.title}
                  </span>
                  <span className="noti__text">{item.body}</span>
                  <time className="noti__time" dateTime={item.createdAt} title={formatDateTime(item.createdAt, language)}>
                    {formatRelative(item.createdAt, language)}
                  </time>
                </span>
                {!item.readAt && <span className="noti__dot" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {status === 'success' && hasMore && (
        <div className="account-more">
          <Button variant="outline" onClick={() => load(items.length)}>
            {t('common.loadMore')}
          </Button>
        </div>
      )}
    </AccountLayout>
  );
}

export default NotificationsScreen;
