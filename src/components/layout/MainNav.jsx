import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Icon from '../common/Icon';
import { useLanguage } from '../../hooks/useLanguage';
import { MAIN_NAV } from '../../constants/navigation';
import './MainNav.css';

/**
 * Danh sách menu chính, hỗ trợ menu con (dropdown).
 * - Mục thường: <NavLink>. React Router tự biết link nào trùng trang hiện tại
 *   -> thêm class "is-active" (gạch chân) + aria-current="page" cho trình đọc màn hình.
 * - Mục có children: nút "ÁO ⌄". Nút cũng được gạch chân khi đang ở trang thuộc danh mục đó.
 * - Esc hoặc bấm ra ngoài để đóng danh sách con.
 * - onNavigate: gọi khi người dùng chọn 1 link (Header dùng để đóng menu ☰ trên mobile).
 */
function MainNav({ onNavigate }) {
  const { t } = useLanguage();
  const { pathname } = useLocation(); // đường dẫn hiện tại, ví dụ "/category/tops/shirts"
  const [openKey, setOpenKey] = useState(null);
  const listRef = useRef(null);
  const toggleRefs = useRef({});

  // Đổi trang -> đóng danh sách con đang mở
  useEffect(() => {
    setOpenKey(null);
  }, [pathname]);

  // Khi đang mở: bấm ra ngoài menu hoặc nhấn Esc thì đóng
  useEffect(() => {
    if (!openKey) return undefined;

    const handlePointerDown = (event) => {
      if (!listRef.current?.contains(event.target)) setOpenKey(null);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        toggleRefs.current[openKey]?.focus();
        setOpenKey(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openKey]);

  const handleLinkClick = () => {
    setOpenKey(null);
    onNavigate?.();
  };

  // NavLink truyền { isActive } vào hàm className -> trả về class phù hợp
  const linkClass = (base) => ({ isActive }) => `${base} ${isActive ? 'is-active' : ''}`;

  // Rê chuột chỉ có tác dụng trên máy tính có chuột (tránh điện thoại mở nhầm khi chạm)
  const canHover = () => window.matchMedia('(hover: hover) and (min-width: 1025px)').matches;

  return (
    <ul className="site-nav__list" ref={listRef}>
      {MAIN_NAV.map((item) => {
        // ----- Mục không có menu con -----
        if (!item.children) {
          return (
            <li key={item.key} className="site-nav__item">
              <NavLink
                to={item.to}
                end={item.to === '/'} // "end": trang chủ chỉ active khi đúng "/" (không phải mọi trang)
                className={linkClass('site-nav__link')}
                onClick={handleLinkClick}
              >
                {t(item.key)}
              </NavLink>
            </li>
          );
        }

        // ----- Mục có menu con -----
        const isOpen = openKey === item.key;
        const isCurrentSection = pathname.startsWith(item.to); // đang ở trang thuộc danh mục này
        const submenuId = `submenu-${item.id}`;
        const label = t(item.key);

        return (
          <li
            key={item.key}
            className={`site-nav__item site-nav__item--has-sub ${isOpen ? 'is-open' : ''}`}
            onMouseEnter={() => canHover() && setOpenKey(item.key)}
            onMouseLeave={() => canHover() && setOpenKey(null)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setOpenKey((current) => (current === item.key ? null : current));
              }
            }}
          >
            <button
              type="button"
              ref={(element) => {
                toggleRefs.current[item.key] = element;
              }}
              className={`site-nav__link site-nav__toggle ${isCurrentSection ? 'is-active' : ''}`}
              aria-expanded={isOpen}
              aria-controls={submenuId}
              onClick={() => setOpenKey(isOpen ? null : item.key)}
            >
              {label}
              <Icon name="chevronDown" size={16} className="site-nav__chevron" />
            </button>

            <ul id={submenuId} className="site-nav__submenu">
              <li>
                <NavLink
                  to={item.to}
                  end
                  className={linkClass('site-nav__sublink site-nav__sublink--all')}
                  onClick={handleLinkClick}
                >
                  {t('nav.viewAll', { name: label })}
                </NavLink>
              </li>
              {item.children.map((child) => (
                <li key={child.key}>
                  <NavLink to={child.to} className={linkClass('site-nav__sublink')} onClick={handleLinkClick}>
                    {t(child.key)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}

export default MainNav;
