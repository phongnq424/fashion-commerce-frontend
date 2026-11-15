import { useAdmin } from '../../../hooks/useAdmin';

/**
 * Bọc các trang dùng dữ liệu cửa hàng: chờ tải xong thông tin cửa hàng rồi mới hiện nội dung.
 * children: hàm (shopId) => nội dung, hoặc nội dung thường.
 */
function RequireShop({ children }) {
  const { shopId } = useAdmin();
  if (!shopId) return <div className="account-skeleton" />;
  return typeof children === 'function' ? children(shopId) : children;
}

export default RequireShop;
