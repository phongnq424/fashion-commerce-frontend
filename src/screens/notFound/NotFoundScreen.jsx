import Button from '../../components/common/Button';
import Icon from '../../components/common/Icon';
import { useLanguage } from '../../hooks/useLanguage';
import { Link } from 'react-router-dom';
import './NotFoundScreen.css';

// Hiện khi đường dẫn không tồn tại (gõ sai link, danh mục không có...)
function NotFoundScreen() {
  const { t } = useLanguage();

  return (
    <section className="not-found container" aria-labelledby="not-found-title">
      <Icon name="hanger" size={56} className="not-found__icon" />
      <h1 id="not-found-title" className="not-found__title">
        {t('notFound.title')}
      </h1>
      <p className="not-found__desc">{t('notFound.description')}</p>
      <Button as={Link} to="/">
        {t('notFound.backHome')}
      </Button>
    </section>
  );
}

export default NotFoundScreen;
