import HeroSection from './components/HeroSection';
import CategorySection from './components/CategorySection';
import NewArrivalsSection from './components/NewArrivalsSection';
import BenefitsSection from './components/BenefitsSection';
import NewsletterSection from './components/NewsletterSection';
import './HomeScreen.css';

// Màn hình Home chỉ "lắp ráp" các section trong ./components. Mỗi section tự lo nội dung của nó.
function HomeScreen({ onAddToCart }) {
  return (
    <>
      <HeroSection />
      <CategorySection />
      <NewArrivalsSection onAddToCart={onAddToCart} />
      <BenefitsSection />
      <NewsletterSection />
    </>
  );
}

export default HomeScreen;
