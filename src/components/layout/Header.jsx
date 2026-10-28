import { useEffect, useState } from 'react';
import Logo from './Logo';
import MainNav from './MainNav';
import Icon from '../common/Icon';
import SearchBar from '../SearchBar/SearchBar';
import ThemeSwitcher from '../ThemeSwitcher/ThemeSwitcher';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher';
import { useLanguage } from '../../hooks/useLanguage';
import './Header.css';

/**
 * Header dùng chung cho mọi trang. Bố cục 1 hàng:
 *   LOGO   MENU ...   [ ô tìm kiếm ]   VI/EN ☾ 👤 🛍
 * - cartCount: số sản phẩm trong giỏ (hiện ở huy hiệu)
 * - onSearch: hàm xử lý khi người dùng tìm kiếm
 */
function Header({ cartCount = 0, onSearch }) {
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  // Nhấn Esc để đóng menu trên mobile
  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [menuOpen]);

  return (
    <header className="site-header">
      <p className="site-header__announcement">{t('header.announcement')}</p>

      <div className="site-header__bar container">
        {/* Nút menu chỉ hiện trên tablet/mobile */}
        <button
          type="button"
          className="icon-btn site-header__menu-btn"
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          aria-label={menuOpen ? t('header.closeMenu') : t('header.openMenu')}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} />
        </button>

        <Logo />

        <nav
          id="main-nav"
          className={`site-nav ${menuOpen ? 'site-nav--open' : ''}`}
          aria-label={t('header.mainNav')}
        >
          <MainNav onNavigate={() => setMenuOpen(false)} />
          {/* Trên mobile, đổi ngôn ngữ nằm trong menu cho gọn */}
          <div className="site-nav__lang">
            <LanguageSwitcher />
          </div>
        </nav>

        <SearchBar onSearch={onSearch} className="site-header__search" />

        <div className="site-header__actions">
          <div className="site-header__lang">
            <LanguageSwitcher />
          </div>
          <ThemeSwitcher />
          <a href="#account" className="icon-btn site-header__account" aria-label={t('header.account')}>
            <Icon name="user" />
          </a>
          <a href="#cart" className="icon-btn" aria-label={t('header.cart', { count: cartCount })}>
            <Icon name="bag" />
            {cartCount > 0 && (
              <span className="site-header__badge" aria-hidden="true">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </a>
        </div>
      </div>
    </header>
  );
}

export default Header;
