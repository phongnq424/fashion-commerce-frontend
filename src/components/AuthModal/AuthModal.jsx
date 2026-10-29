import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../layout/Logo';
import Icon from '../common/Icon';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ForgotPasswordForm from './ForgotPasswordForm';
import OtpForm from './OtpForm';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import './AuthModal.css';

/**
 * POPUP TÀI KHOẢN: Đăng nhập (mặc định) | Đăng ký -> Nhập OTP | Quên mật khẩu.
 * Mở bằng openAuth('login') từ bất kỳ đâu (vd nút 👤 trên Header).
 * Chuyển qua lại giữa các màn bằng link trong form ("Đăng ký ngay", "Quên mật khẩu?"...).
 *
 * Dùng thẻ <dialog> gốc của HTML + showModal(), nhờ vậy trình duyệt tự lo:
 *   - giữ phím Tab chỉ chạy trong popup, phần trang phía sau không bấm được
 *   - nhấn Esc là đóng, đóng xong focus quay lại nút đã mở popup
 * - onNotify(type, message): báo "Xin chào, ..." sau khi đăng nhập (App.jsx truyền vào)
 */
function AuthModal({ onNotify }) {
  const { t } = useLanguage();
  const { authView, openAuth, closeAuth } = useAuth();
  const dialogRef = useRef(null);
  const pressedOnBackdrop = useRef(false);
  // Đăng ký đang chờ nhập OTP + dữ liệu form (để bấm "Đổi thông tin" quay lại không mất chữ đã gõ)
  const [pending, setPending] = useState(null);
  const [registerDraft, setRegisterDraft] = useState(null);
  const isOpen = authView !== null;
  // Không có đăng ký nào đang chờ mà lại vào màn 'verify' -> về màn đăng ký
  const view = authView === 'verify' && !pending ? 'register' : (authView ?? 'login');

  // Đóng popup -> xoá đăng ký đang chờ và dữ liệu nháp
  useEffect(() => {
    if (!isOpen) {
      setPending(null);
      setRegisterDraft(null);
    }
  }, [isOpen]);

  const handleOtpSent = (info, values) => {
    setPending(info);
    setRegisterDraft(values);
    openAuth('verify');
  };

  // Mở / đóng <dialog> theo state, đồng thời khoá cuộn trang phía sau
  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSuccess = (user, kind) => {
    closeAuth();
    const key = kind === 'register' ? 'auth.welcomeNew' : 'auth.welcome';
    onNotify?.('success', t(key, { name: user.name }));
  };

  // Bấm ra vùng tối bên ngoài -> đóng. Chỉ tính khi cả nhấn lẫn thả chuột đều ở ngoài
  // (tránh đóng nhầm khi đang bôi đen chữ trong ô nhập rồi kéo chuột ra ngoài)
  const handleMouseDown = (event) => {
    pressedOnBackdrop.current = event.target === event.currentTarget;
  };
  const handleClick = (event) => {
    if (pressedOnBackdrop.current && event.target === event.currentTarget) closeAuth();
  };

  return (
    <dialog
      ref={dialogRef}
      className="auth-modal"
      aria-labelledby="auth-title"
      aria-describedby="auth-subtitle"
      onClose={closeAuth}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div className="auth-modal__panel">
        {/* Hàng trên cùng: logo (căn giữa) + nút đóng (góc phải) */}
        <div className="auth-modal__top">
          {/* Logo dùng lại đúng component của Header -> font, màu giữ nguyên */}
          <div className="auth-modal__logo" onClick={closeAuth}>
            <Logo />
          </div>
          <button
            type="button"
            className="icon-btn auth-modal__close"
            onClick={closeAuth}
            aria-label={t('auth.close')}
          >
            <Icon name="close" />
          </button>
        </div>

        <header className="auth-modal__header">
          <h2 id="auth-title" className="auth-modal__title">
            {t(`auth.${view}Title`)}
          </h2>
          <p id="auth-subtitle" className="auth-modal__note">
            {t(`auth.${view}Subtitle`)}
          </p>
        </header>

        {/* Chỉ vẽ form khi popup mở -> mỗi lần mở lại, form trống và sạch lỗi */}
        {isOpen && view === 'login' && <LoginForm onSuccess={handleSuccess} onSwitch={openAuth} />}
        {isOpen && view === 'register' && (
          <RegisterForm
            onSuccess={handleSuccess}
            onOtpSent={handleOtpSent}
            onSwitch={openAuth}
            onNavigate={closeAuth}
            initialValues={registerDraft}
          />
        )}
        {isOpen && view === 'verify' && (
          <OtpForm pending={pending} onSuccess={handleSuccess} onBack={() => openAuth('register')} />
        )}
        {isOpen && view === 'forgot' && <ForgotPasswordForm onSwitch={openAuth} />}

        {/* Link chính sách ở cuối popup */}
        <p className="auth-modal__legal">
          <Link to="/policies/terms" onClick={closeAuth}>
            {t('auth.terms')}
          </Link>
          <span aria-hidden="true">|</span>
          <Link to="/policies/privacy" onClick={closeAuth}>
            {t('auth.privacy')}
          </Link>
        </p>
      </div>
    </dialog>
  );
}

export default AuthModal;
