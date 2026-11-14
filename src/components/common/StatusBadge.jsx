import './StatusBadge.css';

/**
 * Huy hiệu trạng thái: chữ + chấm màu (không chỉ dựa vào màu).
 * - tone: 'info' | 'success' | 'warning' | 'danger' | 'muted' (xem utils/status.js -> statusTone)
 * - children: chữ đã dịch
 */
function StatusBadge({ tone = 'muted', children, className = '' }) {
  return <span className={`status-badge status-badge--${tone} ${className}`}>{children}</span>;
}

export default StatusBadge;
