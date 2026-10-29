import { STORAGE_KEYS } from '../constants/storageKeys';

// =====================================================================
// DỊCH VỤ TÀI KHOẢN (đăng nhập, đăng ký, quên mật khẩu, Google)
// ---------------------------------------------------------------------
// HIỆN TẠI: dữ liệu GIẢ để làm giao diện trước khi có Backend.
//   - Tài khoản dùng thử: demo@trendylab.vn (hoặc 0901234567) / Trendy123
//   - Tài khoản đăng ký mới được lưu tạm trong localStorage của trình duyệt.
//   - Email taken@trendylab.vn luôn báo "đã có tài khoản" để thử thông báo lỗi.
//   - Đăng ký có xác thực OTP qua SMS. Mã OTP thử: 123456 (mã khác = sai mã).
// KHI CÓ BACKEND: chỉ thay THÂN các hàm bên dưới bằng fetch(...) (có ví dụ ở từng hàm).
// Mật khẩu thật phải do Backend mã hoá (bcrypt...), TUYỆT ĐỐI không lưu ở trình duyệt.
//
// Lỗi được ném ra dạng Error có thuộc tính code -> giao diện đổi code thành câu đã dịch:
//   INVALID_CREDENTIALS | EMAIL_TAKEN | GOOGLE_FAILED | NETWORK
//   OTP_INVALID (kèm attemptsLeft) | OTP_EXPIRED | OTP_TOO_MANY_ATTEMPTS | OTP_RESEND_TOO_SOON
// =====================================================================

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function authError(code, extra = {}) {
  const error = new Error(code);
  error.code = code;
  Object.assign(error, extra); // vd { attemptsLeft: 3 }
  return error;
}

const DEMO_USER = { name: 'Demo TrendyLab', email: 'demo@trendylab.vn', phone: '0901234567', password: 'Trendy123' };

function readMockUsers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.mockUsers)) ?? [];
  } catch {
    return [];
  }
}

function saveMockUsers(users) {
  try {
    localStorage.setItem(STORAGE_KEYS.mockUsers, JSON.stringify(users));
  } catch {
    /* bỏ qua nếu trình duyệt chặn localStorage */
  }
}

// Chỉ trả về thông tin công khai, không bao giờ trả mật khẩu ra giao diện
const toPublicUser = ({ name, email, phone, provider = 'email' }) => ({ name, email, phone, provider });

// Backend: const res = await fetch(`${API}/auth/login`, {
//            method: 'POST', headers: { 'Content-Type': 'application/json' },
//            credentials: 'include', body: JSON.stringify({ identifier, password }) });
//          if (res.status === 401) throw authError('INVALID_CREDENTIALS');
//          if (!res.ok) throw authError('NETWORK');
//          return res.json();
// identifier: email HOẶC số điện thoại (người dùng gõ cái nào cũng được)
export async function login({ identifier, password }) {
  await wait(700);
  const value = identifier.toLowerCase();
  const phone = identifier.replace(/[\s.]/g, '');
  const users = [DEMO_USER, ...readMockUsers()];
  const found = users.find((user) => user.email.toLowerCase() === value || user.phone === phone);
  if (!found || found.password !== password) throw authError('INVALID_CREDENTIALS');
  return toPublicUser(found);
}

// ---------------------------------------------------------------------
// ĐĂNG KÝ 2 BƯỚC CÓ OTP
//   B1. register(): Backend kiểm tra email, LƯU TẠM thông tin, tạo mã OTP, gửi SMS.
//       CHƯA tạo tài khoản. Trả về thông tin để hiện màn nhập mã.
//   B2. verifyOtp(): Backend so khớp mã. Đúng -> tạo tài khoản thật + đăng nhập.
// Mã OTP do BACKEND tạo và kiểm tra. Frontend không bao giờ biết mã đúng là gì.
// ---------------------------------------------------------------------
const OTP_TTL_SECONDS = 300; // mã sống 5 phút
const RESEND_AFTER_SECONDS = 60; // 60 giây mới được gửi lại
const MAX_ATTEMPTS = 5; // nhập sai 5 lần thì khoá
const MOCK_OTP = '123456'; // CHỈ dùng cho dữ liệu giả

// Bản đăng ký đang chờ xác thực (giả lập phần Backend lưu tạm)
const pendingRegistrations = new Map();

// 0901234567 -> 090****567 (che bớt số điện thoại khi hiển thị)
const maskPhone = (phone) => phone.replace(/^(\+?\d{3})\d+(\d{3})$/, '$1****$2');

// Backend: POST `${API}/auth/register` với { name, email, phone, password, newsletter }
//          409 -> throw authError('EMAIL_TAKEN')
//          200 -> { pendingId, otpSentTo, expiresIn, resendAfter }
export async function register({ name, email, phone, password }) {
  await wait(900);
  const users = readMockUsers();
  const emailLower = email.toLowerCase();
  const exists =
    emailLower === 'taken@trendylab.vn' ||
    emailLower === DEMO_USER.email ||
    users.some((user) => user.email.toLowerCase() === emailLower);
  if (exists) throw authError('EMAIL_TAKEN');

  const pendingId = `reg-${Date.now()}`;
  const now = Date.now();
  pendingRegistrations.set(pendingId, {
    data: { name, email, phone, password },
    expiresAt: now + OTP_TTL_SECONDS * 1000,
    resendAt: now + RESEND_AFTER_SECONDS * 1000,
    attemptsLeft: MAX_ATTEMPTS,
  });
  return {
    pendingId,
    otpSentTo: maskPhone(phone),
    expiresIn: OTP_TTL_SECONDS,
    resendAfter: RESEND_AFTER_SECONDS,
  };
}

// Backend: POST `${API}/auth/verify-otp` với { pendingId, code }
//          400 -> { code: 'OTP_INVALID', attemptsLeft } | 410 -> OTP_EXPIRED | 429 -> OTP_TOO_MANY_ATTEMPTS
//          200 -> user (đã tạo tài khoản + đăng nhập)
export async function verifyOtp({ pendingId, code }) {
  await wait(700);
  const pending = pendingRegistrations.get(pendingId);
  if (!pending) throw authError('OTP_EXPIRED');
  if (pending.attemptsLeft <= 0) throw authError('OTP_TOO_MANY_ATTEMPTS');
  if (Date.now() > pending.expiresAt) throw authError('OTP_EXPIRED');

  if (code !== MOCK_OTP) {
    pending.attemptsLeft -= 1;
    if (pending.attemptsLeft <= 0) throw authError('OTP_TOO_MANY_ATTEMPTS');
    throw authError('OTP_INVALID', { attemptsLeft: pending.attemptsLeft });
  }

  pendingRegistrations.delete(pendingId);
  const newUser = pending.data;
  saveMockUsers([...readMockUsers(), newUser]);
  return toPublicUser(newUser);
}

// Backend: POST `${API}/auth/resend-otp` với { pendingId }
//          429 -> OTP_RESEND_TOO_SOON | 200 -> { expiresIn, resendAfter }
export async function resendOtp({ pendingId }) {
  await wait(600);
  const pending = pendingRegistrations.get(pendingId);
  if (!pending) throw authError('OTP_EXPIRED');
  const now = Date.now();
  if (now < pending.resendAt) throw authError('OTP_RESEND_TOO_SOON');
  pending.expiresAt = now + OTP_TTL_SECONDS * 1000;
  pending.resendAt = now + RESEND_AFTER_SECONDS * 1000;
  pending.attemptsLeft = MAX_ATTEMPTS; // mã mới -> được thử lại từ đầu
  return { expiresIn: OTP_TTL_SECONDS, resendAfter: RESEND_AFTER_SECONDS };
}

// Backend: POST `${API}/auth/forgot-password` với { email }
// Luôn trả về thành công dù email có tồn tại hay không -> kẻ xấu không dò được email nào đã đăng ký.
export async function requestPasswordReset({ email }) {
  await wait(800);
  return { email };
}

// ĐĂNG NHẬP GOOGLE (hiện là giả lập).
// Làm thật:
//   1. Tạo OAuth Client ID tại https://console.cloud.google.com (APIs & Services > Credentials)
//   2. npm install @react-oauth/google
//   3. main.jsx: bọc App trong <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
//   4. GoogleButton.jsx: const googleLogin = useGoogleLogin({ onSuccess: (res) => ... })
//      rồi gửi res.access_token (hoặc credential) lên Backend: POST `${API}/auth/google`
//   5. Backend kiểm tra token với Google, tạo / tìm tài khoản, trả về user.
export async function signInWithGoogle() {
  await wait(900);
  return { name: 'Google User', email: 'google.user@gmail.com', provider: 'google' };
}

// Backend: POST `${API}/auth/logout` (xoá cookie phiên đăng nhập)
export async function logout() {
  await wait(200);
}
