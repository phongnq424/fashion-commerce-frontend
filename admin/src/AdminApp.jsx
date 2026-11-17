import { useCallback, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Notice from '@shared/components/common/Notice';
import DemoBar from '@shared/components/DemoBar/DemoBar';
import AdminLoginScreen from './screens/login/AdminLoginScreen';
import AdminLayout from './screens/components/AdminLayout';
import AdminDashboardScreen from './screens/dashboard/AdminDashboardScreen';
import SellerReviewListScreen from './screens/sellers/SellerReviewListScreen';
import SellerReviewDetailScreen from './screens/sellers/SellerReviewDetailScreen';
import ShopModerationScreen from './screens/shops/ShopModerationScreen';
import ProductCaseScreen from './screens/products/ProductCaseScreen';
import AdminOrderListScreen from './screens/orders/AdminOrderListScreen';
import AdminOrderDetailScreen from './screens/orders/AdminOrderDetailScreen';
import AdminReviewsScreen from './screens/reviews/AdminReviewsScreen';
import PayoutScreen from './screens/payouts/PayoutScreen';
import UserListScreen from './screens/users/UserListScreen';
import RoleListScreen from './screens/roles/RoleListScreen';

/**
 * BẢNG ĐỊNH TUYẾN TRANG QUẢN TRỊ (gốc "/" của app 5174)
 *   /login                 đăng nhập (chỉ vai trò PLATFORM_*)
 *   /                      tổng quan: việc đang chờ xử lý
 *   /seller-reviews(/:id)  duyệt hồ sơ mở shop       — GET/POST /admin/seller-onboardings/...
 *   /shops                 tạm khoá / mở lại / đóng shop, phí sàn — /admin/shops, /admin/finance/shops/{id}/settings
 *   /product-cases         sản phẩm bị báo cáo        — /admin/product-moderation/...
 *   /orders(/:id)          tra cứu đơn để hỗ trợ khách — GET /admin/orders
 *   /reviews               ẩn / khôi phục đánh giá    — /admin/reviews
 *   /payouts               duyệt rút tiền của shop     — /admin/finance/payouts
 *   /users, /roles         tài khoản, vai trò & quyền — /admin/users, /admin/roles, /admin/permissions
 */
function AdminApp() {
  const [notice, setNotice] = useState(null);
  const notify = useCallback((type, message) => setNotice({ id: Date.now(), type, message }), []);
  const closeNotice = useCallback(() => setNotice(null), []);

  return (
    <>
      <Routes>
        <Route path="/login" element={<AdminLoginScreen />} />
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<AdminDashboardScreen />} />
          <Route path="seller-reviews" element={<SellerReviewListScreen />} />
          <Route path="seller-reviews/:onboardingId" element={<SellerReviewDetailScreen onNotify={notify} />} />
          <Route path="shops" element={<ShopModerationScreen onNotify={notify} />} />
          <Route path="product-cases" element={<ProductCaseScreen onNotify={notify} />} />
          <Route path="orders" element={<AdminOrderListScreen />} />
          <Route path="orders/:orderId" element={<AdminOrderDetailScreen />} />
          <Route path="reviews" element={<AdminReviewsScreen onNotify={notify} />} />
          <Route path="payouts" element={<PayoutScreen onNotify={notify} />} />
          <Route path="users" element={<UserListScreen onNotify={notify} />} />
          <Route path="roles" element={<RoleListScreen onNotify={notify} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      {notice && <Notice key={notice.id} type={notice.type} message={notice.message} onClose={closeNotice} />}
      <DemoBar app="admin" />
    </>
  );
}

export default AdminApp;
