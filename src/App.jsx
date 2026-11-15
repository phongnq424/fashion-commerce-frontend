import { useCallback, useEffect, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Notice from './components/common/Notice';
import AuthModal from './components/AuthModal/AuthModal';
import HomeScreen from './screens/home/HomeScreen';
import CatalogScreen from './screens/catalog/CatalogScreen';
import ContactScreen from './screens/contact/ContactScreen';
import ProductDetailScreen from './screens/product/ProductDetailScreen';
import CollectionScreen from './screens/collection/CollectionScreen';
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
// TRANG QUẢN TRỊ (/admin) — chỉ nhân viên TrendyLab, đăng nhập riêng; web khách không có link tới đây
import AdminLoginScreen from './screens/admin/login/AdminLoginScreen';
import AdminLayout from './screens/admin/components/AdminLayout';
import AdminDashboardScreen from './screens/admin/dashboard/AdminDashboardScreen';
import ProductListScreen from './screens/admin/products/ProductListScreen';
import ProductEditorScreen from './screens/admin/products/ProductEditorScreen';
import InventoryScreen from './screens/admin/inventory/InventoryScreen';
import AdminOrderListScreen from './screens/admin/orders/AdminOrderListScreen';
import AdminOrderDetailScreen from './screens/admin/orders/AdminOrderDetailScreen';
import CodScreen from './screens/admin/cod/CodScreen';
import AdminReturnListScreen from './screens/admin/returns/AdminReturnListScreen';
import AdminReturnDetailScreen from './screens/admin/returns/AdminReturnDetailScreen';
import AdminReviewsScreen from './screens/admin/reviews/AdminReviewsScreen';
import ShopProfileScreen from './screens/admin/shop/ShopProfileScreen';
import ShopSettingsScreen from './screens/admin/shop/ShopSettingsScreen';
import StaffScreen from './screens/admin/shop/StaffScreen';
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
function App() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { addItem, selectedItems } = useCart();
  const [notice, setNotice] = useState(null); // { id, type, message } | null
  // Trang thanh toán có bố cục riêng (logo + 2 cột), không hiện Header / Footer của site
  const { pathname } = useLocation();
  const isCheckout = pathname.startsWith('/checkout');
  // Trang quản trị là khu vực riêng của nhân viên (thanh trên + menu trái), không phải web khách
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  const hideSiteChrome = isCheckout || isAdmin;

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
  // với các sản phẩm ĐANG ĐƯỢC TICK trong giỏ. Khách chưa đăng nhập vẫn thanh toán được
  // (trang thanh toán có sẵn dòng "Đã có tài khoản? Đăng nhập" để tự điền thông tin).
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
          <Route path="/category/:categoryId/:subId" element={<CatalogScreen onAddToCart={handleAddToCart} />} />
          <Route
            path="/product/:productId"
            element={<ProductDetailScreen onAddToCart={handleAddToCart} onNotify={notify} />}
          />
          {/* Trang kết quả tìm kiếm (ô tìm kiếm trên Header) */}
          <Route path="/search" element={<SearchScreen onAddToCart={handleAddToCart} />} />
          <Route path="/collections/:collectionId" element={<CollectionScreen onAddToCart={handleAddToCart} />} />
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
          <Route path="/account/orders" element={<OrderListScreen onNotify={notify} />} />
          <Route path="/account/orders/:orderId" element={<OrderDetailScreen onNotify={notify} />} />
          <Route path="/account/returns" element={<ReturnListScreen />} />
          <Route path="/account/returns/new" element={<ReturnRequestScreen onNotify={notify} />} />
          <Route path="/account/returns/:returnId" element={<ReturnDetailScreen onNotify={notify} />} />
          <Route path="/account/addresses" element={<AddressBookScreen onNotify={notify} />} />
          <Route path="/account/wishlist" element={<WishlistScreen onAddToCart={handleAddToCart} />} />
          <Route path="/account/notifications" element={<NotificationsScreen />} />
          {/* TRANG QUẢN TRỊ: /admin/login đăng nhập riêng; AdminLayout tự chuyển về đây nếu chưa đăng nhập */}
          <Route path="/admin/login" element={<AdminLoginScreen />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardScreen onNotify={notify} />} />
            <Route path="products" element={<ProductListScreen onNotify={notify} />} />
            <Route path="products/new" element={<ProductEditorScreen onNotify={notify} />} />
            <Route path="products/:productId" element={<ProductEditorScreen onNotify={notify} />} />
            <Route path="inventory" element={<InventoryScreen onNotify={notify} />} />
            <Route path="orders" element={<AdminOrderListScreen onNotify={notify} />} />
            <Route path="orders/:shopOrderId" element={<AdminOrderDetailScreen onNotify={notify} />} />
            <Route path="cod" element={<CodScreen onNotify={notify} />} />
            <Route path="returns" element={<AdminReturnListScreen onNotify={notify} />} />
            <Route path="returns/:returnId" element={<AdminReturnDetailScreen onNotify={notify} />} />
            <Route path="reviews" element={<AdminReviewsScreen onNotify={notify} />} />
            <Route path="profile" element={<ShopProfileScreen onNotify={notify} />} />
            <Route path="settings" element={<ShopSettingsScreen onNotify={notify} />} />
            <Route path="staff" element={<StaffScreen onNotify={notify} />} />
            <Route path="*" element={<NotFoundScreen />} />
          </Route>
          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
      </main>
      {!hideSiteChrome && <Footer />}
      {/* Popup đăng nhập / đăng ký: đặt 1 lần ở đây, mở bằng openAuth() từ bất kỳ đâu */}
      <AuthModal onNotify={notify} />
      {/* key đổi mỗi lần -> thông báo mới luôn hiện lại từ đầu và đếm giờ lại */}
      {notice && <Notice key={notice.id} type={notice.type} message={notice.message} onClose={closeNotice} />}
    </>
  );
}

export default App;
