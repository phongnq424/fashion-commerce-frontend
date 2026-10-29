import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Breadcrumb from '../../components/common/Breadcrumb';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import NotFoundScreen from '../notFound/NotFoundScreen';
import { useLanguage } from '../../hooks/useLanguage';
import { getBestSellers, getNewArrivals, getSaleProducts } from '../../services/productService';
import '../category/CategoryScreen.css'; // dùng lại kiểu tiêu đề của trang danh mục

// Trang "Xem tất cả" của các mục trên trang chủ: /collections/<id>
//   load:      hàm lấy dữ liệu trong productService
//   textKey:   nhóm chữ trong vi.js / en.js (dùng lại title, error, empty của trang chủ)
//   (nhãn trên ảnh chỉ dùng ở mục "Gợi ý cho bạn", nên các trang này không gắn nhãn)
const COLLECTIONS = {
  'new-arrivals': { load: () => getNewArrivals(50), textKey: 'home.newArrivals' },
  'best-sellers': { load: () => getBestSellers(50), textKey: 'home.bestSellers' },
  sale: { load: () => getSaleProducts(50), textKey: 'collection.sale' }, // nút của banner khuyến mãi
};

function CollectionScreen({ onAddToCart }) {
  const { t } = useLanguage();
  const { collectionId } = useParams();
  const collection = COLLECTIONS[collectionId];

  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');

  const loadProducts = useCallback(async () => {
    if (!collection) return;
    setStatus('loading');
    try {
      setProducts(await collection.load());
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }, [collection]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  if (!collection) return <NotFoundScreen />;

  const title = t(`${collection.textKey}.title`);

  return (
    <>
      <Breadcrumb items={[{ label: t('breadcrumb.home'), to: '/' }, { label: title }]} />

      <section className="category-page container" aria-labelledby="collection-title">
        <header className="category-page__header collection-page__header">
          <h1 id="collection-title" className="category-page__title">
            {title}
          </h1>
          {status === 'success' && (
            <p className="category-page__count">{t('category.count', { count: products.length })}</p>
          )}
        </header>

        <ProductGrid
          products={products}
          status={status}
          columns={5}
          skeletonCount={10}
          errorMessage={t(`${collection.textKey}.error`)}
          emptyMessage={t(`${collection.textKey}.empty`)}
          onRetry={loadProducts}
          onAddToCart={onAddToCart}
        />
      </section>
    </>
  );
}

export default CollectionScreen;
