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
import { useLanguage } from './hooks/useLanguage';
import { useCart } from './hooks/useCart';
import { useAuth } from './hooks/useAuth';

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
  const { user, openAuth } = useAuth();
  const { addItem, selectedItems } = useCart();
  const [notice, setNotice] = useState(null); // { id, type, message } | null

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
  //   buyNow = true: bấm "Mua ngay" -> thêm vào giỏ rồi chuyển sang trang giỏ hàng
  const handleAddToCart = useCallback(
    async (product, options = {}) => {
      const quantity = options.quantity ?? 1;
      try {
        const result = await addItem(product, options);
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
      if (options.buyNow) {
        navigate('/cart');
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

  // Nút "Thanh toán" (popup giỏ hàng + trang giỏ hàng).
  // Backend mới có POST /checkout/preview (cần địa chỉ giao hàng), chưa có API tạo đơn,
  // nên ở đây chỉ kiểm tra điều kiện rồi báo. Khi có trang thanh toán -> navigate('/checkout').
  const handleCheckout = useCallback(() => {
    if (selectedItems.length === 0) {
      notify('warning', t('cart.checkoutEmpty'));
      navigate('/cart');
      return;
    }
    if (!user) {
      notify('info', t('cart.loginToCheckout'));
      openAuth('login');
      return;
    }
    if (selectedItems.some((item) => item.origin === 'local')) {
      notify('warning', t('cart.demoItemsNotice'));
      return;
    }
    notify('info', t('cart.checkoutPending'));
  }, [selectedItems, user, openAuth, notify, navigate, t]);

  const handleSearch = useCallback(
    (query) => {
      if (!query) {
        setNotice({ id: Date.now(), type: 'warning', message: t('search.emptyQuery') });
        return;
      }
      setNotice({ id: Date.now(), type: 'info', message: t('search.pending', { query }) });
    },
    [t],
  );

  return (
    <>
      <ScrollToTop />
      <a href="#main-content" className="skip-link">
        {t('common.skipToContent')}
      </a>
      <Header onSearch={handleSearch} onNotify={notify} onCheckout={handleCheckout} onCartError={notifyCartError} />
      <main id="main-content" tabIndex={-1}>
        {/* BẢNG ĐỊNH TUYẾN: đường dẫn nào -> hiện màn hình nào */}
        <Routes>
          <Route path="/" element={<HomeScreen onAddToCart={handleAddToCart} />} />
          {/* Trang Danh mục sản phẩm: cùng 1 màn hình, cùng 1 banner cố định (screens/catalog) */}
          <Route path="/products" element={<CatalogScreen onAddToCart={handleAddToCart} />} />
          <Route path="/category/:categoryId" element={<CatalogScreen onAddToCart={handleAddToCart} />} />
          <Route path="/category/:categoryId/:subId" element={<CatalogScreen onAddToCart={handleAddToCart} />} />
          <Route path="/product/:productId" element={<ProductDetailScreen onAddToCart={handleAddToCart} />} />
          <Route path="/collections/:collectionId" element={<CollectionScreen onAddToCart={handleAddToCart} />} />
          <Route
            path="/cart"
            element={<CartScreen onCheckout={handleCheckout} onCartError={notifyCartError} onNotify={notify} />}
          />
          <Route path="/contact" element={<ContactScreen />} />
          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
      </main>
      <Footer />
      {/* Popup đăng nhập / đăng ký: đặt 1 lần ở đây, mở bằng openAuth() từ bất kỳ đâu */}
      <AuthModal onNotify={notify} />
      {/* key đổi mỗi lần -> thông báo mới luôn hiện lại từ đầu và đếm giờ lại */}
      {notice && <Notice key={notice.id} type={notice.type} message={notice.message} onClose={closeNotice} />}
    </>
  );
}

export default App;
