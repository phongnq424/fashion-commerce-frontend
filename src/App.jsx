import { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Notice from './components/common/Notice';
import FloatingActions from './components/FloatingActions/FloatingActions';
import DemoBar from './components/DemoBar/DemoBar';
import AuthModal from './components/AuthModal/AuthModal';
import HomeScreen from './screens/home/HomeScreen';
import CatalogScreen from './screens/catalog/CatalogScreen';
import ContactScreen from './screens/contact/ContactScreen';
import ProductDetailScreen from './screens/product/ProductDetailScreen';
import CollectionScreen from './screens/collection/CollectionScreen';
import ShopScreen from './screens/shop/ShopScreen';
import NotFoundScreen from './screens/notFound/NotFoundScreen';
import CartScreen from './screens/cart/CartScreen';
import CheckoutScreen from './screens/checkout/CheckoutScreen';
import SearchScreen from './screens/search/SearchScreen';
import PolicyScreen from './screens/policies/PolicyScreen';
import ProfileScreen from './screens/account/profile/ProfileScreen';
import AddressBookScreen from './screens/account/addresses/AddressBookScreen';
import OrderListScreen from './screens/account/orders/OrderListScreen';
import OrderDetailScreen from './screens/account/orders/OrderDetailScreen';
import ReturnListScreen from './screens/account/returns/ReturnListScreen';
import ReturnRequestScreen from './screens/account/returns/ReturnRequestScreen';
import ReturnDetailScreen from './screens/account/returns/ReturnDetailScreen';
import WishlistScreen from './screens/account/wishlist/WishlistScreen';
import NotificationsScreen from './screens/account/notifications/NotificationsScreen';
import SecurityScreen from './screens/account/security/SecurityScreen';
// KÊNH NGƯỜI BÁN (/seller) — chủ shop / nhân viên shop, dùng chung tài khoản với web mua sắm
import SellerLayout from './screens/seller/components/SellerLayout';
import SellerDashboardScreen from './screens/seller/dashboard/SellerDashboardScreen';
import OnboardingScreen from './screens/seller/onboarding/OnboardingScreen';
import OnboardingStatusScreen from './screens/seller/onboarding/OnboardingStatusScreen';
import ShopListScreen from './screens/seller/shops/ShopListScreen';
import InvitationsScreen from './screens/seller/invitations/InvitationsScreen';
import SellerProductListScreen from './screens/seller/products/ProductListScreen';
import SellerProductEditorScreen from './screens/seller/products/ProductEditorScreen';
import SellerInventoryScreen from './screens/seller/inventory/InventoryScreen';
import SellerOrderListScreen from './screens/seller/orders/SellerOrderListScreen';
import SellerOrderDetailScreen from './screens/seller/orders/SellerOrderDetailScreen';
import SellerCodScreen from './screens/seller/cod/CodScreen';
import SellerReturnListScreen from './screens/seller/returns/SellerReturnListScreen';
import SellerReturnDetailScreen from './screens/seller/returns/SellerReturnDetailScreen';
import SellerReviewsScreen from './screens/seller/reviews/SellerReviewsScreen';
import VoucherScreen from './screens/seller/vouchers/VoucherScreen';
import FinanceScreen from './screens/seller/finance/FinanceScreen';
import ReportsScreen from './screens/seller/reports/ReportsScreen';
import SellerShopProfileScreen from './screens/seller/shop/ShopProfileScreen';
import SellerShopSettingsScreen from './screens/seller/shop/ShopSettingsScreen';
import SellerStaffScreen from './screens/seller/shop/StaffScreen';
import OwnershipScreen from './screens/seller/shop/OwnershipScreen';
import { useLanguage } from './hooks/useLanguage';
import { useCart } from './hooks/useCart';

// Mỗi lần đổi trang thì cuộn lên đầu.
// Link có # (vd "/#lookbook") -> cuộn tới phần có id tương ứng.
function ScrollToTop() {
  const { pathname, hash, state } = useLocation();
  const keepScroll = Boolean(state?.catalogNav);
  useEffect(() => {
    // Đổi danh mục ngay trong trang Danh mục sản phẩm -> trang đó tự cuộn về tiêu đề, không nhảy lên đầu
    if (keepScroll) return;
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash, keepScroll]);
  return null;
}

// Lỗi giỏ hàng từ Backend (ApiError.code) -> câu thông báo dễ hiểu
const CART_ERROR_KEYS = {
  CART_STOCK_INSUFFICIENT: 'cart.errors.stock',
  CART_QUANTITY_LIMIT: 'cart.errors.quantityLimit',
  CART_ITEM_LIMIT: 'cart.errors.itemLimit',
  CART_VARIANT_UNAVAILABLE: 'cart.errors.unavailable',
  NETWORK_ERROR: 'cart.errors.network',
};

// App giữ thông báo dùng chung. Giỏ hàng nằm trong CartContext (contexts/CartProvider.jsx).
// Link cũ có danh mục con (vd /category/tops/tshirts) -> về danh mục gốc /category/tops
function LegacySubcategoryRedirect() {
  const { categoryId } = useParams();
  return <Navigate to={`/category/${categoryId}`} replace />;
}

function App() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { addItem, selectedItems } = useCart();
  const [notice, setNotice] = useState(null); // { id, type, message } | null
  // Trang thanh toán có bố cục riêng (logo + 2 cột), không hiện Header / Footer của site
  const { pathname } = useLocation();
  const isCheckout = pathname.startsWith('/checkout');
  // Kênh người bán (/seller) có bố cục riêng (thanh trên + menu trái).
  // Quản trị sàn KHÔNG nằm trong app này: app riêng ở thư mục admin/ (cổng 5174).
  const isBackOffice = /^\/seller(\/|$)/.test(pathname);
  const hideSiteChrome = isCheckout || isBackOffice;

  // useCallback giữ hàm ổn định giữa các lần render (Notice dùng nó trong useEffect)
  const closeNotice = useCallback(() => setNotice(null), []);

  // Hiện 1 thông báo nhỏ ở góc màn hình. type: 'success' | 'info' | 'warning' | 'error'
  const notify = useCallback((type, message) => setNotice({ id: Date.now(), type, message }), []);

  // Lỗi Backend -> báo bằng chữ
  const notifyCartError = useCallback(
    (error) => {
      console.error(error);
      notify('error', t(CART_ERROR_KEYS[error?.code] ?? 'cart.errors.generic'));
    },
    [notify, t],
  );

  // options (tuỳ chọn, từ trang chi tiết): { size, color, colorId, variant, image, quantity, gift, buyNow }
  //   buyNow = true: bấm "Mua ngay" -> thêm vào giỏ rồi chuyển thẳng sang trang thanh toán
  const handleAddToCart = useCallback(
    async (product, options = {}) => {
      const quantity = options.quantity ?? 1;
      let result;
      try {
        result = await addItem(product, options);
        // Thẻ sản phẩm có nhiều size/màu -> mở trang chi tiết để khách chọn
        if (result.status === 'needsOptions') {
          notify('info', t('cart.chooseOptions', { name: product.name }));
          navigate(`/product/${product.id}`);
          return;
        }
      } catch (error) {
        notifyCartError(error);
        return;
      }
      // "Mua ngay": thêm vào giỏ rồi sang thẳng trang thanh toán, CHỈ thanh toán đúng món vừa bấm
      if (options.buyNow) {
        navigate('/checkout', { state: { buyNowKey: result.key } });
        return;
      }
      const params = { quantity, name: product.name, size: options.size, color: options.color };
      let message = t('product.added', { name: product.name });
      if (options.size && options.color) message = t('productDetail.addedWithColor', params);
      else if (options.size) message = t('productDetail.added', params);
      setNotice({ id: Date.now(), type: 'success', message });
    },
    [addItem, navigate, notify, notifyCartError, t],
  );

  // Nút "Thanh toán" (popup giỏ hàng + trang giỏ hàng) -> trang thanh toán /checkout
  // với các sản phẩm ĐANG ĐƯỢC TICK trong giỏ. Backend bắt buộc đăng nhập để đặt hàng:
  // khách chưa đăng nhập sẽ thấy khối mời đăng nhập ở trang thanh toán (giỏ tạm được chuyển lên sau khi đăng nhập).
  const handleCheckout = useCallback(() => {
    if (selectedItems.length === 0) {
      notify('warning', t('cart.checkoutEmpty'));
      navigate('/cart');
      return;
    }
    navigate('/checkout');
  }, [selectedItems, notify, navigate, t]);

  // Ô tìm kiếm trên Header -> trang kết quả /search?q=...
  const handleSearch = useCallback(
    (query) => {
      if (!query) {
        setNotice({ id: Date.now(), type: 'warning', message: t('search.emptyQuery') });
        return;
      }
      navigate(`/search?q=${encodeURIComponent(query)}`);
    },
    [navigate, t],
  );

  return (
    <>
      <ScrollToTop />
      <a href="#main-content" className="skip-link">
        {t('common.skipToContent')}
      </a>
      {!hideSiteChrome && (
        <Header onSearch={handleSearch} onNotify={notify} onCheckout={handleCheckout} onCartError={notifyCartError} />
      )}
      <main id="main-content" tabIndex={-1}>
        {/* BẢNG ĐỊNH TUYẾN: đường dẫn nào -> hiện màn hình nào */}
        <Routes>
          <Route path="/" element={<HomeScreen onAddToCart={handleAddToCart} />} />
          {/* Trang Danh mục sản phẩm: cùng 1 màn hình, cùng 1 banner cố định (screens/catalog) */}
          <Route path="/products" element={<CatalogScreen onAddToCart={handleAddToCart} />} />
          <Route path="/category/:categoryId" element={<CatalogScreen onAddToCart={handleAddToCart} />} />
          {/* Backend không có danh mục con -> link cũ /category/tops/tshirts chuyển về /category/tops */}
          <Route path="/category/:categoryId/*" element={<LegacySubcategoryRedirect />} />
          <Route
            path="/product/:productId"
            element={<ProductDetailScreen onAddToCart={handleAddToCart} onNotify={notify} />}
          />
          {/* Trang kết quả tìm kiếm (ô tìm kiếm trên Header) */}
          <Route path="/search" element={<SearchScreen onAddToCart={handleAddToCart} />} />
          <Route path="/collections/:collectionId" element={<CollectionScreen onAddToCart={handleAddToCart} />} />
          {/* Trang gian hàng của 1 shop trên sàn ("Xem shop") */}
          <Route path="/shop/:shopId" element={<ShopScreen onAddToCart={handleAddToCart} />} />
          <Route
            path="/cart"
            element={<CartScreen onCheckout={handleCheckout} onCartError={notifyCartError} onNotify={notify} />}
          />
          {/* Trang thanh toán: Giao hàng -> Phương thức thanh toán -> Đặt hàng thành công */}
          <Route path="/checkout" element={<CheckoutScreen onNotify={notify} />} />
          <Route path="/contact" element={<ContactScreen />} />
          {/* Chính sách: returns | shipping | payment | privacy | terms (data/policyContent.js) */}
          <Route path="/policies/:policyId" element={<PolicyScreen />} />
          {/* KHU VỰC TÀI KHOẢN NGƯỜI MUA (cần đăng nhập — AccountLayout tự hiện khối mời đăng nhập) */}
          <Route path="/account" element={<ProfileScreen />} />
          <Route path="/account/security" element={<SecurityScreen onNotify={notify} />} />
          <Route path="/account/orders" element={<OrderListScreen onNotify={notify} />} />
          <Route path="/account/orders/:orderId" element={<OrderDetailScreen onNotify={notify} />} />
          <Route path="/account/returns" element={<ReturnListScreen />} />
          <Route path="/account/returns/new" element={<ReturnRequestScreen onNotify={notify} />} />
          <Route path="/account/returns/:returnId" element={<ReturnDetailScreen onNotify={notify} />} />
          <Route path="/account/addresses" element={<AddressBookScreen onNotify={notify} />} />
          <Route path="/account/wishlist" element={<WishlistScreen onAddToCart={handleAddToCart} />} />
          <Route path="/account/notifications" element={<NotificationsScreen />} />
          {/* KÊNH NGƯỜI BÁN: SellerLayout tự mời đăng nhập; chưa có shop -> mời đăng ký bán hàng */}
          <Route path="/seller" element={<SellerLayout />}>
            <Route index element={<SellerDashboardScreen onNotify={notify} />} />
            <Route path="register" element={<OnboardingScreen onNotify={notify} />} />
            <Route path="register/status" element={<OnboardingStatusScreen onNotify={notify} />} />
            <Route path="shops" element={<ShopListScreen onNotify={notify} />} />
            <Route path="invitations" element={<InvitationsScreen onNotify={notify} />} />
            <Route path="products" element={<SellerProductListScreen onNotify={notify} />} />
            <Route path="products/new" element={<SellerProductEditorScreen onNotify={notify} />} />
            <Route path="products/:productId" element={<SellerProductEditorScreen onNotify={notify} />} />
            <Route path="inventory" element={<SellerInventoryScreen onNotify={notify} />} />
            <Route path="orders" element={<SellerOrderListScreen onNotify={notify} />} />
            <Route path="orders/:shopOrderId" element={<SellerOrderDetailScreen onNotify={notify} />} />
            <Route path="cod" element={<SellerCodScreen onNotify={notify} />} />
            <Route path="returns" element={<SellerReturnListScreen onNotify={notify} />} />
            <Route path="returns/:returnId" element={<SellerReturnDetailScreen onNotify={notify} />} />
            <Route path="reviews" element={<SellerReviewsScreen onNotify={notify} />} />
            <Route path="vouchers" element={<VoucherScreen onNotify={notify} />} />
            <Route path="finance" element={<FinanceScreen onNotify={notify} />} />
            <Route path="reports" element={<ReportsScreen onNotify={notify} />} />
            <Route path="profile" element={<SellerShopProfileScreen onNotify={notify} />} />
            <Route path="settings" element={<SellerShopSettingsScreen onNotify={notify} />} />
            <Route path="staff" element={<SellerStaffScreen onNotify={notify} />} />
            <Route path="ownership" element={<OwnershipScreen onNotify={notify} />} />
            <Route path="*" element={<NotFoundScreen />} />
          </Route>
          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
      </main>
      {!hideSiteChrome && <Footer />}
      {/* Popup đăng nhập / đăng ký: đặt 1 lần ở đây, mở bằng openAuth() từ bất kỳ đâu */}
      <AuthModal onNotify={notify} />
      {/* Nút nổi: ↑ lên đầu trang (góc trái, mọi trang) + chat với shop (góc phải, trang của khách) */}
      <FloatingActions showChat={!hideSiteChrome} />
      {/* Chỉ hiện khi đang chạy với BE giả (npm run mock): tài khoản demo + đặt lại dữ liệu */}
      <DemoBar app="web" />
      {/* key đổi mỗi lần -> thông báo mới luôn hiện lại từ đầu và đếm giờ lại */}
      {notice && <Notice key={notice.id} type={notice.type} message={notice.message} onClose={closeNotice} />}
    </>
  );
}

export default App;
