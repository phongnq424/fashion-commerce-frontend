const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const apiError = (status, code) => Object.assign(new Error(code), { status, code });

// =====================================================================
// ĐĂNG NHẬP TRANG QUẢN TRỊ (/admin/login) — TÁCH RIÊNG khỏi đăng nhập của khách hàng.
// ---------------------------------------------------------------------
// Backend dùng chung POST /auth/login cho mọi tài khoản, rồi phân quyền bằng UserResponse.roles
// (GET /users/me). Khách hàng có role CUSTOMER; nhân viên quản trị có role PLATFORM_* hoặc vai trò
// trong cửa hàng (SHOP_*). Vì vậy trang quản trị:
//   1. gọi POST /auth/login với email + mật khẩu
//   2. gọi GET /users/me, chỉ cho vào nếu roles có ít nhất 1 vai trò quản trị (ADMIN_ROLES)
//   3. lưu phiên ở key RIÊNG (fc-admin-session) -> đăng nhập web khách KHÔNG vào được trang quản trị,
//      đăng xuất trang quản trị không làm khách bị đăng xuất và ngược lại.
//
// HIỆN TẠI: dùng tài khoản giả lập bên dưới (giống các dữ liệu giả lập khác). Khi nối backend,
// thay thân hàm loginAdmin bằng 2 lời gọi API ở trên, giữ nguyên màn hình.
// =====================================================================

const KEY = 'fc-admin-session';
const EVENT = 'fc-admin-session-change';

export const ADMIN_ROLES = ['PLATFORM_ADMIN', 'PLATFORM_MODERATOR', 'PLATFORM_SUPPORT'];

// TÀI KHOẢN QUẢN TRỊ GIẢ LẬP (chỉ dùng khi chưa nối backend)
const MOCK_ACCOUNTS = [
  { id: 'admin-0001', email: 'admin@trendylab.vn', password: 'Admin@123', displayName: 'Quản trị viên', roles: ['PLATFORM_ADMIN'] },
];

function read(storage) {
  try {
    return JSON.parse(storage.getItem(KEY) ?? 'null');
  } catch {
    return null;
  }
}

// Phiên đăng nhập quản trị hiện tại: { user: { id, email, displayName, roles }, loggedInAt } | null
export function readAdminSession() {
  if (typeof window === 'undefined') return null;
  return read(sessionStorage) ?? read(localStorage);
}

function notify() {
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeAdminSession(callback) {
  window.addEventListener(EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

/**
 * Đăng nhập quản trị. remember = true: nhớ trên trình duyệt; false: đóng tab là thoát.
 * Lỗi: AUTH_INVALID_CREDENTIALS (sai email / mật khẩu), ADMIN_ACCESS_DENIED (tài khoản khách hàng).
 */
export async function loginAdmin({ email, password, remember = true }) {
  await wait(400);
  const account = MOCK_ACCOUNTS.find((item) => item.email === String(email).trim().toLowerCase());
  if (!account || account.password !== password) throw apiError(401, 'AUTH_INVALID_CREDENTIALS');
  if (!account.roles.some((role) => ADMIN_ROLES.includes(role))) throw apiError(403, 'ADMIN_ACCESS_DENIED');
  const { password: _ignored, ...user } = account;
  void _ignored;
  const session = { user, loggedInAt: new Date().toISOString() };
  try {
    (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(session));
  } catch {
    /* bỏ qua */
  }
  notify();
  return session;
}

export function logoutAdmin() {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    /* bỏ qua */
  }
  notify();
}
