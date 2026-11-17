import { useEffect, useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { clearAuthSession } from '../../services/authSession';

/**
 * Thanh "DEMO" nhỏ ở góc dưới bên trái. CHỈ hiện khi FE đang nói chuyện với BE giả (npm run mock):
 * BE giả có route riêng GET /__mock/accounts, BE thật không có -> gọi lỗi -> thanh tự ẩn.
 * Dùng chung cho web khách và trang quản trị (prop `app` = 'web' | 'admin').
 */
function DemoBar({ app = 'web' }) {
  const [info, setInfo] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    apiClient
      .get('/__mock/accounts', { auth: false })
      .then((data) => active && Array.isArray(data?.accounts) && setInfo(data))
      .catch(() => {
        /* Đang chạy BE thật -> không hiện thanh demo */
      });
    return () => {
      active = false;
    };
  }, []);

  // Thanh DEMO chiếm góc trái dưới -> đẩy nút ↑ "Lên đầu trang" lên trên (FloatingActions.css dùng biến này)
  useEffect(() => {
    if (!info) return undefined;
    document.documentElement.style.setProperty('--demo-bar-space', '48px');
    return () => document.documentElement.style.removeProperty('--demo-bar-space');
  }, [info]);

  if (!info) return null;

  const reset = async () => {
    if (!window.confirm('Xoá mọi thay đổi và đưa dữ liệu demo (của cả web khách lẫn trang quản trị) về ban đầu?')) return;
    await apiClient.post('/__mock/reset', undefined, { auth: false }).catch(() => {});
    try {
      localStorage.removeItem('fc-cart');
      localStorage.removeItem('fc-seller-shop');
    } catch {
      /* bỏ qua */
    }
    clearAuthSession();
    window.location.assign('/');
  };

  const mine = info.accounts.filter((a) => a.app === app);
  const others = info.accounts.filter((a) => a.app !== app);
  const box = { position: 'fixed', left: 12, bottom: 12, zIndex: 9999, font: '13px/1.45 system-ui, sans-serif', color: '#1f2937' };
  const list = (items) => (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
      {items.map((a) => (
        <li key={a.email} style={{ padding: '3px 0' }}>
          <code style={{ fontSize: 12 }}>{a.email}</code>
          <br />
          <span style={{ color: '#6b7280' }}>{a.description}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div style={box}>
      {open && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.15)', padding: 14, marginBottom: 8, width: 340, maxHeight: '70vh', overflow: 'auto' }}>
          <strong>Đang chạy với BE giả</strong>
          <p style={{ margin: '4px 0 8px', color: '#6b7280' }}>
            Mật khẩu: <code>{info.password}</code> · OTP: <code>{info.otp}</code>
          </p>
          <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{app === 'admin' ? 'Đăng nhập trang quản trị' : 'Đăng nhập web mua sắm'}</p>
          {list(mine)}
          {others.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer' }}>
                {app === 'admin' ? 'Tài khoản web mua sắm (localhost:5173)' : 'Tài khoản quản trị (localhost:5174)'}
              </summary>
              {list(others)}
            </details>
          )}
          <button type="button" onClick={reset} style={{ marginTop: 10, padding: '6px 10px', border: '1px solid #ef4444', color: '#b91c1c', background: '#fff', borderRadius: 6, cursor: 'pointer' }}>
            Đặt lại dữ liệu demo
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ padding: '6px 12px', borderRadius: 999, border: 'none', background: '#f59e0b', color: '#111827', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.2)' }}
      >
        DEMO {open ? '▾' : '▴'}
      </button>
    </div>
  );
}

export default DemoBar;
