import { useCallback, useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Notice from './components/common/Notice';
import HomeScreen from './screens/home/HomeScreen';
import CategoryScreen from './screens/category/CategoryScreen';
import ContactScreen from './screens/contact/ContactScreen';
import ProductDetailScreen from './screens/product/ProductDetailScreen';
import CollectionScreen from './screens/collection/CollectionScreen';
import NotFoundScreen from './screens/notFound/NotFoundScreen';
import { useLanguage } from './hooks/useLanguage';

// Mỗi lần đổi trang thì cuộn lên đầu (trừ khi link có #, ví dụ #new-arrivals)
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

// App giữ các trạng thái nhiều nơi cùng cần: số lượng giỏ hàng và thông báo.
// (Khi dự án lớn hơn, giỏ hàng nên tách thành CartContext giống Theme/Language.)
function App() {
  const { t } = useLanguage();
  const [cartCount, setCartCount] = useState(0);
  const [notice, setNotice] = useState(null); // { id, type, message } | null

  // useCallback giữ hàm ổn định giữa các lần render (Notice dùng nó trong useEffect)
  const closeNotice = useCallback(() => setNotice(null), []);

  // options (tuỳ chọn, từ trang chi tiết): { size, quantity }
  const handleAddToCart = useCallback(
    (product, options = {}) => {
      const quantity = options.quantity ?? 1;
      setCartCount((count) => count + quantity);
      const message = options.size
        ? t('productDetail.added', { quantity, name: product.name, size: options.size })
        : t('product.added', { name: product.name });
      setNotice({ id: Date.now(), type: 'success', message });
    },
    [t],
  );

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
      <Header cartCount={cartCount} onSearch={handleSearch} />
      <main id="main-content" tabIndex={-1}>
        {/* BẢNG ĐỊNH TUYẾN: đường dẫn nào -> hiện màn hình nào */}
        <Routes>
          <Route path="/" element={<HomeScreen onAddToCart={handleAddToCart} />} />
          <Route path="/category/:categoryId" element={<CategoryScreen onAddToCart={handleAddToCart} />} />
          <Route
            path="/category/:categoryId/:subId"
            element={<CategoryScreen onAddToCart={handleAddToCart} />}
          />
          <Route path="/product/:productId" element={<ProductDetailScreen onAddToCart={handleAddToCart} />} />
          <Route path="/collections/:collectionId" element={<CollectionScreen onAddToCart={handleAddToCart} />} />
          <Route path="/contact" element={<ContactScreen />} />
          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
      </main>
      <Footer />
      {/* key đổi mỗi lần -> thông báo mới luôn hiện lại từ đầu và đếm giờ lại */}
      {notice && <Notice key={notice.id} type={notice.type} message={notice.message} onClose={closeNotice} />}
    </>
  );
}

export default App;
