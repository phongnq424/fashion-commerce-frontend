// Kiểm tra dữ liệu form tài khoản. Trả về KEY lỗi (vd 'auth.errors.emailInvalid'),
// giao diện dùng t(key) để hiện câu đúng ngôn ngữ. Không lỗi -> chuỗi rỗng ''.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Số di động Việt Nam: 0xxxxxxxxx hoặc +84xxxxxxxxx (cho phép khoảng trắng, dấu chấm)
const PHONE_PATTERN = /^(0|\+84)\d{9}$/;

export function validateEmail(value) {
  if (!value.trim()) return 'auth.errors.emailRequired';
  if (!EMAIL_PATTERN.test(value.trim())) return 'auth.errors.emailInvalid';
  return '';
}

// Ô đăng nhập: chấp nhận EMAIL hoặc SỐ ĐIỆN THOẠI
export function validateIdentifier(value) {
  const trimmed = value.trim();
  if (!trimmed) return 'auth.errors.identifierRequired';
  const isEmail = EMAIL_PATTERN.test(trimmed);
  const isPhone = PHONE_PATTERN.test(trimmed.replace(/[\s.]/g, ''));
  return isEmail || isPhone ? '' : 'auth.errors.identifierInvalid';
}

export function validatePhone(value) {
  const digits = value.replace(/[\s.]/g, '');
  if (!digits) return 'auth.errors.phoneRequired';
  if (!PHONE_PATTERN.test(digits)) return 'auth.errors.phoneInvalid';
  return '';
}

// Mật khẩu mới: ít nhất 8 ký tự, có cả chữ và số
export function validateNewPassword(value) {
  if (!value) return 'auth.errors.passwordRequired';
  if (value.length < 8 || !/[a-zA-Z]/.test(value) || !/\d/.test(value)) return 'auth.errors.passwordWeak';
  return '';
}

// Độ mạnh mật khẩu: 0 (chưa nhập) | 1 yếu | 2 trung bình | 3 mạnh
export function getPasswordStrength(value) {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^a-zA-Z0-9]/.test(value)) score += 1;
  if (value.length >= 12) score += 1;
  if (score <= 2) return 1;
  if (score <= 3) return 2;
  return 3;
}

// Lỗi từ authService (error.code) -> key câu báo lỗi
export function serverErrorKey(error) {
  const map = {
    INVALID_CREDENTIALS: 'auth.errors.invalidCredentials',
    EMAIL_TAKEN: 'auth.errors.emailTaken',
    GOOGLE_FAILED: 'auth.errors.googleFailed',
    OTP_INVALID: 'auth.errors.otpInvalid',
    OTP_EXPIRED: 'auth.errors.otpExpired',
    OTP_TOO_MANY_ATTEMPTS: 'auth.errors.otpTooMany',
    OTP_RESEND_TOO_SOON: 'auth.errors.otpResendTooSoon',
  };
  return map[error?.code] ?? 'auth.errors.network';
}
