import { useLanguage } from '../../hooks/useLanguage';
import './Logo.css';

// Wordmark "sợi." dùng ở Header và Footer. Tên thương hiệu không dịch.
function Logo() {
  const { t } = useLanguage();
  return (
    <a href="/" className="logo" aria-label={t('brand.homeLabel')}>
      sợi<span className="logo__dot">.</span>
    </a>
  );
}

export default Logo;