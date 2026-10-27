import { useCallback, useState } from 'react';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Notice from './components/common/Notice';
import HomeScreen from './screens/home/HomeScreen';
import { useLanguage } from './hooks/useLanguage';

// App giữ các trạng thái nhiều nơi cùng cần: số lượng giỏ hàng và thông báo.
// (Khi dự án lớn hơn, giỏ hàng nên tách thành CartContext giống Theme/Language.)
function App() {
  const { t } = useLanguage();
  const [cartCount, setCartCount] = useState(0);
  const [notice, setNotice] = useState(null); // { id, type, message } | null

  // useCallback giữ hàm ổn định giữa các lần render (Notice dùng nó trong useEffect)
  const closeNotice = useCallback(() => setNotice(null), []);

  const handleAddToCart = useCallback(
    (product) => {
      setCartCount((count) => count + 1);
      setNotice({ id: Date.now(), type: 'success', message: t('product.added', { name: product.name }) });
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
      <a href="#main-content" className="skip-link">
        {t('common.skipToContent')}
      </a>
      <Header cartCount={cartCount} onSearch={handleSearch} />
      <main id="main-content" tabIndex={-1}>
        <HomeScreen onAddToCart={handleAddToCart} />
      </main>
      <Footer />
      {/* key đổi mỗi lần -> thông báo mới luôn hiện lại từ đầu và đếm giờ lại */}
      {notice && <Notice key={notice.id} type={notice.type} message={notice.message} onClose={closeNotice} />}
    </>
  );
}

export default App;
