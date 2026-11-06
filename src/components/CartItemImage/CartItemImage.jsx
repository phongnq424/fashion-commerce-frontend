import { useState } from 'react';
import Icon from '../common/Icon';
import './CartItemImage.css';

// Ảnh nhỏ của 1 dòng giỏ hàng. Không có ảnh / ảnh lỗi -> hiện icon móc áo.
function CartItemImage({ src }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span className="cart-item-image cart-item-image--empty" aria-hidden="true">
        <Icon name="hanger" size={22} />
      </span>
    );
  }

  return <img src={src} alt="" className="cart-item-image" loading="lazy" onError={() => setFailed(true)} />;
}

export default CartItemImage;
