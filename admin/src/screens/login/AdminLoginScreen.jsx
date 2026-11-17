import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Button from '@shared/components/common/Button';
import Icon from '@shared/components/common/Icon';
import Input from '@shared/components/common/Input';
import Logo from '@shared/components/layout/Logo';
import { useAuth } from '@shared/hooks/useAuth';
import { useLanguage } from '@shared/hooks/useLanguage';
import { isPlatformStaff } from '../../services/platformService';
import '../AdminScreens.css';


/**
 * /login — Đăng nhập TRANG QUẢN TRỊ SÀN (app riêng, http://localhost:5174). CHỈ vai trò PLATFORM_*.
 * Gọi cùng POST /auth/login của Backend; sau khi đăng nhập kiểm tra roles trong GET /users/me.
 * - Tài khoản không có vai trò quản trị -> đăng xuất ngay và báo "không có quyền".
 * - Phiên lưu ở sessionStorage của cổng 5174: đóng tab là đăng xuất, không dùng chung với web mua sắm.
 */
function AdminLoginScreen() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, logout, isAuthLoading } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const target = location.state?.from && location.state.from !== '/login' ? location.state.from : '/';
  if (!isAuthLoading && isPlatformStaff(user)) return <Navigate to={target} replace />;

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.email.trim()) next.email = t('admin.login.errors.email');
    if (!form.password) next.password = t('admin.login.errors.password');
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      const loggedIn = await login({ identifier: form.email, password: form.password, remember: false });
      if (!isPlatformStaff(loggedIn)) {
        await logout();
        setFormError(t('admin.login.errors.denied'));
        return;
      }
      navigate(target, { replace: true });
    } catch (error) {
      const key = { NETWORK_ERROR: 'market.errors.NETWORK_ERROR', BACKEND_UNREACHABLE: 'market.errors.BACKEND_UNREACHABLE', AUTH_INVALID_CREDENTIALS: 'admin.login.errors.invalid', AUTH_ACCOUNT_SUSPENDED: 'market.errors.AUTH_ACCOUNT_SUSPENDED' }[error?.code];
      setFormError(t(key ?? (error?.status >= 500 ? 'auth.errors.server' : 'admin.login.errors.invalid')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login">
      <section className="admin-login__brand" aria-hidden="true">
        <div className="admin-login__brand-inner">
          <Logo />
          <h1>{t('market.admin.loginTitle')}</h1>
          <p>{t('market.admin.loginText')}</p>
          <ul>
            {['sellers', 'moderation', 'payouts'].map((key) => (
              <li key={key}>
                <Icon name="check" size={18} />
                {t(`market.admin.loginFeatures.${key}`)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <main className="admin-login__panel" id="main-content">
        <form className="admin-login__form" onSubmit={submit} noValidate>
          <div className="admin-login__mobile-logo">
            <Logo />
          </div>
          <span className="admin-top__tag">{t('market.admin.brandTag')}</span>
          <h2>{t('admin.login.title')}</h2>
          <p className="account-muted">{t('admin.login.subtitle')}</p>

          {formError && (
            <p className="admin-note admin-note--danger" role="alert">
              <Icon name="alert" size={18} />
              <span>{formError}</span>
            </p>
          )}

          <Input
            label={t('admin.login.email')}
            type="text"
            autoComplete="username"
            value={form.email}
            placeholder="ten@trendylab.vn"
            error={errors.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <div className="admin-login__password">
            <Input
              label={t('admin.login.password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={form.password}
              error={errors.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <button
              type="button"
              className="admin-login__eye"
              aria-label={showPassword ? t('admin.login.hidePassword') : t('admin.login.showPassword')}
              onClick={() => setShowPassword((v) => !v)}
            >
              <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
            </button>
          </div>
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? t('admin.login.loading') : t('admin.login.submit')}
          </Button>
          <p className="cell-sub admin-login__help">{t('admin.login.help')}</p>

        </form>
      </main>
    </div>
  );
}

export default AdminLoginScreen;
