import Icon from './Icon';
import './EmptyState.css';

/**
 * Khối "chưa có gì" / "lỗi" dùng chung: icon tròn + tiêu đề + mô tả + nút (tuỳ chọn).
 * - icon: tên icon trong Icon.jsx    - title, text: chữ đã dịch    - action: nút (ReactNode)
 * - tone: 'default' | 'error'
 */
function EmptyState({ icon = 'package', title, text, action, tone = 'default' }) {
  return (
    <div className={`empty-state empty-state--${tone}`} role={tone === 'error' ? 'alert' : undefined}>
      <span className="empty-state__icon" aria-hidden="true">
        <Icon name={icon} size={30} />
      </span>
      {title && <p className="empty-state__title">{title}</p>}
      {text && <p className="empty-state__text">{text}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}

export default EmptyState;
