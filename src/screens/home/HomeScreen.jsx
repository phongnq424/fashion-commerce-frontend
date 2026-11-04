import HeroSection from './components/HeroSection';
import CategorySection from './components/CategorySection';
import NewArrivalsSection from './components/NewArrivalsSection';
import LookbookSection from './components/LookbookSection';
import BestSellersSection from './components/BestSellersSection';
import PromoSection from './components/PromoSection';
import RecommendationsSection from './components/RecommendationsSection';
import NewsletterSection from './components/NewsletterSection';
import './HomeScreen.css';

// Màn hình Home chỉ "lắp ráp" các section trong ./components. Mỗi section tự lo nội dung của nó.
// Muốn đổi thứ tự các khối trên trang chủ -> đổi thứ tự các dòng bên dưới.
function HomeScreen({ onAddToCart }) {
  return (
    <>
      <HeroSection />
      <CategorySection />
      {/* 1 hàng */}
      <NewArrivalsSection onAddToCart={onAddToCart} />

      <LookbookSection />
      {/* 2 hàng */}
      <BestSellersSection onAddToCart={onAddToCart} />
      {/* banner Giảm đến 50% + dải lợi ích */}
      <PromoSection />
      {/* 1 hàng, trượt ‹ › */}
      <RecommendationsSection onAddToCart={onAddToCart} />
      <NewsletterSection />
    </>
  );
}

export default HomeScreen;
