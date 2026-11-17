import { useCallback, useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import Input from '../../../components/common/Input';
import StatusBadge from '../../../components/common/StatusBadge';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../hooks/useLanguage';
import { getSessions, revokeSession } from '../../../services/authService';
import { formatDateTime } from '../../../utils/status';
import AccountLayout from '../components/AccountLayout';
import './SecurityScreen.css';

// Mật khẩu mạnh giống Backend (@StrongPassword): 8–72 ký tự, có chữ thường, chữ hoa, số và ký tự đặc biệt
const STRONG = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;
const PHONE_RE = /^(0|\+?84)(3|5|7|8|9)\d{8}$/;

// Mã lỗi Backend -> key chữ
const errorKey = (error) =>
  ({
    ACCOUNT_CURRENT_PASSWORD_INVALID: 'market.security.errors.currentPassword',
    ACCOUNT_PASSWORD_UNCHANGED: 'market.security.errors.unchanged',
    ACCOUNT_DISPLAY_NAME_INVALID: 'market.security.errors.name',
    AUTH_EMAIL_EXISTS: 'auth.errors.emailTaken',
    AUTH_PHONE_EXISTS: 'auth.errors.phoneTaken',
    NETWORK_ERROR: 'market.errors.NETWORK_ERROR',
  })[error?.code] ?? 'account.actionError';

/** Sửa tên / email / số điện thoại — PATCH /users/me (đổi email hoặc SĐT phải nhập mật khẩu hiện tại) */
function ProfileForm({ user, onNotify }) {
  const { t } = useLanguage();
  const { updateProfile } = useAuth();
  const [form, setForm] = useState({ displayName: user.displayName ?? '', email: user.email ?? '', phone: user.phone ?? '', currentPassword: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const contactChanged = form.email.trim().toLowerCase() !== (user.email ?? '').toLowerCase() || form.phone.replace(/[\s.]/g, '') !== (user.phone ?? '');
  const update = (name) => (event) => setForm((prev) => ({ ...prev, [name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.displayName.trim()) next.displayName = t('market.security.errors.name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) next.email = t('auth.errors.emailInvalid', { defaultValue: 'Email không hợp lệ' });
    if (form.phone && !PHONE_RE.test(form.phone.replace(/[\s.]/g, ''))) next.phone = t('auth.errors.phoneInvalid', { defaultValue: 'Số điện thoại không hợp lệ' });
    if (contactChanged && !form.currentPassword) next.currentPassword = t('market.security.errors.needPassword');
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await updateProfile({
        displayName: form.displayName.trim(),
        ...(contactChanged ? { email: form.email.trim(), phone: form.phone, currentPassword: form.currentPassword } : {}),
      });
      setForm((prev) => ({ ...prev, currentPassword: '' }));
      onNotify?.('success', t('market.security.profileSaved'));
    } catch (error) {
      if (error?.code === 'ACCOUNT_CURRENT_PASSWORD_INVALID') setErrors({ currentPassword: t(errorKey(error)) });
      else onNotify?.('error', t(errorKey(error)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="account-card security-form" onSubmit={submit} noValidate>
      <h2 className="account-card__title">
        <Icon name="user" size={18} />
        {t('market.security.profileTitle')}
      </h2>
      <Input label={t('account.profile.displayName')} required value={form.displayName} onChange={update('displayName')} error={errors.displayName} maxLength={120} />
      <div className="address-form__row">
        <Input label={t('account.profile.email')} type="email" required value={form.email} onChange={update('email')} error={errors.email} maxLength={320} />
        <Input label={t('account.profile.phone')} type="tel" value={form.phone} onChange={update('phone')} error={errors.phone} maxLength={24} />
      </div>
      {contactChanged && (
        <Input
          label={t('market.security.currentPassword')}
          type="password"
          required
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={update('currentPassword')}
          error={errors.currentPassword}
          hint={t('market.security.contactHint')}
        />
      )}
      <div className="security-form__actions">
        <Button type="submit" disabled={saving}>
          {saving ? t('common.loading') : t('market.security.save')}
        </Button>
      </div>
    </form>
  );
}

/** Đổi mật khẩu — POST /users/me/password. Thành công: Backend thu hồi mọi phiên -> phải đăng nhập lại */
function PasswordForm({ onNotify }) {
  const { t } = useLanguage();
  const { changePassword, openAuth } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const update = (name) => (event) => setForm((prev) => ({ ...prev, [name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.currentPassword) next.currentPassword = t('market.security.errors.needPassword');
    if (!STRONG.test(form.newPassword)) next.newPassword = t('market.security.errors.weak');
    else if (form.newPassword === form.currentPassword) next.newPassword = t('market.security.errors.unchanged');
    if (form.confirm !== form.newPassword) next.confirm = t('market.security.errors.confirm');
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      onNotify?.('success', t('market.security.passwordChanged'));
      openAuth('login');
    } catch (error) {
      if (error?.code === 'ACCOUNT_CURRENT_PASSWORD_INVALID') setErrors({ currentPassword: t(errorKey(error)) });
      else if (error?.code === 'ACCOUNT_PASSWORD_UNCHANGED') setErrors({ newPassword: t(errorKey(error)) });
      else onNotify?.('error', t(errorKey(error)));
      setSaving(false);
    }
  };

  return (
    <form className="account-card security-form" onSubmit={submit} noValidate>
      <h2 className="account-card__title">
        <Icon name="shield" size={18} />
        {t('market.security.passwordTitle')}
      </h2>
      <Input label={t('market.security.currentPassword')} type="password" required autoComplete="current-password" value={form.currentPassword} onChange={update('currentPassword')} error={errors.currentPassword} />
      <div className="address-form__row">
        <Input label={t('market.security.newPassword')} type="password" required autoComplete="new-password" value={form.newPassword} onChange={update('newPassword')} error={errors.newPassword} hint={t('market.security.passwordHint')} />
        <Input label={t('market.security.confirmPassword')} type="password" required autoComplete="new-password" value={form.confirm} onChange={update('confirm')} error={errors.confirm} />
      </div>
      <p className="account-muted">
        <Icon name="info" size={14} /> {t('market.security.passwordNote')}
      </p>
      <div className="security-form__actions">
        <Button type="submit" disabled={saving}>
          {saving ? t('common.loading') : t('market.security.changePassword')}
        </Button>
      </div>
    </form>
  );
}

/** Phiên đăng nhập — GET /users/me/sessions, DELETE /users/me/sessions/{id} */
function SessionList({ onNotify }) {
  const { t, language } = useLanguage();
  const [sessions, setSessions] = useState([]);
  const [status, setStatus] = useState('loading');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const page = await getSessions();
      setSessions(page.items ?? []);
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const revoke = async (id) => {
    setBusyId(id);
    try {
      await revokeSession(id);
      onNotify?.('success', t('market.security.sessionRevoked'));
      await load();
    } catch (error) {
      onNotify?.('error', t(errorKey(error)));
    } finally {
      setBusyId(null);
    }
  };

  const active = sessions.filter((s) => s.active);
  const ended = sessions.filter((s) => !s.active).slice(0, 5);

  return (
    <section className="account-card">
      <div className="account-card__head">
        <h2 className="account-card__title">
          <Icon name="lock" size={18} />
          {t('market.security.sessionsTitle')}
        </h2>
      </div>
      {status === 'loading' && <p className="account-muted">{t('common.loading')}</p>}
      {status === 'error' && <p className="account-muted">{t('account.loadError')}</p>}
      {status === 'success' && (
        <ul className="session-list">
          {[...active, ...ended].map((s) => (
            <li key={s.id} className={`session-list__item ${s.active ? '' : 'is-ended'}`}>
              <Icon name="monitor" size={20} />
              <div className="session-list__meta">
                <p className="session-list__name">
                  {s.deviceLabel || t('market.security.unknownDevice')}
                  {s.active ? <StatusBadge tone="success">{t('market.security.active')}</StatusBadge> : <StatusBadge tone="muted">{t('market.security.ended')}</StatusBadge>}
                </p>
                <p className="account-muted">
                  {t('market.security.lastUsed', { time: formatDateTime(s.lastUsedAt ?? s.createdAt, language) })}
                </p>
              </div>
              {s.active && (
                <Button variant="outline" size="sm" onClick={() => revoke(s.id)} disabled={busyId === s.id}>
                  {t('market.security.revoke')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="account-muted">
        <Icon name="info" size={14} /> {t('market.security.sessionsNote')}
      </p>
    </section>
  );
}

/**
 * /account/security — Hồ sơ & bảo mật: sửa thông tin, đổi mật khẩu, phiên đăng nhập.
 * Dùng các API tài khoản Backend đã có (CurrentUserController).
 */
function SecurityScreen({ onNotify }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  return (
    <AccountLayout title={t('market.security.title')} subtitle={t('market.security.subtitle')}>
      {user && (
        <div className="security-page">
          <ProfileForm key={user.id + (user.email ?? '') + (user.phone ?? '')} user={user} onNotify={onNotify} />
          <PasswordForm onNotify={onNotify} />
          <SessionList onNotify={onNotify} />
        </div>
      )}
    </AccountLayout>
  );
}

export default SecurityScreen;
