import CategoryList from '../../../components/CategoryList/CategoryList';
import SectionHeading from '../../../components/common/SectionHeading';
import { useLanguage } from '../../../hooks/useLanguage';

function CategorySection() {
  const { t } = useLanguage();

  return (
    <section className="home-section container" aria-labelledby="categories-title">
      <SectionHeading
        id="categories-title"
        title={t('home.categories.title')}
        description={t('home.categories.description')}
      />
      <CategoryList />
    </section>
  );
}

export default CategorySection;
