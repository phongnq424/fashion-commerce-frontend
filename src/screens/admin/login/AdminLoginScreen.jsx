import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import Input from '../../../components/common/Input';
import Logo from '../../../components/layout/Logo';
import { useAdminSession } from '../../../hooks/useAdminSession';
import { useLanguage } from '../../../hooks/useLanguage';
import { loginAdmin } from '../../../services/admin/adminAuth';
import '../AdminScreens.css';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * /admin/login — Đăng nhập trang quản trị (CHỈ nhân viên TrendyLab).
 * Trang độc lập: không Header / Footer của web khách, không dùng popup đăng nhập của khách.
 * Bố cục 2 cột phổ biến của trang admin: trái giới thiệu thương hiệu | phải form đăng nhập.
 */
function AdminLoginScreen() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const session = useAdminSession();
  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const target = location.state?.from && location.state.from !== '/admin/login' ? location.state.from : '/admin';
  if (session) return <Navigate to={target} replace />;

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!EMAIL.test(form.email.trim())) next.email = t('admin.login.errors.email');
    if (!form.password) next.password = t('admin.login.errors.password');
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      await loginAdmin(form);
      navigate(target, { replace: true });
    } catch (error) {
      setFormError(t(error?.code === 'ADMIN_ACCESS_DENIED' ? 'admin.login.errors.denied' : 'admin.login.errors.invalid'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login">
      <section className="admin-login__brand" aria-hidden="true">
        <div className="admin-login__brand-inner">
          <Logo />
          <h1>{t('admin.login.brandTitle')}</h1>
          <p>{t('admin.login.brandText')}</p>
          <ul>
            {['orders', 'products', 'reports'].map((key) => (
              <li key={key}>
                <Icon name="check" size={18} />
                {t(`admin.login.features.${key}`)}
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
          <span className="admin-top__tag">{t('admin.brandTag')}</span>
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
            type="email"
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
          <label className="admin-login__remember">
            <input type="checkbox" checked={form.remember} onChange={(e) => setForm({ ...form, remember: e.target.checked })} />
            {t('admin.login.remember')}
          </label>
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? t('admin.login.loading') : t('admin.login.submit')}
          </Button>
          <p className="cell-sub admin-login__help">{t('admin.login.help')}</p>

          {/* CHỈ CÓ Ở BẢN GIẢ LẬP — xoá khối này khi nối backend */}
          <div className="admin-note admin-login__demo">
            <Icon name="info" size={18} />
            <span>
              {t('admin.login.demo')} <strong>admin@trendylab.vn</strong> / <strong>Admin@123</strong>
            </span>
          </div>
        </form>
      </main>
    </div>
  );
}

export default AdminLoginScreen;
