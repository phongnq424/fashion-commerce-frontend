import { Link } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import './Logo.css';

// Logo 2 tầng: "TRENDY" in hoa ở trên, "Lab" chữ ký viết tay chồng nhẹ bên dưới.
// Tên thương hiệu không dịch. Trình đọc màn hình đọc theo aria-label.
function Logo() {
  const { t } = useLanguage();
  return (
    <Link to="/" className="logo" aria-label={t('brand.homeLabel')}>
      <span className="logo__top" aria-hidden="true">
        Trendy
      </span>
      <span className="logo__script" aria-hidden="true">
        Lab
      </span>
    </Link>
  );
}

export default Logo;
