import HeroSection from './components/HeroSection';
import FlashSaleSection from './components/FlashSaleSection';
import CategorySection from './components/CategorySection';
import NewArrivalsSection from './components/NewArrivalsSection';
import SaleSection from './components/SaleSection';
import PromoSection from './components/PromoSection';
import RecommendationsSection from './components/RecommendationsSection';
import './HomeScreen.css';

// Trang chủ của SÀN: sản phẩm của nhiều shop, mỗi thẻ ghi tên shop bán.
// Màn hình chỉ "lắp ráp" các section trong ./components; đổi thứ tự khối = đổi thứ tự dòng bên dưới.
// Đã bỏ các khối kiểu web 1 thương hiệu mà Backend không có dữ liệu: Lookbook / bộ sưu tập, đăng ký nhận tin.
// Flash Sale giữ bố cục cũ, lấy sản phẩm đang giảm giá của mọi shop (thanh tiến độ theo tồn kho).
function HomeScreen({ onAddToCart }) {
  return (
    <>
      <HeroSection />
      {/* Flash Sale dính sát ngay dưới banner -> cấu hình: data/flashSale.js */}
      <FlashSaleSection />
      <CategorySection />
      {/* 1 hàng: sản phẩm mới đăng bán (GET /products?sort=NEWEST) */}
      <NewArrivalsSection onAddToCart={onAddToCart} />
      {/* 2 hàng: đang giảm giá */}
      <SaleSection onAddToCart={onAddToCart} />
      {/* banner khuyến mãi của sàn + dải lợi ích */}
      <PromoSection />
      {/* 1 hàng, trượt ‹ › */}
      <RecommendationsSection onAddToCart={onAddToCart} />
    </>
  );
}

export default HomeScreen;
