import { apiClient } from './apiClient';

// =====================================================================
// THÔNG BÁO — theo backend:
//   GET   /notifications?unreadOnly=&limit=&offset=  -> SliceResponse<NotificationResponse>
//   GET   /notifications/unread-count                -> { unreadCount }
//   PATCH /notifications/{id}/read                   -> NotificationResponse
//   POST  /notifications/read-all                    -> 204
// =====================================================================

export function getNotifications({ unreadOnly = false, limit = 20, offset = 0 } = {}) {
  return apiClient.get(`/notifications?unreadOnly=${unreadOnly}&limit=${limit}&offset=${offset}`);
}

export async function getUnreadCount() {
  const result = await apiClient.get('/notifications/unread-count');
  return result?.unreadCount ?? 0;
}

export function markNotificationRead(notificationId) {
  return apiClient.patch(`/notifications/${encodeURIComponent(notificationId)}/read`);
}

export function markAllNotificationsRead() {
  return apiClient.post('/notifications/read-all');
}

// Bấm vào thông báo -> mở trang liên quan (dựa trên payload backend gửi kèm)
export function getNotificationLink(notification) {
  const payload = notification?.payload ?? {};
  if (payload.returnId) return `/account/returns/${payload.returnId}`;
  if (payload.orderId) return `/account/orders/${payload.orderId}`;
  if (payload.productId) return `/product/${payload.productId}`;
  return null;
}

// Nhóm thông báo để chọn icon
export function getNotificationIcon(type = '') {
  if (type.startsWith('RETURN') || type.startsWith('COD_REFUND')) return 'refresh';
  if (type.startsWith('ORDER') || type.startsWith('SHIPMENT')) return 'truck';
  if (type.startsWith('REVIEW')) return 'star';
  if (type.startsWith('PRODUCT')) return 'shield';
  return 'info';
}
