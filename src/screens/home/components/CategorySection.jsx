import CategoryList from '../../../components/CategoryList/CategoryList';
import { useLanguage } from '../../../hooks/useLanguage';

function CategorySection() {
  const { t } = useLanguage();

  return (
    <section className="home-section container" aria-labelledby="categories-title">
      {/* Tiêu đề ẩn khỏi mắt nhưng trình đọc màn hình vẫn đọc được */}
      <h2 id="categories-title" className="visually-hidden">
        {t('home.categories.title')}
      </h2>
      <CategoryList />
    </section>
  );
}

export default CategorySection;
