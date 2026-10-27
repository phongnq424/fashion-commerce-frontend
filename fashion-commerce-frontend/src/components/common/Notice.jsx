import { useEffect } from 'react';
import Icon from './Icon';
import { useLanguage } from '../../hooks/useLanguage';
import './Notice.css';

const ICONS = { success: 'check', info: 'info', warning: 'alert', error: 'alert' };

/**
 * Thông báo nổi (toast) ở góc màn hình.
 * - type: 'success' | 'info' | 'warning' | 'error'
 * - Có icon + tiêu đề chữ ("Thành công", "Lỗi"...) để không chỉ dựa vào màu.
 * - Tự đóng sau `duration` ms (truyền 0 để không tự đóng).
 */
function Notice({ type = 'info', message, onClose, duration = 4000 }) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!duration) return undefined;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer); // dọn timer khi thông báo đổi/biến mất
  }, [message, duration, onClose]);

  return (
    <div
      className={`notice notice--${type}`}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <Icon name={ICONS[type]} className="notice__icon" />
      <div className="notice__body">
        <p className="notice__title">{t(`notice.${type}`)}</p>
        <p className="notice__message">{message}</p>
      </div>
      <button type="button" className="notice__close" onClick={onClose} aria-label={t('common.close')}>
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}

export default Notice;
