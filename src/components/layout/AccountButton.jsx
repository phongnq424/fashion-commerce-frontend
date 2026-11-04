import { useEffect, useRef, useState } from 'react';
import Icon from '../common/Icon';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import './AccountButton.css';

/**
 * Nút 👤 trên Header.
 * - CHƯA đăng nhập: bấm -> mở popup đăng nhập
 * - ĐÃ đăng nhập:  hiện chữ cái đầu của tên; bấm -> menu nhỏ (tên, email, Đăng xuất)
 * - onNotify(type, message): báo "Bạn đã đăng xuất"
 */
function AccountButton({ onNotify }) {
  const { t } = useLanguage();
  const { user, openAuth, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Bấm ra ngoài hoặc nhấn Esc -> đóng menu
  useEffect(() => {
    if (!menuOpen) return undefined;
    const handlePointer = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  if (!user) {
    return (
      <button
        type="button"
        className="icon-btn site-header__account"
        aria-label={t('auth.openLogin')}
        aria-haspopup="dialog"
        onClick={() => openAuth('login')}
      >
        <Icon name="user" />
      </button>
    );
  }

  const initial = user.name?.trim().charAt(0).toUpperCase() || '?';

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    onNotify?.('info', t('auth.loggedOut'));
  };

  return (
    <div className="account" ref={wrapperRef}>
      <button
        type="button"
        className="icon-btn site-header__account account__trigger"
        aria-label={t('auth.accountMenu', { name: user.name })}
        aria-expanded={menuOpen}
        aria-controls="account-menu"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className="account__avatar" aria-hidden="true">
          {initial}
        </span>
      </button>

      {menuOpen && (
        <div id="account-menu" className="account__menu">
          <div className="account__info">
            <p className="account__name">{user.name}</p>
            <p className="account__email">{user.email}</p>
          </div>
          <ul className="account__links">
            <li>
              <a href="#account" className="account__item" onClick={() => setMenuOpen(false)}>
                <Icon name="user" size={18} />
                {t('auth.myAccount')}
              </a>
            </li>
            <li>
              <a href="#orders" className="account__item" onClick={() => setMenuOpen(false)}>
                <Icon name="package" size={18} />
                {t('auth.myOrders')}
              </a>
            </li>
            <li>
              <button type="button" className="account__item account__item--danger" onClick={handleLogout}>
                <Icon name="logout" size={18} />
                {t('auth.logout')}
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default AccountButton;
