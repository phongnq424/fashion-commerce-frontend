import { useState } from 'react';
import Icon from '../../../components/common/Icon';
import './OrderThumb.css';

/**
 * Ảnh nhỏ vuông trong cột đơn hàng, có huy hiệu ở góc phải trên.
 * - badge: nội dung huy hiệu (số lượng, hoặc icon quà). Không truyền -> không có huy hiệu
 * - badgeLabel: chữ cho trình đọc màn hình (vd "Số lượng: 2")
 * - tone: 'gift' -> huy hiệu màu quà tặng
 * Ảnh lỗi / thiếu -> hiện icon thay thế.
 */
function OrderThumb({ src, badge, badgeLabel, tone, fallbackIcon = 'hanger' }) {
  const [failed, setFailed] = useState(false);

  return (
    <span className="order-thumb">
      <span className="order-thumb__frame">
        {src && !failed ? (
          <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
        ) : (
          <Icon name={fallbackIcon} size={26} />
        )}
      </span>
      {badge !== undefined && (
        <span className={`order-thumb__badge ${tone ? `order-thumb__badge--${tone}` : ''}`}>
          <span aria-hidden="true">{badge}</span>
          {badgeLabel && <span className="visually-hidden">{badgeLabel}</span>}
        </span>
      )}
    </span>
  );
}

export default OrderThumb;
