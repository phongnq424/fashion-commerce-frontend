import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import { MAIN_NAV } from '../../constants/navigation';
import './MainNav.css';

/**
 * Danh sách menu chính.
 * Backend chỉ có 3 danh mục gốc (Áo, Quần, Đầm & Váy), không có danh mục con,
 * nên mọi mục đều là link thẳng, không có dropdown.
 * - <NavLink> tự thêm class "is-active" (gạch chân) + aria-current="page" khi trùng trang hiện tại.
 * - onNavigate: gọi khi người dùng chọn 1 link (Header dùng để đóng menu ☰ trên mobile).
 */
function MainNav({ onNavigate }) {
  const { t } = useLanguage();

  return (
    <ul className="site-nav__list">
      {MAIN_NAV.map((item) => (
        <li key={item.key} className="site-nav__item">
          <NavLink
            to={item.to}
            end={item.to === '/'} // trang chủ chỉ active khi đúng "/"
            className={({ isActive }) => `site-nav__link ${isActive ? 'is-active' : ''}`}
            onClick={() => onNavigate?.()}
          >
            {t(item.key)}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

export default MainNav;
